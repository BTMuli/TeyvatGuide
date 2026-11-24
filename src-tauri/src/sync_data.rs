//! 有界、只增量写入的四表同步快照。未支持的数据必须整体报错，绝不改写原值。
//! @since Beta v0.14.1

use futures_util::TryStreamExt;
use serde::Serialize;
use serde::de::{self, Deserialize, Deserializer, MapAccess, SeqAccess, Visitor};
use serde_json::{Map, Number, Value};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};
use std::collections::HashSet;
use std::fmt;
use tauri_plugin_sql::{DbInstances, DbPool};

const DATABASE_URL: &str = "sqlite:TeyvatGuide.db";
const MAX_SNAPSHOT_BYTES: usize = 16 * 1024 * 1024;
const MAX_FIELD_BYTES: usize = 1024 * 1024;
const MAX_ROWS: usize = 100_000;
const MAX_ARRAY: usize = 256;
const MAX_SAFE_INTEGER: i64 = 9_007_199_254_740_991;
const INVALID: &str = "SYNC_INVALID：同步数据无效或包含不受支持的字段；未更改数据库";
const SCHEMA: &str = "SYNC_SCHEMA：数据库表结构不受支持；未更改数据库";
const DATABASE: &str = "SYNC_DATABASE：数据库操作失败；未应用同步数据";
const LIMIT: &str = "SYNC_LIMIT：同步数据超过大小或数量限制；未更改数据库";
const EMPTY: &str = "SYNC_EMPTY：没有可同步的记录；未生成快照";
const STATE: &str = "SYNC_STATE：应用数据库尚未加载或不是 SQLite";
const LEGACY_CHALLENGE: &str =
  "SYNC_LEGACY_CHALLENGE：旧幽境危战记录缺少可读取的详情；未应用同步数据";
const UNSUPPORTED_LINEUP: &str =
  "SYNC_UNSUPPORTED_LINEUP：剧诗记录包含不受支持的阵容链接；未应用同步数据";

/// 受支持的 SQLite 存储类型。
/// @since Beta v0.14.1
#[derive(Clone, Copy, PartialEq, Eq)]
enum Kind {
  Text,
  Json,
  Integer,
  Boolean,
}

/// 固定列、SQLite 类型、允许的业务空值及预期主键位置。
/// @since Beta v0.14.1
struct Column {
  name: &'static str,
  kind: Kind,
  nullable: bool,
  pk: i64,
}

macro_rules! col {
  ($name:literal, $kind:ident) => {
    col!($name, $kind, 0)
  };
  ($name:literal, $kind:ident, null) => {
    Column { name: $name, kind: Kind::$kind, nullable: true, pk: 0 }
  };
  ($name:literal, $kind:ident, $pk:literal) => {
    Column { name: $name, kind: Kind::$kind, nullable: false, pk: $pk }
  };
}

const GACHA: &[Column] = &[
  col!("id", Text, 1),
  col!("uid", Text),
  col!("gachaType", Text),
  col!("uigfType", Text),
  col!("time", Text),
  col!("itemId", Text, null),
  col!("name", Text),
  col!("type", Text, null),
  col!("rank", Text, null),
  col!("count", Text),
  col!("updated", Text),
];
const ABYSS: &[Column] = &[
  col!("uid", Text, 1),
  col!("id", Integer, 2),
  col!("startTime", Text),
  col!("endTime", Text),
  col!("totalBattleTimes", Integer),
  col!("totalWinTimes", Integer),
  col!("maxFloor", Text),
  col!("totalStar", Integer),
  col!("isUnlock", Boolean),
  col!("revealRank", Json),
  col!("defeatRank", Json),
  col!("damageRank", Json),
  col!("takeDamageRank", Json),
  col!("normalSkillRank", Json),
  col!("energySkillRank", Json),
  col!("floors", Json),
  col!("skippedFloor", Text, null),
  col!("updated", Text),
];
const COMBAT: &[Column] = &[
  col!("uid", Text, 1),
  col!("id", Integer, 2),
  col!("startTime", Text),
  col!("endTime", Text),
  col!("hasData", Boolean),
  col!("hasDetailData", Boolean),
  col!("stat", Json),
  col!("detail", Json),
  col!("updated", Text),
];
const CHALLENGE: &[Column] = &[
  col!("uid", Text, 1),
  col!("id", Integer, 2),
  col!("startTime", Text),
  col!("endTime", Text),
  col!("name", Text),
  col!("single", Json),
  col!("mp", Json),
  col!("blings", Json),
  col!("updated", Text),
];

/// 白名单表及其完整列。
/// @since Beta v0.14.1
struct Table {
  name: &'static str,
  columns: &'static [Column],
}

const TABLES: &[Table] = &[
  Table { name: "GachaRecords", columns: GACHA },
  Table { name: "SpiralAbyss", columns: ABYSS },
  Table { name: "RoleCombat", columns: COMBAT },
  Table { name: "HardChallenge", columns: CHALLENGE },
];

/// 不含记录值和 UID 的单表导入统计。
/// @since Beta v0.14.1
#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncTableStats {
  pub inserted: u64,
  pub identical: u64,
  pub conflicts: u64,
}

/// 按表汇总的导入结果；冲突保留本机原值。
/// @since Beta v0.14.1
#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncImportStats {
  pub gacha_records: SyncTableStats,
  pub spiral_abyss: SyncTableStats,
  pub role_combat: SyncTableStats,
  pub hard_challenge: SyncTableStats,
}

/// 严格 JSON 值，递归拒绝重复对象键，避免解析歧义。
/// @since Beta v0.14.1
struct StrictValue(Value);

impl<'de> Deserialize<'de> for StrictValue {
  /// 使用 JSON 访问器，避免重复键被静默覆盖。
  /// @since Beta v0.14.1
  fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
    struct StrictVisitor;
    impl<'de> Visitor<'de> for StrictVisitor {
      type Value = StrictValue;
      /// 描述解析器期望的值。
      /// @since Beta v0.14.1
      fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("a JSON value without duplicate keys")
      }
      /// 接收空值。
      /// @since Beta v0.14.1
      fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> {
        Ok(StrictValue(Value::Null))
      }
      /// 接收布尔值。
      /// @since Beta v0.14.1
      fn visit_bool<E: de::Error>(self, v: bool) -> Result<Self::Value, E> {
        Ok(StrictValue(Value::Bool(v)))
      }
      /// 接收有符号整数。
      /// @since Beta v0.14.1
      fn visit_i64<E: de::Error>(self, v: i64) -> Result<Self::Value, E> {
        Ok(StrictValue(Value::Number(v.into())))
      }
      /// 接收无符号整数。
      /// @since Beta v0.14.1
      fn visit_u64<E: de::Error>(self, v: u64) -> Result<Self::Value, E> {
        Ok(StrictValue(Value::Number(v.into())))
      }
      /// 接收有限浮点数；字段校验另行限制数值范围。
      /// @since Beta v0.14.1
      fn visit_f64<E: de::Error>(self, v: f64) -> Result<Self::Value, E> {
        Number::from_f64(v)
          .map(Value::Number)
          .map(StrictValue)
          .ok_or_else(|| E::custom("invalid number"))
      }
      /// 接收字符串。
      /// @since Beta v0.14.1
      fn visit_str<E: de::Error>(self, v: &str) -> Result<Self::Value, E> {
        Ok(StrictValue(Value::String(v.to_owned())))
      }
      /// 接收自有字符串。
      /// @since Beta v0.14.1
      fn visit_string<E: de::Error>(self, v: String) -> Result<Self::Value, E> {
        Ok(StrictValue(Value::String(v)))
      }
      /// 递归接收数组。
      /// @since Beta v0.14.1
      fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        let mut values = Vec::new();
        while let Some(value) = seq.next_element::<StrictValue>()? {
          if values.len() >= MAX_ROWS {
            return Err(de::Error::custom("array limit"));
          }
          values.push(value.0);
        }
        Ok(StrictValue(Value::Array(values)))
      }
      /// 递归接收对象，重复键立即失败。
      /// @since Beta v0.14.1
      fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        let mut values = Map::new();
        while let Some((key, value)) = map.next_entry::<String, StrictValue>()? {
          if values.len() >= 1024 {
            return Err(de::Error::custom("object limit"));
          }
          if values.insert(key, value.0).is_some() {
            return Err(de::Error::custom("duplicate key"));
          }
        }
        Ok(StrictValue(Value::Object(values)))
      }
    }
    deserializer.deserialize_any(StrictVisitor)
  }
}

/// 解析限制大小的 JSON，并拒绝重复键。
/// @since Beta v0.14.1
fn parse_json(input: &str, limit: usize) -> Result<Value, String> {
  if input.len() > limit {
    return Err(LIMIT.into());
  }
  serde_json::from_str::<StrictValue>(input).map(|v| v.0).map_err(|_| INVALID.into())
}

/// 从 SQL 插件获取唯一的应用数据库池。
/// @since Beta v0.14.1
async fn sqlite_pool(instances: &DbInstances) -> Result<SqlitePool, String> {
  let instances = instances.0.read().await;
  match instances.get(DATABASE_URL) {
    Some(DbPool::Sqlite(pool)) => Ok(pool.clone()),
    #[allow(unreachable_patterns)]
    _ => Err(STATE.into()),
  }
}

/// 仅供受 ACL 保护的手动上传流程读取四表快照。
/// @since Beta v0.14.1
pub(crate) async fn export_sync_snapshot_internal(
  instances: &DbInstances,
) -> Result<String, String> {
  export_from_pool(&sqlite_pool(instances).await?).await
}

/// 仅供受 ACL 保护的手动合并流程，写库之前验证完整快照。
/// @since Beta v0.14.1
pub(crate) async fn import_sync_snapshot_internal(
  instances: &DbInstances,
  snapshot: &str,
) -> Result<SyncImportStats, String> {
  let rows = validate_snapshot(snapshot)?;
  import_into_pool(&sqlite_pool(instances).await?, &rows).await
}

/// 按列名（与物理顺序无关）检查完整结构，拒绝未知列、触发器及外键。
/// @since Beta v0.14.1
async fn check_schema(tx: &mut Transaction<'_, Sqlite>, table: &Table) -> Result<(), String> {
  let kind: Option<String> =
    sqlx::query_scalar("SELECT type FROM main.sqlite_master WHERE name = $1")
      .bind(table.name)
      .fetch_optional(&mut **tx)
      .await
      .map_err(|_| SCHEMA.to_string())?;
  if kind.as_deref() != Some("table") {
    return Err(SCHEMA.into());
  }
  let pragma = format!("PRAGMA main.table_xinfo(\"{}\")", table.name);
  let columns = sqlx::query(&pragma).fetch_all(&mut **tx).await.map_err(|_| SCHEMA.to_string())?;
  if columns.len() != table.columns.len() {
    return Err(SCHEMA.into());
  }
  let mut seen = HashSet::new();
  for actual in &columns {
    let name: String = actual.try_get("name").map_err(|_| SCHEMA.to_string())?;
    let expected =
      table.columns.iter().find(|column| column.name == name).ok_or_else(|| SCHEMA.to_string())?;
    let declared: String = actual.try_get("type").map_err(|_| SCHEMA.to_string())?;
    let pk: i64 = actual.try_get("pk").map_err(|_| SCHEMA.to_string())?;
    let hidden: i64 = actual.try_get("hidden").map_err(|_| SCHEMA.to_string())?;
    let expected_type = match expected.kind {
      Kind::Text | Kind::Json => "TEXT",
      Kind::Integer => "INTEGER",
      Kind::Boolean => "BOOLEAN",
    };
    if !seen.insert(name)
      || !declared.eq_ignore_ascii_case(expected_type)
      || pk != expected.pk
      || hidden != 0
    {
      return Err(SCHEMA.into());
    }
  }
  let triggers: i64 = sqlx::query_scalar("SELECT (SELECT count(*) FROM main.sqlite_master WHERE type = 'trigger' AND tbl_name = $1 COLLATE NOCASE) + (SELECT count(*) FROM temp.sqlite_master WHERE type = 'trigger' AND tbl_name = $1 COLLATE NOCASE)")
    .bind(table.name).fetch_one(&mut **tx).await.map_err(|_| SCHEMA.to_string())?;
  if triggers != 0 {
    return Err(SCHEMA.into());
  }
  let fk = format!("PRAGMA main.foreign_key_list(\"{}\")", table.name);
  if !sqlx::query(&fk).fetch_all(&mut **tx).await.map_err(|_| SCHEMA.to_string())?.is_empty() {
    return Err(SCHEMA.into());
  }
  Ok(())
}

/// 拒绝过大字段，避免拉取不受限本机数据到内存。
/// @since Beta v0.14.1
async fn check_field_sizes(tx: &mut Transaction<'_, Sqlite>, table: &Table) -> Result<(), String> {
  let checks = table
    .columns
    .iter()
    .map(|c| format!("length(CAST(\"{}\" AS BLOB)) > $1", c.name))
    .collect::<Vec<_>>()
    .join(" OR ");
  let sql = format!("SELECT 1 FROM main.\"{}\" WHERE {} LIMIT 1", table.name, checks);
  if sqlx::query_scalar::<_, i64>(&sql)
    .bind(MAX_FIELD_BYTES as i64)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| DATABASE.to_string())?
    .is_some()
  {
    return Err(LIMIT.into());
  }
  Ok(())
}

/// 生成固定列选择列表，同时检查 SQLite 实际存储类型。
/// @since Beta v0.14.1
fn selection(table: &Table) -> String {
  table
    .columns
    .iter()
    .map(|c| format!("\"{}\", typeof(\"{}\")", c.name, c.name))
    .collect::<Vec<_>>()
    .join(", ")
}

/// 无损读取一行，仅接受 NULL、文本和预期的整数存储类型。
/// @since Beta v0.14.1
fn decode_row(table: &Table, row: &sqlx::sqlite::SqliteRow) -> Result<Map<String, Value>, String> {
  let mut result = Map::new();
  for (index, column) in table.columns.iter().enumerate() {
    let actual: String = row.try_get(index * 2 + 1).map_err(|_| DATABASE.to_string())?;
    let value = match (actual.as_str(), column.kind) {
      ("null", _) => Value::Null,
      ("text", Kind::Text | Kind::Json) => {
        let value: String = row.try_get(index * 2).map_err(|_| DATABASE.to_string())?;
        if value.len() > MAX_FIELD_BYTES {
          return Err(LIMIT.into());
        }
        Value::String(value)
      }
      ("integer", Kind::Integer | Kind::Boolean) => {
        let value: i64 = row.try_get(index * 2).map_err(|_| DATABASE.to_string())?;
        Value::Number(value.into())
      }
      _ => return Err(SCHEMA.into()),
    };
    result.insert(column.name.into(), value);
  }
  Ok(result)
}

/// 使用同一读取事务导出四表；超出上限时不返回部分结果。
/// @since Beta v0.14.1
async fn export_from_pool(pool: &SqlitePool) -> Result<String, String> {
  let mut tx = pool.begin().await.map_err(|_| DATABASE.to_string())?;
  let mut tables = Map::new();
  let mut total_rows = 0usize;
  let mut bytes = 0usize;
  for table in TABLES {
    check_schema(&mut tx, table).await?;
    check_field_sizes(&mut tx, table).await?;
    let order = if table.name == "GachaRecords" { "\"id\"" } else { "\"uid\", \"id\"" };
    let sql =
      format!("SELECT {} FROM main.\"{}\" ORDER BY {}", selection(table), table.name, order);
    let mut stream = sqlx::query(&sql).fetch(&mut *tx);
    let mut records = Vec::new();
    while let Some(row) = stream.try_next().await.map_err(|_| DATABASE.to_string())? {
      total_rows += 1;
      if total_rows > MAX_ROWS {
        return Err(LIMIT.into());
      }
      let mut record = decode_row(table, &row)?;
      if table.name == "RoleCombat" {
        // 外链不是应用使用的剧诗业务数据，可能含 UID 或凭据；不能进入上传快照。
        redact_lineup_link(record.get_mut("detail").ok_or_else(|| INVALID.to_string())?)?;
      }
      let value = Value::Object(record);
      bytes = bytes
        .checked_add(serde_json::to_vec(&value).map_err(|_| DATABASE.to_string())?.len() + 1)
        .ok_or_else(|| LIMIT.to_string())?;
      if bytes > MAX_SNAPSHOT_BYTES {
        return Err(LIMIT.into());
      }
      records.push(value);
    }
    drop(stream);
    tables.insert(table.name.into(), Value::Array(records));
  }
  if total_rows == 0 {
    return Err(EMPTY.into());
  }
  let result = serde_json::json!({"version": 1, "tables": tables});
  let serialized = serde_json::to_string(&result).map_err(|_| DATABASE.to_string())?;
  if serialized.len() > MAX_SNAPSHOT_BYTES {
    return Err(LIMIT.into());
  }
  // 不能上传本版本自身无法安全导入的快照，以免替换掉可用的远端快照。
  validate_snapshot_value(result)?;
  tx.commit().await.map_err(|_| DATABASE.to_string())?;
  Ok(serialized)
}

/// 仅在导出内存副本中清除剧诗阵容外链，其余字段保留原业务值。
/// @since Beta v0.14.1
fn redact_lineup_link(value: &mut Value) -> Result<(), String> {
  let mut detail = parse_json(value.as_str().ok_or_else(|| INVALID.to_string())?, MAX_FIELD_BYTES)?;
  let Some(Value::String(link)) = detail.as_object_mut().and_then(|o| o.get_mut("lineup_link"))
  else {
    return Err(INVALID.into());
  };
  if !link.is_empty() {
    link.clear();
    *value = Value::String(serde_json::to_string(&detail).map_err(|_| INVALID.to_string())?);
  }
  Ok(())
}

/// 已验证快照的四表记录，与 TABLES 顺序一致。
/// @since Beta v0.14.1
type Records = Vec<Vec<Map<String, Value>>>;

/// 检查对象必需字段及可选字段，拒绝其他字段。
/// @since Beta v0.14.1
fn object<'a>(
  value: &'a Value,
  required: &[&str],
  optional: &[&str],
) -> Option<&'a Map<String, Value>> {
  let obj = value.as_object()?;
  if required.iter().any(|key| !obj.contains_key(*key))
    || obj.keys().any(|key| !required.contains(&key.as_str()) && !optional.contains(&key.as_str()))
  {
    return None;
  }
  Some(obj)
}

/// 检查数字为指定范围内的安全整数。
/// @since Beta v0.14.1
fn number(value: &Value, max: i64) -> bool {
  let max = max.min(MAX_SAFE_INTEGER) as f64;
  value.as_f64().is_some_and(|n| n.fract() == 0.0 && (0.0..=max).contains(&n))
}

/// 检查非空 ASCII 十进制标识符，不进行数值转换。
/// @since Beta v0.14.1
fn digits(value: &Value, max_len: usize) -> bool {
  value
    .as_str()
    .is_some_and(|s| !s.is_empty() && s.len() <= max_len && s.bytes().all(|b| b.is_ascii_digit()))
}

/// 检查格式化后的实际日期。
/// @since Beta v0.14.1
fn date(value: &Value) -> bool {
  value.as_str().is_some_and(|s| {
    s.len() == 19 && chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").is_ok()
  })
}

/// 检查经 Vue 文本插值展示的内容，禁止游戏链接标记、尖括号和不可见控制字符。
/// @since Beta v0.14.1
fn plain_segment(value: &str) -> bool {
  !value.contains("{LINK#")
    && !value.contains("{/LINK}")
    && value
      .chars()
      .all(|c| !matches!(c, '<' | '>') && (!c.is_control() || matches!(c, '\n' | '\r' | '\t')))
}

/// 仅允许安全的游戏颜色及换行标记，原始文本存储不变。
/// @since Beta v0.14.1
fn safe_text(value: &Value) -> bool {
  let Some(s) = value.as_str() else {
    return false;
  };
  if s.len() > 16 * 1024 {
    return false;
  }
  let mut remaining = s;
  let mut color_depth = 0;
  while let Some((text, after_open)) = remaining.split_once('<') {
    if !plain_segment(text) {
      return false;
    }
    let Some((tag, rest)) = after_open.split_once('>') else {
      return false;
    };
    if let Some(hex) = tag.strip_prefix("color=#") {
      if color_depth >= 16
        || !matches!(hex.len(), 6 | 8)
        || !hex.bytes().all(|b| b.is_ascii_hexdigit())
      {
        return false;
      }
      color_depth += 1;
    } else if tag == "/color" {
      if color_depth == 0 {
        return false;
      }
      color_depth -= 1;
    } else if !matches!(tag, "br" | "br/" | "br /") {
      return false;
    }
    remaining = rest;
  }
  color_depth == 0 && plain_segment(remaining)
}

/// 检查原始静态路径段；不接受点段、编码、反斜线、查询、锚点及其他保留字符。
/// @since Beta v0.14.1
fn image_path(path: &str, local: bool) -> bool {
  let segment = |s: &str| {
    !s.is_empty()
      && s.chars().all(|c| {
        c.is_ascii_alphanumeric()
          || matches!(c, '_' | '-')
          || (local && ('\u{4e00}'..='\u{9fff}').contains(&c))
      })
  };
  let mut parts = path.rsplit('/');
  let Some((name, ext)) = parts.next().and_then(|file| file.rsplit_once('.')) else {
    return false;
  };
  segment(name)
    && ["png", "webp", "jpg", "jpeg"].iter().any(|x| ext.eq_ignore_ascii_case(x))
    && parts.all(segment)
}

/// 只匹配静态 CDN 已知的年月日路径，不匹配同主机上的 API 或动态页面。
/// @since Beta v0.14.1
fn dated_image_path(path: &str) -> bool {
  let mut parts = path.split('/');
  let digit_segment = |s: &str, len: usize| s.len() == len && s.bytes().all(|b| b.is_ascii_digit());
  matches!((parts.next(), parts.next(), parts.next(), parts.next(), parts.next()),
    (Some(y), Some(m), Some(d), Some(file), None) if digit_segment(y, 4) && digit_segment(m, 2) &&
      digit_segment(d, 2) && image_path(file, false))
}

/// 只允许空图像、应用资源及静态官方 HTTPS 图片；不在同步时加载资源。
/// @since Beta v0.14.1
fn safe_image(value: &Value) -> bool {
  let Some(s) = value.as_str() else {
    return false;
  };
  if s.is_empty() {
    return true;
  }
  if s.len() > 512 {
    return false;
  }
  for prefix in ["/WIKI/", "/icon/", "/UI/"] {
    if let Some(path) = s.strip_prefix(prefix) {
      return image_path(path, true);
    }
  }
  // 原始 authority 仅容许精确主机和可选的默认 HTTPS 端口，避免 URL 解析器先做规范化。
  let Some((authority, path)) = s.strip_prefix("https://").and_then(|s| s.split_once('/')) else {
    return false;
  };
  let host = authority.strip_suffix(":443").unwrap_or(authority);
  // 见 propMap.json 的 game_record，以及 birth_calendar.json 的静态资源路径。
  if ["act-webstatic.mihoyo.com", "act-webstatic.hoyoverse.com"]
    .iter()
    .any(|h| host.eq_ignore_ascii_case(h))
  {
    return path
      .strip_prefix("game_record/genshin/")
      .is_some_and(|p| p.contains('/') && image_path(p, false));
  }
  if ["fastcdn.mihoyo.com", "fastcdn.hoyoverse.com"].iter().any(|h| host.eq_ignore_ascii_case(h)) {
    return path.strip_prefix("static-resource-v2/").is_some_and(dated_image_path);
  }
  host.eq_ignore_ascii_case("webstatic.mihoyo.com")
    && path.strip_prefix("upload/static-resource/").is_some_and(dated_image_path)
}

/// 深渊与剧诗的旧备份恢复会拼接单引号 SQL，故这些字段不能携带 SQL 分隔符。
/// @since Beta v0.14.1
fn legacy_backup_text(value: &Value) -> bool {
  value.as_str().is_some_and(|s| !s.contains('\'')) && safe_text(value)
}

/// 约束数组大小并验证所有成员。
/// @since Beta v0.14.1
fn array(value: &Value, validate: fn(&Value) -> bool) -> bool {
  value.as_array().is_some_and(|a| a.len() <= MAX_ARRAY && a.iter().all(validate))
}

/// 检查对象中多个非负数字字段。
/// @since Beta v0.14.1
fn numbers(obj: &Map<String, Value>, keys: &[&str], max: i64) -> bool {
  keys.iter().all(|key| obj.get(*key).is_some_and(|value| number(value, max)))
}

/// 验证深渊排行中的角色。
/// @since Beta v0.14.1
fn abyss_rank(value: &Value) -> bool {
  let Some(o) = object(value, &["id", "value", "star"], &[]) else {
    return false;
  };
  numbers(o, &["id", "value"], 1_000_000_000) && number(&o["star"], 5)
}

/// 验证深渊角色条目。
/// @since Beta v0.14.1
fn abyss_character(value: &Value) -> bool {
  let Some(o) = object(value, &["id", "level", "star"], &[]) else {
    return false;
  };
  number(&o["id"], 1_000_000_000) && number(&o["level"], 1_000) && number(&o["star"], 5)
}

/// 验证深渊怪物及受限的静态图像。
/// @since Beta v0.14.1
fn abyss_monster(value: &Value) -> bool {
  let Some(o) = object(value, &["name", "icon", "level"], &[]) else {
    return false;
  };
  legacy_backup_text(&o["name"]) && safe_image(&o["icon"]) && number(&o["level"], 1_000)
}

/// 验证深渊战斗详情和可选历史怪物字段。
/// @since Beta v0.14.1
fn abyss_battle(value: &Value) -> bool {
  let Some(o) = object(value, &["time", "characters"], &["monsters"]) else {
    return false;
  };
  date(&o["time"])
    && array(&o["characters"], abyss_character)
    && o.get("monsters").is_none_or(|v| array(v, abyss_monster))
}

/// 验证深渊关卡和可选战斗。
/// @since Beta v0.14.1
fn abyss_level(value: &Value) -> bool {
  let Some(o) = object(value, &["id", "winStar", "maxStar"], &["upBattle", "downBattle"]) else {
    return false;
  };
  number(&o["id"], 100)
    && number(&o["winStar"], 3)
    && number(&o["maxStar"], 3)
    && o["winStar"].as_f64() <= o["maxStar"].as_f64()
    && o.get("upBattle").is_none_or(abyss_battle)
    && o.get("downBattle").is_none_or(abyss_battle)
}

/// 验证深渊楼层。
/// @since Beta v0.14.1
fn abyss_floor(value: &Value) -> bool {
  let Some(o) = object(value, &["id", "isUnlock", "winStar", "maxStar", "levels"], &["buff"])
  else {
    return false;
  };
  number(&o["id"], 100)
    && number(&o["isUnlock"], 1)
    && number(&o["winStar"], 36)
    && number(&o["maxStar"], 36)
    && o["winStar"].as_f64() <= o["maxStar"].as_f64()
    && array(&o["levels"], abyss_level)
    && o.get("buff").is_none_or(|v| array(v, legacy_backup_text))
}

/// 验证危战队伍角色。
/// @since Beta v0.14.1
fn challenge_team(value: &Value) -> bool {
  let Some(o) =
    object(value, &["avatar_id", "name", "element", "image", "level", "rarity", "rank"], &[])
  else {
    return false;
  };
  number(&o["avatar_id"], 1_000_000_000)
    && safe_text(&o["name"])
    && safe_text(&o["element"])
    && safe_image(&o["image"])
    && number(&o["level"], 1_000)
    && number(&o["rarity"], 5)
    && number(&o["rank"], 6)
}

/// 验证危战最佳角色。
/// @since Beta v0.14.1
fn challenge_avatar(value: &Value) -> bool {
  let Some(o) = object(value, &["avatar_id", "side_icon", "dps", "type"], &[]) else {
    return false;
  };
  number(&o["avatar_id"], 1_000_000_000)
    && safe_image(&o["side_icon"])
    && safe_text(&o["dps"])
    && number(&o["type"], 2)
}

/// 验证危战怪物标签。
/// @since Beta v0.14.1
fn challenge_tag(value: &Value) -> bool {
  let Some(o) = object(value, &["type", "desc"], &[]) else {
    return false;
  };
  safe_text(&o["type"]) && safe_text(&o["desc"])
}

/// 验证危战怪物及安全颜色描述。
/// @since Beta v0.14.1
fn challenge_monster(value: &Value) -> bool {
  let Some(o) = object(value, &["name", "level", "icon", "desc", "tags", "monster_id"], &[]) else {
    return false;
  };
  safe_text(&o["name"])
    && number(&o["level"], 1_000)
    && safe_image(&o["icon"])
    && array(&o["desc"], safe_text)
    && array(&o["tags"], challenge_tag)
    && number(&o["monster_id"], 1_000_000_000)
}

/// 验证危战单场记录。
/// @since Beta v0.14.1
fn challenge_item(value: &Value) -> bool {
  let Some(o) = object(value, &["name", "second", "teams", "best_avatar", "monster"], &[]) else {
    return false;
  };
  safe_text(&o["name"])
    && number(&o["second"], 1_000_000)
    && array(&o["teams"], challenge_team)
    && array(&o["best_avatar"], challenge_avatar)
    && challenge_monster(&o["monster"])
}

/// 验证危战最佳信息。
/// @since Beta v0.14.1
fn challenge_best(value: &Value) -> bool {
  if value.is_null() {
    return true;
  }
  let Some(o) = object(value, &["difficulty", "second", "icon"], &[]) else {
    return false;
  };
  number(&o["difficulty"], 6) && number(&o["second"], 1_000_000) && safe_image(&o["icon"])
}

/// 验证危战单人或联机详情。
/// @since Beta v0.14.1
fn challenge_data(value: &Value) -> bool {
  let Some(o) = object(value, &["best", "challenge", "has_data"], &[]) else {
    return false;
  };
  challenge_best(&o["best"]) && array(&o["challenge"], challenge_item) && o["has_data"].is_boolean()
}

/// 验证危战赋光角色。
/// @since Beta v0.14.1
fn challenge_bling(value: &Value) -> bool {
  let Some(o) = object(
    value,
    &["avatar_id", "name", "element", "image", "side_icon", "rarity", "is_plus"],
    &[],
  ) else {
    return false;
  };
  number(&o["avatar_id"], 1_000_000_000)
    && safe_text(&o["name"])
    && safe_text(&o["element"])
    && safe_image(&o["image"])
    && safe_image(&o["side_icon"])
    && number(&o["rarity"], 5)
    && o["is_plus"].is_boolean()
}

/// 验证剧诗统计数据。
/// @since Beta v0.14.1
fn combat_stat(value: &Value) -> bool {
  let Some(o) = object(
    value,
    &[
      "difficulty_id",
      "max_round_id",
      "heraldry",
      "get_medal_round_list",
      "medal_num",
      "coin_num",
      "avatar_bonus_num",
      "rent_cnt",
      "tarot_finished_cnt",
    ],
    &[],
  ) else {
    return false;
  };
  number(&o["difficulty_id"], 5)
    && numbers(
      o,
      &[
        "max_round_id",
        "heraldry",
        "medal_num",
        "coin_num",
        "avatar_bonus_num",
        "rent_cnt",
        "tarot_finished_cnt",
      ],
      1_000_000,
    )
    && array(&o["get_medal_round_list"], |v| number(v, 1))
}

/// 验证剧诗角色。
/// @since Beta v0.14.1
fn combat_avatar(value: &Value) -> bool {
  let Some(o) = object(
    value,
    &["avatar_id", "avatar_type", "name", "element", "image", "level", "rarity"],
    &[],
  ) else {
    return false;
  };
  number(&o["avatar_id"], 1_000_000_000)
    && number(&o["avatar_type"], 3)
    && legacy_backup_text(&o["name"])
    && legacy_backup_text(&o["element"])
    && safe_image(&o["image"])
    && number(&o["level"], 1_000)
    && number(&o["rarity"], 5)
}

/// 验证剧诗角色统计摘要。
/// @since Beta v0.14.1
fn combat_avatar_mini(value: &Value) -> bool {
  let Some(o) = object(value, &["avatar_id", "avatar_icon", "value"], &["rarity"]) else {
    return false;
  };
  number(&o["avatar_id"], 1_000_000_000)
    && safe_image(&o["avatar_icon"])
    && (legacy_backup_text(&o["value"]) || number(&o["value"], 1_000_000_000))
    && o.get("rarity").is_none_or(|v| number(v, 5))
}

/// 验证可能为空的角色统计摘要。
/// @since Beta v0.14.1
fn combat_avatar_or_null(value: &Value) -> bool {
  value.is_null() || combat_avatar_mini(value)
}

/// 验证剧诗战斗统计。
/// @since Beta v0.14.1
fn combat_fight(value: &Value) -> bool {
  let Some(o) = object(
    value,
    &[
      "max_defeat_avatar",
      "max_damage_avatar",
      "max_take_damage_avatar",
      "total_coin_consumed",
      "shortest_avatar_list",
      "total_use_time",
      "is_show_battle_stats",
    ],
    &[],
  ) else {
    return false;
  };
  ["max_defeat_avatar", "max_damage_avatar", "max_take_damage_avatar", "total_coin_consumed"]
    .iter()
    .all(|key| combat_avatar_or_null(&o[*key]))
    && array(&o["shortest_avatar_list"], combat_avatar_mini)
    && number(&o["total_use_time"], 1_000_000)
    && o["is_show_battle_stats"].is_boolean()
}

/// 验证剧诗卡片。
/// @since Beta v0.14.1
fn combat_card(value: &Value) -> bool {
  let Some(o) = object(value, &["icon", "name", "desc", "is_enhanced", "id"], &[]) else {
    return false;
  };
  safe_image(&o["icon"])
    && legacy_backup_text(&o["name"])
    && legacy_backup_text(&o["desc"])
    && o["is_enhanced"].is_boolean()
    && number(&o["id"], 1_000_000_000)
}

/// 验证剧诗增益效果。
/// @since Beta v0.14.1
fn combat_effect(value: &Value) -> bool {
  let Some(o) = object(value, &["icon", "name", "desc"], &[]) else {
    return false;
  };
  safe_image(&o["icon"]) && legacy_backup_text(&o["name"]) && legacy_backup_text(&o["desc"])
}

/// 验证剧诗增益。
/// @since Beta v0.14.1
fn combat_buff(value: &Value) -> bool {
  let Some(o) = object(value, &["name", "icon", "level", "level_effect"], &[]) else {
    return false;
  };
  legacy_backup_text(&o["name"])
    && safe_image(&o["icon"])
    && number(&o["level"], 1_000)
    && array(&o["level_effect"], combat_effect)
}

/// 验证剧诗总体增益。
/// @since Beta v0.14.1
fn combat_splendour(value: &Value) -> bool {
  let Some(o) = object(value, &["summary", "buffs"], &[]) else {
    return false;
  };
  let Some(summary) = object(&o["summary"], &["total_level", "desc"], &[]) else {
    return false;
  };
  number(&summary["total_level"], 1_000)
    && legacy_backup_text(&summary["desc"])
    && array(&o["buffs"], combat_buff)
}

/// 验证剧诗敌人。
/// @since Beta v0.14.1
fn combat_enemy(value: &Value) -> bool {
  let Some(o) = object(value, &["name", "icon", "level"], &[]) else {
    return false;
  };
  legacy_backup_text(&o["name"]) && safe_image(&o["icon"]) && number(&o["level"], 1_000)
}

/// 验证游戏日期结构。
/// @since Beta v0.14.1
fn game_date(value: &Value) -> bool {
  let Some(o) = object(value, &["year", "month", "day", "hour", "minute", "second"], &[]) else {
    return false;
  };
  numbers(o, &["year"], 9999)
    && number(&o["month"], 12)
    && number(&o["day"], 31)
    && number(&o["hour"], 23)
    && number(&o["minute"], 59)
    && number(&o["second"], 59)
}

/// 验证剧诗每一幕。
/// @since Beta v0.14.1
fn combat_round(value: &Value) -> bool {
  let Some(o) = object(
    value,
    &[
      "avatars",
      "choice_cards",
      "buffs",
      "is_get_medal",
      "round_id",
      "finish_time",
      "finish_date_time",
      "enemies",
      "splendour_buff",
      "is_tarot",
      "tarot_serial_no",
    ],
    &[],
  ) else {
    return false;
  };
  array(&o["avatars"], combat_avatar)
    && array(&o["choice_cards"], combat_card)
    && array(&o["buffs"], combat_buff)
    && o["is_get_medal"].is_boolean()
    && number(&o["round_id"], 1_000)
    && digits(&o["finish_time"], 15)
    && game_date(&o["finish_date_time"])
    && array(&o["enemies"], combat_enemy)
    && combat_splendour(&o["splendour_buff"])
    && o["is_tarot"].is_boolean()
    && number(&o["tarot_serial_no"], 1_000)
}

/// 验证剧诗详情；暂不接受任何外部阵容链接。
/// @since Beta v0.14.1
fn combat_detail(value: &Value) -> bool {
  let Some(o) = object(
    value,
    &["rounds_data", "detail_stat", "lineup_link", "backup_avatars", "fight_statisic"],
    &[],
  ) else {
    return false;
  };
  array(&o["rounds_data"], combat_round)
    && combat_stat(&o["detail_stat"])
    && o["lineup_link"].as_str() == Some("")
    && array(&o["backup_avatars"], combat_avatar)
    && combat_fight(&o["fight_statisic"])
}

/// 验证内嵌 JSON 字符串，而不是只验证其外层类型。
/// @since Beta v0.14.1
fn nested(value: &Value, validate: fn(&Value) -> bool) -> bool {
  parse_nested(value).is_some_and(|v| validate(&v))
}

/// 解析存放在 SQLite TEXT 列中的 JSON；不改写存储文本。
/// @since Beta v0.14.1
fn parse_nested(value: &Value) -> Option<Value> {
  value.as_str().and_then(|s| parse_json(s, MAX_FIELD_BYTES).ok())
}

/// 按客户端 JSON 数字和对象语义比较；数组顺序仍表示业务数据。
/// @since Beta v0.14.1
fn same_json(left: &Value, right: &Value) -> bool {
  match (left, right) {
    (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
    (Value::Array(a), Value::Array(b)) => {
      a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_json(a, b))
    }
    (Value::Object(a), Value::Object(b)) => {
      a.len() == b.len() && a.iter().all(|(key, a)| b.get(key).is_some_and(|b| same_json(a, b)))
    }
    _ => left == right,
  }
}

/// 同键比较不计更新时间；业务 JSON 按值比较，不改写原文本。
/// @since Beta v0.14.1
fn same_business_record(
  table: &Table,
  left: &Map<String, Value>,
  right: &Map<String, Value>,
) -> bool {
  table.columns.iter().filter(|c| c.name != "updated").all(|c| {
    let (a, b) = (&left[c.name], &right[c.name]);
    a == b
      || (c.kind == Kind::Json
        && parse_nested(a).zip(parse_nested(b)).is_some_and(|(mut a, mut b)| {
          if table.name == "RoleCombat" && c.name == "detail" {
            // 阵容外链不在同步范围内，本机已有外链不构成业务冲突。
            if let Some(detail) = a.as_object_mut() {
              detail.remove("lineup_link");
            }
            if let Some(detail) = b.as_object_mut() {
              detail.remove("lineup_link");
            }
          }
          same_json(&a, &b)
        }))
  })
}

/// 验证四表行的完整结构、范围与所有可渲染字段。
/// @since Beta v0.14.1
fn validate_record(table: &Table, row: &Map<String, Value>) -> bool {
  if row.len() != table.columns.len() || table.columns.iter().any(|c| !row.contains_key(c.name)) {
    return false;
  }
  for c in table.columns {
    let value = &row[c.name];
    if value.is_null() && c.nullable {
      continue;
    }
    match c.kind {
      Kind::Text | Kind::Json if value.as_str().is_some_and(|s| s.len() <= MAX_FIELD_BYTES) => {}
      Kind::Integer if value.as_i64().is_some_and(|n| (0..=MAX_SAFE_INTEGER).contains(&n)) => {}
      Kind::Boolean if matches!(value.as_i64(), Some(0 | 1)) => {}
      _ => return false,
    }
  }
  if !digits(&row["uid"], 20) || !date(&row["updated"]) {
    return false;
  }
  if table.name == "GachaRecords" {
    return digits(&row["id"], 32)
      && digits(&row["gachaType"], 12)
      && digits(&row["uigfType"], 12)
      && date(&row["time"])
      && (row["itemId"].is_null() || digits(&row["itemId"], 16))
      && safe_text(&row["name"])
      && (row["type"].is_null() || safe_text(&row["type"]))
      && (row["rank"].is_null() || matches!(row["rank"].as_str(), Some("3" | "4" | "5")))
      && digits(&row["count"], 12);
  }
  if !number(&row["id"], 1_000_000_000) || !date(&row["startTime"]) || !date(&row["endTime"]) {
    return false;
  }
  match table.name {
    "SpiralAbyss" => {
      numbers(row, &["totalBattleTimes", "totalWinTimes"], 1_000_000)
        && number(&row["totalStar"], 1_000)
        && legacy_backup_text(&row["maxFloor"])
        && (row["skippedFloor"].is_null() || legacy_backup_text(&row["skippedFloor"]))
        && [
          "revealRank",
          "defeatRank",
          "damageRank",
          "takeDamageRank",
          "normalSkillRank",
          "energySkillRank",
        ]
        .iter()
        .all(|key| nested(&row[*key], |v| array(v, abyss_rank)))
        && nested(&row["floors"], |v| array(v, abyss_floor))
    }
    "RoleCombat" => nested(&row["stat"], combat_stat) && nested(&row["detail"], combat_detail),
    "HardChallenge" => {
      safe_text(&row["name"])
        && nested(&row["single"], challenge_data)
        && nested(&row["mp"], challenge_data)
        && nested(&row["blings"], |v| array(v, challenge_bling))
    }
    _ => false,
  }
}

/// 校验快照、版本、所有记录和重复主键；失败时不访问数据库。
/// @since Beta v0.14.1
fn validate_snapshot(snapshot: &str) -> Result<Records, String> {
  validate_snapshot_value(parse_json(snapshot, MAX_SNAPSHOT_BYTES)?)
}

/// 导出和导入共用同一份结构校验；接管快照值，不额外复制记录。
/// @since Beta v0.14.1
fn validate_snapshot_value(mut root: Value) -> Result<Records, String> {
  let envelope = object(&root, &["version", "tables"], &[]).ok_or_else(|| INVALID.to_string())?;
  if envelope["version"].as_i64() != Some(1) {
    return Err(INVALID.into());
  }
  let mut tables = match root["tables"].take() {
    Value::Object(tables) if tables.len() == TABLES.len() => tables,
    _ => return Err(INVALID.into()),
  };
  let mut total = 0usize;
  for table in TABLES {
    let rows =
      tables.get(table.name).and_then(Value::as_array).ok_or_else(|| INVALID.to_string())?;
    total = total.checked_add(rows.len()).ok_or_else(|| LIMIT.to_string())?;
    if total > MAX_ROWS {
      return Err(LIMIT.into());
    }
  }
  let mut records = Vec::with_capacity(TABLES.len());
  for table in TABLES {
    let Some(Value::Array(rows)) = tables.remove(table.name) else {
      return Err(INVALID.into());
    };
    let mut keys = HashSet::new();
    let mut result = Vec::with_capacity(rows.len());
    for value in rows {
      let Value::Object(row) = value else {
        return Err(INVALID.into());
      };
      if row.values().any(|value| value.as_str().is_some_and(|s| s.len() > MAX_FIELD_BYTES)) {
        return Err(LIMIT.into());
      }
      if table.name == "HardChallenge"
        && ["single", "mp", "blings"].iter().any(|field| {
          row
            .get(*field)
            .is_some_and(|v| v.is_null() || v.as_str().is_some_and(|s| s.trim().is_empty()))
        })
      {
        // v2 仅补列，无旧详情可用；当前客户端会隔离这些记录，而不是将 NULL 解释为无挑战。
        return Err(LEGACY_CHALLENGE.into());
      }
      if table.name == "RoleCombat" {
        if let Some(detail) = row.get("detail").and_then(parse_nested) {
          if detail.get("lineup_link").and_then(Value::as_str).is_some_and(|s| !s.is_empty()) {
            return Err(UNSUPPORTED_LINEUP.into());
          }
        }
      }
      if !validate_record(table, &row) {
        return Err(INVALID.into());
      }
      let id = if table.name == "GachaRecords" {
        row["id"].as_str().unwrap().to_owned()
      } else {
        row["id"].as_i64().unwrap().to_string()
      };
      let uid = if table.name == "GachaRecords" { "" } else { row["uid"].as_str().unwrap() };
      if !keys.insert((uid.to_owned(), id)) {
        return Err(INVALID.into());
      }
      result.push(row);
    }
    records.push(result);
  }
  Ok(records)
}

/// 从当前事务读取主键对应行，祈愿表仅按全局 id 检索。
/// @since Beta v0.14.1
async fn existing_row(
  tx: &mut Transaction<'_, Sqlite>,
  table: &Table,
  row: &Map<String, Value>,
) -> Result<Option<Map<String, Value>>, String> {
  let condition =
    if table.name == "GachaRecords" { "\"id\" = $1" } else { "\"uid\" = $1 AND \"id\" = $2" };
  let sql = format!("SELECT {} FROM main.\"{}\" WHERE {}", selection(table), table.name, condition);
  let query = sqlx::query(&sql);
  let found = if table.name == "GachaRecords" {
    query.bind(row["id"].as_str().unwrap()).fetch_optional(&mut **tx).await
  } else {
    query
      .bind(row["uid"].as_str().unwrap())
      .bind(row["id"].as_i64().unwrap())
      .fetch_optional(&mut **tx)
      .await
  }
  .map_err(|_| DATABASE.to_string())?;
  found.map(|r| decode_row(table, &r)).transpose()
}

/// 参数化插入一条已验证的缺失记录，不使用覆盖或冲突忽略语句。
/// @since Beta v0.14.1
async fn insert_record(
  tx: &mut Transaction<'_, Sqlite>,
  table: &Table,
  row: &Map<String, Value>,
) -> Result<(), String> {
  let names =
    table.columns.iter().map(|c| format!("\"{}\"", c.name)).collect::<Vec<_>>().join(", ");
  let params = (1..=table.columns.len()).map(|n| format!("${n}")).collect::<Vec<_>>().join(", ");
  // 语句级 ABORT 覆盖表上可能存在的 ON CONFLICT REPLACE / IGNORE 等策略。
  let sql = format!("INSERT OR ABORT INTO main.\"{}\" ({names}) VALUES ({params})", table.name);
  let mut query = sqlx::query(&sql);
  for col in table.columns {
    let value = &row[col.name];
    query = if value.is_null() {
      query.bind(None::<String>)
    } else if let Some(s) = value.as_str() {
      query.bind(s.to_owned())
    } else if let Some(i) = value.as_i64() {
      query.bind(i)
    } else {
      return Err(INVALID.into());
    };
  }
  let result = query.execute(&mut **tx).await.map_err(|_| DATABASE.to_string())?;
  if result.rows_affected() != 1 {
    return Err(DATABASE.into());
  }
  Ok(())
}

/// 在同一事务内检查结构、查重、统计冲突并插入，不传播删除。
/// @since Beta v0.14.1
async fn import_transaction(
  tx: &mut Transaction<'_, Sqlite>,
  records: &Records,
) -> Result<SyncImportStats, String> {
  let mut result = SyncImportStats::default();
  for table in TABLES {
    check_schema(tx, table).await?;
    check_field_sizes(tx, table).await?;
  }
  for (index, table) in TABLES.iter().enumerate() {
    let stats = match table.name {
      "GachaRecords" => &mut result.gacha_records,
      "SpiralAbyss" => &mut result.spiral_abyss,
      "RoleCombat" => &mut result.role_combat,
      "HardChallenge" => &mut result.hard_challenge,
      _ => return Err(INVALID.into()),
    };
    for row in &records[index] {
      match existing_row(tx, table, row).await? {
        None => {
          insert_record(tx, table, row).await?;
          stats.inserted += 1;
        }
        Some(existing) if same_business_record(table, &existing, row) => stats.identical += 1,
        Some(_) => stats.conflicts += 1,
      }
    }
  }
  Ok(result)
}

/// 显式提交或回滚整包；并发写冲突返回脱敏错误而不重试覆盖。
/// @since Beta v0.14.1
async fn import_into_pool(pool: &SqlitePool, records: &Records) -> Result<SyncImportStats, String> {
  let mut tx = pool.begin().await.map_err(|_| DATABASE.to_string())?;
  match import_transaction(&mut tx, records).await {
    Ok(stats) => {
      tx.commit().await.map_err(|_| DATABASE.to_string())?;
      Ok(stats)
    }
    Err(error) => {
      let _ = tx.rollback().await;
      Err(error)
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;
  use sqlx::sqlite::SqlitePoolOptions;

  /// 创建仅存在于内存中的测试库，并使用项目现行建表 SQL。
  /// @since Beta v0.14.1
  async fn pool() -> SqlitePool {
    let pool =
      SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.unwrap();
    sqlx::raw_sql(include_str!("../../src/plugins/Sqlite/sql/createTable.sql"))
      .execute(&pool)
      .await
      .unwrap();
    pool
  }

  /// 构造不含任何真实用户资料的祈愿记录。
  /// @since Beta v0.14.1
  fn gacha(id: &str, uid: &str, name: &str) -> Value {
    json!({"id":id,"uid":uid,"gachaType":"301","uigfType":"301","time":"2026-01-02 03:04:05",
      "itemId":"10001","name":name,"type":"角色","rank":"5","count":"1","updated":"2026-01-02 03:04:05"})
  }

  /// 构造带楼层和角色的本地资源深渊记录。
  /// @since Beta v0.14.1
  fn abyss(uid: &str, id: i64) -> Value {
    let rank = json!([{"id":10001,"value":12,"star":5}]).to_string();
    let floors = json!([{"id":12,"isUnlock":1,"winStar":3,"maxStar":3,"buff":["效果"],
      "levels":[{"id":1,"winStar":3,"maxStar":3,"upBattle":{"time":"2026-01-02 03:04:05",
        "characters":[{"id":10001,"level":90,"star":5}],
        "monsters":[{"name":"敌人","icon":"/icon/enemy/test.webp","level":100}]}}]}])
    .to_string();
    json!({"uid":uid,"id":id,"startTime":"2026-01-02 03:04:05","endTime":"2026-01-02 03:04:05",
      "totalBattleTimes":1,"totalWinTimes":1,"maxFloor":"12-3","totalStar":3,"isUnlock":1,
      "revealRank":rank,"defeatRank":rank,"damageRank":rank,"takeDamageRank":rank,
      "normalSkillRank":rank,"energySkillRank":rank,"floors":floors,"skippedFloor":null,"updated":"2026-01-02 03:04:05"})
  }

  /// 构造完整剧诗统计。
  /// @since Beta v0.14.1
  fn stat() -> Value {
    json!({"difficulty_id":1,"max_round_id":0,"heraldry":0,"get_medal_round_list":[],"medal_num":0,
      "coin_num":0,"avatar_bonus_num":0,"rent_cnt":0,"tarot_finished_cnt":0})
  }

  /// 构造含真实字段形状和合成静态资源的剧诗记录。
  /// @since Beta v0.14.1
  fn combat(uid: &str, id: i64) -> Value {
    let avatar = json!({"avatar_id":10001,"avatar_type":1,"name":"测试角色","element":"Cryo",
      "image":"https://act-webstatic.mihoyo.com/game_record/genshin/character_icon/UI_AvatarIcon_Test.png",
      "level":90,"rarity":5});
    let buff = json!({"name":"测试祝福","icon":"/UI/combat/combatCrown.webp","level":1,
      "level_effect":[{"icon":"","name":"效果","desc":"<color=#3399CC>50%<br />攻击</color>"}]});
    let round = json!({"avatars":[avatar],"choice_cards":[{"icon":"/UI/combat/test.webp","name":"卡片",
      "desc":"普通文字<br>换行","is_enhanced":false,"id":1}],"buffs":[buff],"is_get_medal":true,
      "round_id":1,"finish_time":"1767280000",
      "finish_date_time":{"year":2026,"month":1,"day":2,"hour":3,"minute":4,"second":5},
      "enemies":[{"name":"敌人","icon":"/icon/enemy/test.webp","level":95}],
      "splendour_buff":{"summary":{"desc":"分行\n测试","total_level":1},"buffs":[buff]},
      "is_tarot":false,"tarot_serial_no":0});
    let detail = json!({"rounds_data":[round],"detail_stat":stat(),"lineup_link":"","backup_avatars":[],
      "fight_statisic":{"max_defeat_avatar":null,"max_damage_avatar":null,"max_take_damage_avatar":null,
        "total_coin_consumed":null,"shortest_avatar_list":[],"total_use_time":0,"is_show_battle_stats":false}});
    json!({"uid":uid,"id":id,"startTime":"2026-01-02 03:04:05","endTime":"2026-01-02 03:04:05",
      "hasData":1,"hasDetailData":1,"stat":stat().to_string(),"detail":detail.to_string(),"updated":"2026-01-02 03:04:05"})
  }

  /// 构造含队伍、最佳伤害、赋光、颜色文字和 CDN 图像的危战记录。
  /// @since Beta v0.14.1
  fn challenge(uid: &str, id: i64, name: &str) -> Value {
    let image =
      "https://act-webstatic.mihoyo.com/game_record/genshin/character_icon/UI_AvatarIcon_Test.png";
    let side_icon = "https://act-webstatic.mihoyo.com/game_record/genshin/character_side_icon/UI_AvatarIcon_Side_Test.png";
    let monster_icon = "https://fastcdn.mihoyo.com/static-resource-v2/2026/01/02/abc_123.png";
    let single = json!({
      "best":{"difficulty":6,"second":12,"icon":"/icon/challenge/UI_LeyLineChallenge_Medal_6.webp"},
      "has_data":true,"challenge":[{"name":"敌人","second":12,
        "teams":[{"avatar_id":10001,"name":"角色","element":"Cryo","image":image,"level":90,"rarity":5,"rank":1}],
        "best_avatar":[{"avatar_id":10001,"side_icon":side_icon,"dps":"1000","type":1}],
        "monster":{"name":"敌人","level":100,"icon":monster_icon,
          "desc":["生命值<color=#3399CCFF>50%</color>","效果"],
          "tags":[{"type":"0","desc":"{SPRITE_PRESET#11001}元素"}],"monster_id":101}}]});
    let mp = json!({"best":null,"has_data":false,"challenge":[]});
    let blings = json!([{"avatar_id":10001,"name":"角色","element":"Cryo","image":image,
      "side_icon":side_icon,"rarity":5,"is_plus":true}]);
    json!({"uid":uid,"id":id,"startTime":"2026-01-02 03:04:05","endTime":"2026-01-02 03:04:05",
      "name":name,"single":single.to_string(),"mp":mp.to_string(),"blings":blings.to_string(),
      "updated":"2026-01-02 03:04:05"})
  }

  /// 构造四表快照信封。
  /// @since Beta v0.14.1
  fn snapshot(g: Vec<Value>, a: Vec<Value>, c: Vec<Value>, h: Vec<Value>) -> String {
    json!({"version":1,"tables":{"GachaRecords":g,"SpiralAbyss":a,"RoleCombat":c,"HardChallenge":h}}).to_string()
  }

  /// 四表往返保留字节值；再次导入视为相同而非覆盖。
  /// @since Beta v0.14.1
  #[test]
  fn four_table_round_trip_is_insert_only_and_idempotent() {
    tauri::async_runtime::block_on(async {
      let source = pool().await;
      let input = snapshot(
        vec![gacha("100", "123456789", "测试")],
        vec![abyss("123456789", 1)],
        vec![combat("123456789", 1)],
        vec![challenge("123456789", 1, "第一期")],
      );
      let first = import_into_pool(&source, &validate_snapshot(&input).unwrap()).await.unwrap();
      assert_eq!(first.gacha_records.inserted, 1);
      assert_eq!(first.spiral_abyss.inserted, 1);
      assert_eq!(first.role_combat.inserted, 1);
      assert_eq!(first.hard_challenge.inserted, 1);
      let exported = export_from_pool(&source).await.unwrap();
      let destination = pool().await;
      let records = validate_snapshot(&exported).unwrap();
      let added = import_into_pool(&destination, &records).await.unwrap();
      assert_eq!(added.hard_challenge.inserted, 1);
      let same = import_into_pool(&destination, &records).await.unwrap();
      assert_eq!(same.gacha_records.identical, 1);
      assert_eq!(same.spiral_abyss.identical, 1);
      assert_eq!(same.role_combat.identical, 1);
      assert_eq!(same.hard_challenge.identical, 1);
      assert_eq!(
        serde_json::from_str::<Value>(&export_from_pool(&destination).await.unwrap()).unwrap(),
        serde_json::from_str::<Value>(&exported).unwrap()
      );
    });
  }

  /// 全局祈愿 id 不因 UID 不同而覆盖；复合键允许相同 id 的不同 UID。
  /// @since Beta v0.14.1
  #[test]
  fn keys_conflicts_and_uid_isolation() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      let initial = snapshot(
        vec![gacha("100", "111111111", "原值")],
        vec![abyss("111111111", 1)],
        vec![],
        vec![],
      );
      import_into_pool(&db, &validate_snapshot(&initial).unwrap()).await.unwrap();
      let incoming = snapshot(
        vec![gacha("100", "222222222", "不同值"), gacha("101", "222222222", "新增")],
        vec![abyss("222222222", 1)],
        vec![],
        vec![],
      );
      let result = import_into_pool(&db, &validate_snapshot(&incoming).unwrap()).await.unwrap();
      assert_eq!(result.gacha_records.conflicts, 1);
      assert_eq!(result.gacha_records.inserted, 1);
      assert_eq!(result.spiral_abyss.inserted, 1);
      let original: (String, String) =
        sqlx::query_as("SELECT uid, name FROM GachaRecords WHERE id = '100'")
          .fetch_one(&db)
          .await
          .unwrap();
      assert_eq!(original, ("111111111".to_string(), "原值".to_string()));
      let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM SpiralAbyss WHERE id = 1")
        .fetch_one(&db)
        .await
        .unwrap();
      assert_eq!(count, 2);
      let omissions = snapshot(vec![gacha("101", "222222222", "新增")], vec![], vec![], vec![]);
      import_into_pool(&db, &validate_snapshot(&omissions).unwrap()).await.unwrap();
      let gacha_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM main.GachaRecords").fetch_one(&db).await.unwrap();
      let abyss_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM main.SpiralAbyss").fetch_one(&db).await.unwrap();
      assert_eq!(gacha_count, 2);
      assert_eq!(abyss_count, 2);
    });
  }

  /// 即使后表插入受约束失败，前表插入也必须回滚。
  /// @since Beta v0.14.1
  #[test]
  fn database_failure_rolls_back_every_table() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      sqlx::raw_sql(
        "DROP TABLE main.HardChallenge;
        CREATE TABLE main.HardChallenge (
          uid TEXT, id INTEGER, startTime TEXT, endTime TEXT,
          name TEXT UNIQUE ON CONFLICT REPLACE, single TEXT, mp TEXT, blings TEXT, updated TEXT,
          PRIMARY KEY(uid, id)
        );",
      )
      .execute(&db)
      .await
      .unwrap();
      let initial = snapshot(vec![], vec![], vec![], vec![challenge("111111111", 1, "相同名称")]);
      import_into_pool(&db, &validate_snapshot(&initial).unwrap()).await.unwrap();
      let incoming = snapshot(
        vec![gacha("101", "111111111", "新增")],
        vec![],
        vec![],
        vec![challenge("222222222", 2, "相同名称")],
      );
      assert_eq!(
        import_into_pool(&db, &validate_snapshot(&incoming).unwrap()).await.err().unwrap(),
        DATABASE
      );
      let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM main.GachaRecords").fetch_one(&db).await.unwrap();
      assert_eq!(count, 0);
      let originals: Vec<(String, i64, String)> =
        sqlx::query_as("SELECT uid, id, name FROM main.HardChallenge")
          .fetch_all(&db)
          .await
          .unwrap();
      assert_eq!(originals, vec![("111111111".to_string(), 1, "相同名称".to_string())]);
    });
  }

  /// v2 ALTER TABLE 追加的三列位于 updated 后，也必须按列名读写。
  /// @since Beta v0.14.1
  #[test]
  fn migrated_column_order_and_legacy_nulls_are_handled_without_fabrication() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      sqlx::raw_sql(
        "DROP TABLE main.HardChallenge;
        CREATE TABLE main.HardChallenge (
          id INTEGER, uid TEXT, name TEXT, startTime TEXT, endTime TEXT, updated TEXT,
          PRIMARY KEY(uid, id)
        );
        ALTER TABLE main.HardChallenge ADD single TEXT;
        ALTER TABLE main.HardChallenge ADD mp TEXT;
        ALTER TABLE main.HardChallenge ADD blings TEXT;",
      )
      .execute(&db)
      .await
      .unwrap();
      let mut historical = gacha("100", "123456789", "曾用物品");
      for key in ["itemId", "type", "rank"] {
        historical[key] = Value::Null;
      }
      let input =
        snapshot(vec![historical], vec![], vec![], vec![challenge("123456789", 1, "一期")]);
      let result = import_into_pool(&db, &validate_snapshot(&input).unwrap()).await.unwrap();
      assert_eq!(result.gacha_records.inserted, 1);
      assert_eq!(result.hard_challenge.inserted, 1);
      let sql_null_count: i64 = sqlx::query_scalar("SELECT count(*) FROM main.GachaRecords WHERE itemId IS NULL AND type IS NULL AND rank IS NULL")
        .fetch_one(&db).await.unwrap();
      assert_eq!(sql_null_count, 1);
      assert_eq!(export_from_pool(&db).await.unwrap(), input);
      sqlx::query("UPDATE main.HardChallenge SET single = NULL WHERE id = 1")
        .execute(&db)
        .await
        .unwrap();
      assert_eq!(export_from_pool(&db).await.err().unwrap(), LEGACY_CHALLENGE);
      // 目标库中的旧行按主键保留，不拿源端数据去补齐。
      let stats = import_into_pool(&db, &validate_snapshot(&input).unwrap()).await.unwrap();
      assert_eq!(stats.hard_challenge.conflicts, 1);
      let single: Option<String> =
        sqlx::query_scalar("SELECT single FROM main.HardChallenge WHERE id = 1")
          .fetch_one(&db)
          .await
          .unwrap();
      assert!(single.is_none());
    });
  }

  /// 忽略更新时间、JSON 格式和数字记法，保留原始值并识别真实业务变化。
  /// @since Beta v0.14.1
  #[test]
  fn business_equality_is_semantic_but_array_order_matters() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      let wish = gacha("100", "123456789", "测试");
      let abyss_row = abyss("123456789", 1);
      let combat_row = combat("123456789", 1);
      let challenge_row = challenge("123456789", 1, "一期");
      let initial = snapshot(
        vec![wish.clone()],
        vec![abyss_row.clone()],
        vec![combat_row.clone()],
        vec![challenge_row.clone()],
      );
      import_into_pool(&db, &validate_snapshot(&initial).unwrap()).await.unwrap();

      let [mut wish, mut abyss_row, mut combat_row, mut challenge_row] =
        [wish, abyss_row, combat_row, challenge_row];
      for row in [&mut wish, &mut abyss_row, &mut combat_row, &mut challenge_row] {
        row["updated"] = json!("2026-02-02 03:04:05");
      }
      abyss_row["revealRank"] = json!(r#"[ { "value": 1.2e1, "star": 5.0, "id": 10001 } ]"#);
      combat_row["stat"] = json!(serde_json::to_string_pretty(&stat()).unwrap());
      challenge_row["mp"] = json!(r#" { "has_data":false, "challenge": [], "best":null } "#);
      let same =
        snapshot(vec![wish], vec![abyss_row], vec![combat_row], vec![challenge_row.clone()]);
      let stats = import_into_pool(&db, &validate_snapshot(&same).unwrap()).await.unwrap();
      assert_eq!(stats.gacha_records.identical, 1);
      assert_eq!(stats.spiral_abyss.identical, 1);
      assert_eq!(stats.role_combat.identical, 1);
      assert_eq!(stats.hard_challenge.identical, 1);
      assert_eq!(export_from_pool(&db).await.unwrap(), initial);

      let mut details = parse_nested(&challenge_row["single"]).unwrap();
      details["challenge"][0]["monster"]["desc"].as_array_mut().unwrap().reverse();
      challenge_row["single"] = json!(details.to_string());
      let changed = snapshot(vec![], vec![], vec![], vec![challenge_row]);
      let stats = import_into_pool(&db, &validate_snapshot(&changed).unwrap()).await.unwrap();
      assert_eq!(stats.hard_challenge.conflicts, 1);
      assert_eq!(export_from_pool(&db).await.unwrap(), initial);
    });
  }

  /// 未识别的旧列和空快照均不可导出，也不可产生部分导入。
  /// @since Beta v0.14.1
  #[test]
  fn empty_export_and_legacy_schema_fail_closed() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      assert_eq!(export_from_pool(&db).await.err().unwrap(), EMPTY);
      sqlx::query("ALTER TABLE HardChallenge ADD COLUMN legacy TEXT").execute(&db).await.unwrap();
      let incoming = snapshot(vec![gacha("100", "123456789", "测试")], vec![], vec![], vec![]);
      assert!(import_into_pool(&db, &validate_snapshot(&incoming).unwrap()).await.is_err());
      assert!(export_from_pool(&db).await.is_err());
      let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM GachaRecords").fetch_one(&db).await.unwrap();
      assert_eq!(count, 0);
    });
  }

  /// 遮蔽同名临时表不能影响主库；临时触发器会使整包失败。
  /// @since Beta v0.14.1
  #[test]
  fn temporary_objects_cannot_redirect_writes() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      sqlx::query("CREATE TEMP TABLE GachaRecords(id TEXT, name TEXT)").execute(&db).await.unwrap();
      sqlx::query("INSERT INTO temp.GachaRecords VALUES('shadow', 'untouched')")
        .execute(&db)
        .await
        .unwrap();
      let input = snapshot(vec![gacha("100", "123456789", "测试")], vec![], vec![], vec![]);
      import_into_pool(&db, &validate_snapshot(&input).unwrap()).await.unwrap();
      let main_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM main.GachaRecords").fetch_one(&db).await.unwrap();
      let temp_name: String =
        sqlx::query_scalar("SELECT name FROM temp.GachaRecords WHERE id = 'shadow'")
          .fetch_one(&db)
          .await
          .unwrap();
      assert_eq!(main_count, 1);
      assert_eq!(temp_name, "untouched");
      sqlx::query("CREATE TEMP TRIGGER unsafe_trigger AFTER INSERT ON main.GachaRecords BEGIN DELETE FROM GachaRecords; END")
        .execute(&db).await.unwrap();
      let another = snapshot(vec![gacha("101", "123456789", "新增")], vec![], vec![], vec![]);
      assert!(import_into_pool(&db, &validate_snapshot(&another).unwrap()).await.is_err());
      assert!(export_from_pool(&db).await.is_err());
      let main_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM main.GachaRecords").fetch_one(&db).await.unwrap();
      assert_eq!(main_count, 1);
    });
  }

  /// 不可由本版本安全导入的本地记录也不得导出并覆盖远端快照。
  /// @since Beta v0.14.1
  #[test]
  fn export_rejects_unimportable_source() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      sqlx::query("INSERT INTO main.GachaRecords (id, uid, gachaType, uigfType, time, itemId, name, type, rank, count, updated) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)")
        .bind("100").bind("123456789").bind("301").bind("301").bind("2026-01-02 03:04:05")
        .bind("10001").bind("<img src=x onerror=alert(1)>").bind("角色").bind("5").bind("1").bind("2026-01-02 03:04:05")
        .execute(&db).await.unwrap();
      assert_eq!(export_from_pool(&db).await.err().unwrap(), INVALID);
      let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM main.GachaRecords").fetch_one(&db).await.unwrap();
      assert_eq!(count, 1);
    });
  }

  /// 不导出其他表中的数据。
  /// @since Beta v0.14.1
  #[test]
  fn export_never_selects_unlisted_tables() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      sqlx::query("INSERT INTO main.GachaBRecords(id,name) VALUES('unrelated','PRIVATE_SENTINEL')")
        .execute(&db)
        .await
        .unwrap();
      sqlx::query(
        "INSERT INTO main.UserAccount(uid,cookie) VALUES('unrelated','CREDENTIAL_SENTINEL')",
      )
      .execute(&db)
      .await
      .unwrap();
      let input = snapshot(vec![gacha("100", "123456789", "测试")], vec![], vec![], vec![]);
      import_into_pool(&db, &validate_snapshot(&input).unwrap()).await.unwrap();
      let exported = export_from_pool(&db).await.unwrap();
      assert!(!exported.contains("PRIVATE_SENTINEL"));
      assert!(!exported.contains("GachaBRecords"));
      assert!(!exported.contains("CREDENTIAL_SENTINEL"));
      assert!(!exported.contains("UserAccount"));
    });
  }

  /// 校验器拒绝重复键、重复主键、未知列、格式欺骗及超大包。
  /// @since Beta v0.14.1
  #[test]
  fn malicious_or_ambiguous_input_is_rejected() {
    let duplicate = r#"{"version":1,"version":1,"tables":{}}"#;
    assert!(validate_snapshot(duplicate).is_err());
    let duplicated_id = snapshot(
      vec![gacha("100", "111111111", "一"), gacha("100", "222222222", "二")],
      vec![],
      vec![],
      vec![],
    );
    assert!(validate_snapshot(&duplicated_id).is_err());
    let mut bad = gacha("100", "123456789", "一");
    bad["extra"] = json!("should not be dropped");
    assert!(validate_snapshot(&snapshot(vec![bad], vec![], vec![], vec![])).is_err());
    assert_eq!(validate_snapshot(&"x".repeat(MAX_SNAPSHOT_BYTES + 1)).unwrap_err(), LIMIT);
    let mut nested_duplicate = challenge("123456789", 1, "一期");
    nested_duplicate["mp"] = json!(r#"{"best":null,"best":null,"has_data":false,"challenge":[]}"#);
    assert!(validate_snapshot(&snapshot(vec![], vec![], vec![], vec![nested_duplicate])).is_err());
  }

  /// 行数、业务数组和字段字节上限分别检查。
  /// @since Beta v0.14.1
  #[test]
  fn snapshot_collection_and_field_limits_are_enforced() {
    let too_many = snapshot(vec![Value::Null; MAX_ROWS], vec![Value::Null], vec![], vec![]);
    assert_eq!(validate_snapshot(&too_many).unwrap_err(), LIMIT);
    let mut oversized = abyss("123456789", 1);
    oversized["floors"] = json!(" ".repeat(MAX_FIELD_BYTES + 1));
    assert_eq!(
      validate_snapshot(&snapshot(vec![], vec![oversized], vec![], vec![])).unwrap_err(),
      LIMIT
    );
    let mut oversized = challenge("123456789", 1, "一期");
    let mut details = parse_nested(&oversized["single"]).unwrap();
    details["challenge"][0]["monster"]["desc"] = json!(vec!["描述"; MAX_ARRAY + 1]);
    oversized["single"] = json!(details.to_string());
    assert_eq!(
      validate_snapshot(&snapshot(vec![], vec![], vec![], vec![oversized])).unwrap_err(),
      INVALID
    );
  }

  /// 安全的本地与官方静态路径均可使用；拒绝任意域、动态路径和 URL 归一化欺骗。
  /// @since Beta v0.14.1
  #[test]
  fn image_boundaries_allow_only_known_static_paths() {
    for url in [
      "",
      "/icon/enemy/test.webp",
      "/icon/element/火元素.webp",
      "/WIKI/character/10001.webp",
      "https://act-webstatic.mihoyo.com/game_record/genshin/avatar_prop/avatar_prop_2000.png",
      "https://act-webstatic.hoyoverse.com:443/game_record/genshin/enemy_icon/UI_MonsterIcon_Test.webp",
      "https://webstatic.mihoyo.com/upload/static-resource/2022/02/24/abc_123.jpg",
      "https://fastcdn.hoyoverse.com/static-resource-v2/2026/01/02/abc_123.jpeg",
    ] {
      assert!(safe_image(&json!(url)), "known image rejected: {url}");
    }
    for url in [
      "https://example.com/a.png",
      "//example.com/a.png",
      "data:image/svg+xml,x",
      "/icon/../a.png",
      "/icon/%2e%2e/a.png",
      "/icon//a.png",
      "/@fs/a.png",
      "http://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/x.png",
      "https://act-webstatic.mihoyo.com.evil.example/game_record/genshin/enemy_icon/x.png",
      "https://act-webstatic.mihoyo.com:444/game_record/genshin/enemy_icon/x.png",
      "https://user@act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/x.png",
      "https://@act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/x.png",
      "https://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/x.png?",
      "https://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/x.png#",
      "https://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/x.svg",
      "https://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/../x.png",
      "https://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon/%2e%2e/x.png",
      r"https://act-webstatic.mihoyo.com/game_record/genshin/enemy_icon\x.png",
      "https://act-webstatic.mihoyo.com/api/redirect/x.png",
      "https://fastcdn.mihoyo.com/static-resource-v2/not/dated/icon.png",
      "https://upload-bbs.mihoyo.com/upload/2026/01/02/user-content.jpg",
    ] {
      assert!(!safe_image(&json!(url)), "dangerous image accepted: {url}");
    }
    let mut row = challenge("123456789", 1, "一期");
    let mut details = parse_nested(&row["single"]).unwrap();
    details["challenge"][0]["monster"]["icon"] = json!("https://example.com/a.png");
    row["single"] = json!(details.to_string());
    assert!(validate_snapshot(&snapshot(vec![], vec![], vec![], vec![row])).is_err());
  }

  /// 导出不泄露储存中的阵容外链，合并不覆盖本机外链，也不误报冲突。
  /// @since Beta v0.14.1
  #[test]
  fn lineup_links_stay_local_and_do_not_cause_conflicts() {
    tauri::async_runtime::block_on(async {
      let db = pool().await;
      let original = combat("123456789", 1);
      let input = snapshot(vec![], vec![], vec![original.clone()], vec![]);
      import_into_pool(&db, &validate_snapshot(&input).unwrap()).await.unwrap();
      let mut detail = parse_nested(&original["detail"]).unwrap();
      detail["lineup_link"] = json!("https://example.invalid/private?token=LOCAL_LINK_SENTINEL");
      let local_detail = detail.to_string();
      sqlx::query("UPDATE main.RoleCombat SET detail = $1 WHERE uid = $2 AND id = $3")
        .bind(&local_detail)
        .bind("123456789")
        .bind(1_i64)
        .execute(&db)
        .await
        .unwrap();
      let exported = export_from_pool(&db).await.unwrap();
      assert_eq!(exported, input);
      assert!(!exported.contains("LOCAL_LINK_SENTINEL"));
      let stats = import_into_pool(&db, &validate_snapshot(&exported).unwrap()).await.unwrap();
      assert_eq!(stats.role_combat.identical, 1);
      assert_eq!(stats.role_combat.conflicts, 0);
      let retained: String =
        sqlx::query_scalar("SELECT detail FROM main.RoleCombat WHERE uid = $1 AND id = $2")
          .bind("123456789")
          .bind(1_i64)
          .fetch_one(&db)
          .await
          .unwrap();
      assert_eq!(retained, local_detail);
    });
  }

  /// 保留安全文字、颜色和换行；拒绝导入阵容外链和旧恢复路径无法安全转义的文本。
  /// @since Beta v0.14.1
  #[test]
  fn text_and_unused_link_boundaries() {
    assert!(safe_text(&json!(
      "D's & E<color=#3399CCFF>50%<br /><color=#123456>测试</color></color>"
    )));
    for text in [
      "<img src=x onerror=alert(1)>",
      "<color=red>text</color>",
      "<br onload=x>",
      "{LINK#\" onclick=\"x}a{/LINK}",
      "</color>",
    ] {
      assert!(!safe_text(&json!(text)), "dangerous markup accepted");
    }
    assert!(!legacy_backup_text(&json!("D's")));
    let mut row = combat("123456789", 1);
    let mut detail = parse_nested(&row["detail"]).unwrap();
    detail["lineup_link"] =
      json!("https://example.com/private?not_a_real_token=sensitive_sentinel");
    row["detail"] = json!(detail.to_string());
    assert_eq!(
      validate_snapshot(&snapshot(vec![], vec![], vec![row], vec![])).unwrap_err(),
      UNSUPPORTED_LINEUP
    );
  }
}
