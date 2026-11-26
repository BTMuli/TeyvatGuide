//! 显式授权的隔离实库与真实 WebDAV 验收；默认忽略，绝不定位应用数据库。
//! 在 sync_data.rs 文件级以 #[cfg(test)] #[path = "sync_e2e_tests.rs"] mod e2e_tests; 接入。
//! SOURCE 必须是已完成备份、无 WAL 的独立副本；WORKDIR 必须是新建、空且私有的目录。
//! DAV_CONFIG 必须是 {address,username,password}，仅接受 /e2e-<random>/ 或 /dav/e2e-<random>/。
//! 本测试保留私有接收库与专用远端对象供验收，不清理或打印任何用户数据、路径及秘密。
//! @since Beta v0.14.2

use super::*;
use crate::sync_webdav;
use reqwest::{Client, Method, StatusCode, header, redirect::Policy};
use serde::Deserialize as DeriveDeserialize;
use sha2::{Digest, Sha256};
use sqlx::{
  ConnectOptions,
  sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use std::{
  fs::{self, File, OpenOptions},
  io::Read,
  path::{Path, PathBuf},
  time::Duration,
};
use url::Url;

/// 错误中只能保存固定阶段与固定类别；不携带底层错误、记录或配置。
/// @since Beta v0.14.2
type E2eResult<T> = Result<T, (&'static str, &'static str)>;

/// 仅从显式环境变量读取的测试凭证，不实现 Debug。
/// @since Beta v0.14.2
#[derive(DeriveDeserialize)]
#[serde(deny_unknown_fields)]
struct DavConfig {
  address: String,
  username: String,
  password: String,
}

/// 经路径与测试目录限制后的单次运行环境，不实现 Debug。
/// @since Beta v0.14.2
struct Environment {
  source: PathBuf,
  workdir: PathBuf,
  dav: DavConfig,
  base: Url,
}

/// 只输出固定阶段和固定错误类别，避免 Result/Value 的 Debug 泄露。
/// @since Beta v0.14.2
fn finish<T>(result: E2eResult<T>) -> T {
  result.unwrap_or_else(|(stage, category)| panic!("E2E {stage} {category}"))
}

/// 把任意底层错误丢弃，只保留调用点指定的固定类别。
/// @since Beta v0.14.2
fn fixed<T, E>(result: Result<T, E>, stage: &'static str, category: &'static str) -> E2eResult<T> {
  result.map_err(|_| (stage, category))
}

/// 条件断言不输出被比较的值、主键或秘密。
/// @since Beta v0.14.2
fn ensure(condition: bool, stage: &'static str, category: &'static str) -> E2eResult<()> {
  if condition { Ok(()) } else { Err((stage, category)) }
}

/// 业务/传输错误仅映射为白名单类别，绝不输出返回文本。
/// @since Beta v0.14.2
fn checked<T>(result: Result<T, String>, stage: &'static str) -> E2eResult<T> {
  result.map_err(|error| {
    let category = match error.split('：').next().unwrap_or("") {
      "SYNC_INVALID" => "SYNC_INVALID",
      "SYNC_SCHEMA" => "SYNC_SCHEMA",
      "SYNC_DATABASE" => "SYNC_DATABASE",
      "SYNC_LIMIT" => "SYNC_LIMIT",
      "SYNC_EMPTY" => "SYNC_EMPTY",
      "SYNC_LEGACY_CHALLENGE" => "SYNC_LEGACY_CHALLENGE",
      "SYNC_UNSUPPORTED_LINEUP" => "SYNC_UNSUPPORTED_LINEUP",
      "SYNC_VERSION_UNSUPPORTED" => "SYNC_VERSION_UNSUPPORTED",
      "WEBDAV_AUTH" => "WEBDAV_AUTH",
      "WEBDAV_NETWORK" => "WEBDAV_NETWORK",
      "WEBDAV_TIMEOUT" => "WEBDAV_TIMEOUT",
      "WEBDAV_UNSUPPORTED" => "WEBDAV_UNSUPPORTED",
      "WEBDAV_CONFLICT" => "WEBDAV_CONFLICT",
      "WEBDAV_INTEGRITY" => "WEBDAV_INTEGRITY",
      "WEBDAV_INVALID_METADATA" => "WEBDAV_INVALID_METADATA",
      "WEBDAV_NOT_FOUND" => "WEBDAV_NOT_FOUND",
      "WEBDAV_PUBLISH_UNKNOWN" => "WEBDAV_PUBLISH_UNKNOWN",
      "WEBDAV_VERSION_UNSUPPORTED" => "WEBDAV_VERSION_UNSUPPORTED",
      _ => "OPERATION_FAILED",
    };
    (stage, category)
  })
}

/// 三个变量必须同时完整；仅允许绝对隔离路径和专用 DAV 子目录。
/// Windows 的私有目录 ACL 与 source 的独立复制由运行本测试的主线程预先核验。
/// @since Beta v0.14.2
fn environment() -> E2eResult<Environment> {
  let source = fixed(std::env::var("TG_SYNC_E2E_SOURCE"), "config", "ENV_REQUIRED")?;
  let workdir = fixed(std::env::var("TG_SYNC_E2E_WORKDIR"), "config", "ENV_REQUIRED")?;
  let config = fixed(std::env::var("TG_SYNC_E2E_DAV_CONFIG"), "config", "ENV_REQUIRED")?;
  let dav: DavConfig = fixed(serde_json::from_str(&config), "config", "DAV_CONFIG_INVALID")?;
  let base = fixed(Url::parse(&dav.address), "config", "DAV_CONFIG_INVALID")?;
  let parts: Vec<_> = base.path().split('/').collect();
  let isolated_segment = match parts.as_slice() {
    ["", segment, ""] => Some(*segment),
    ["", "dav", segment, ""] => Some(*segment),
    _ => None,
  };
  ensure(
    matches!(base.scheme(), "http" | "https")
      && base.has_host()
      && base.username().is_empty()
      && base.password().is_none()
      && base.query().is_none()
      && base.fragment().is_none()
      && !dav.address.contains('@')
      && !dav.address.chars().any(char::is_control)
      && isolated_segment.and_then(|segment| segment.strip_prefix("e2e-")).is_some_and(|suffix| {
        (8..=80).contains(&suffix.len())
          && suffix.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
      })
      && !dav.username.is_empty()
      && dav.username.len() <= 1024
      && !dav.username.contains(':')
      && !dav.username.chars().any(char::is_control)
      && !dav.password.is_empty()
      && dav.password.len() <= 4096
      && !dav.password.chars().any(char::is_control),
    "config",
    "ISOLATED_DAV_REQUIRED",
  )?;
  let source = PathBuf::from(source);
  let workdir = PathBuf::from(workdir);
  ensure(source.is_absolute() && workdir.is_absolute(), "config", "ABSOLUTE_PATH_REQUIRED")?;
  let source_meta = fixed(fs::symlink_metadata(&source), "config", "SOURCE_INVALID")?;
  let work_meta = fixed(fs::symlink_metadata(&workdir), "config", "WORKDIR_INVALID")?;
  ensure(
    source_meta.is_file() && !source_meta.file_type().is_symlink(),
    "config",
    "SOURCE_INVALID",
  )?;
  ensure(work_meta.is_dir() && !work_meta.file_type().is_symlink(), "config", "WORKDIR_INVALID")?;
  let source = fixed(fs::canonicalize(source), "config", "SOURCE_INVALID")?;
  let workdir = fixed(fs::canonicalize(workdir), "config", "WORKDIR_INVALID")?;
  // 防止显式变量误指向默认应用数据位置；本测试没有任何回退查找。
  ensure(
    !source.components().any(|part| {
      let part = part.as_os_str().to_string_lossy();
      part.eq_ignore_ascii_case("AppData") || part.eq_ignore_ascii_case("Application Support")
    }) && !source.starts_with(&workdir),
    "config",
    "ISOLATED_SOURCE_REQUIRED",
  )?;
  #[cfg(unix)]
  {
    use std::os::unix::fs::{MetadataExt, PermissionsExt};
    ensure(source_meta.nlink() == 1, "config", "ISOLATED_SOURCE_REQUIRED")?;
    ensure(work_meta.permissions().mode() & 0o077 == 0, "config", "PRIVATE_WORKDIR_REQUIRED")?;
  }
  let mut entries = fixed(fs::read_dir(&workdir), "config", "WORKDIR_INVALID")?;
  ensure(entries.next().is_none(), "config", "EMPTY_WORKDIR_REQUIRED")?;
  no_source_sidecars(&source)?;
  // 不复用上次运行的接收库；独占标记也阻止两个本测试并行使用相同目录。
  private_file(&workdir.join(".tg-sync-e2e-owned"))?;
  Ok(Environment { source, workdir, dav, base })
}

/// 只读 immutable 会忽略 WAL，故拒绝未封口的副本，而不是悄悄少读数据。
/// @since Beta v0.14.2
fn no_source_sidecars(source: &Path) -> E2eResult<()> {
  for suffix in ["-wal", "-shm", "-journal"] {
    let mut sidecar = source.as_os_str().to_os_string();
    sidecar.push(suffix);
    match fs::symlink_metadata(PathBuf::from(sidecar)) {
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
      _ => return Err(("source", "SOURCE_SIDECAR_FORBIDDEN")),
    }
  }
  Ok(())
}

/// 使用 create_new 创建本次专属文件；Unix 文件权限显式限制为 0600。
/// @since Beta v0.14.2
fn private_file(path: &Path) -> E2eResult<()> {
  let mut options = OpenOptions::new();
  options.write(true).create_new(true);
  #[cfg(unix)]
  {
    use std::os::unix::fs::OpenOptionsExt;
    options.mode(0o600);
  }
  fixed(options.open(path), "workdir", "CREATE_EXCLUSIVE_FAILED")?;
  Ok(())
}

/// 流式摘要仅用于内存比较，绝不输出摘要、文件路径或文件内容。
/// @since Beta v0.14.2
fn source_hash(path: &Path) -> E2eResult<Vec<u8>> {
  let mut file = fixed(File::open(path), "source", "HASH_READ_FAILED")?;
  let mut hash = Sha256::new();
  let mut buffer = [0u8; 64 * 1024];
  loop {
    let size = fixed(file.read(&mut buffer), "source", "HASH_READ_FAILED")?;
    if size == 0 {
      break;
    }
    hash.update(&buffer[..size]);
  }
  Ok(hash.finalize().to_vec())
}

/// 独立只读连接，不执行建表、journal_mode 切换或任何业务写入，不记录语句。
/// @since Beta v0.14.2
async fn source_pool(env: &Environment) -> E2eResult<SqlitePool> {
  let options = SqliteConnectOptions::new()
    .filename(&env.source)
    .create_if_missing(false)
    .read_only(true)
    .immutable(true)
    .pragma("query_only", "ON")
    .pragma("temp_store", "MEMORY")
    .disable_statement_logging();
  fixed(
    SqlitePoolOptions::new().max_connections(1).connect_with(options).await,
    "source",
    "OPEN_READ_ONLY_FAILED",
  )
}

/// 只从编译期 Column/Kind 白名单生成磁盘接收库；不引入账号、设置或其他表。
/// fault 指定表的 CHECK(0) 专供验证后表失败时前表插入回滚；扩列仅存在于专用接收库。
/// @since Beta v0.14.2
async fn receiver(
  env: &Environment,
  name: &'static str,
  fault: Option<usize>,
) -> E2eResult<SqlitePool> {
  ensure(
    [
      "receiver.sqlite",
      "invalid.sqlite",
      "rollback.sqlite",
      "history.sqlite",
      "merge.sqlite",
      "new_schema.sqlite",
    ]
    .contains(&name),
    "receiver",
    "NAME_INVALID",
  )?;
  let path = env.workdir.join(name);
  private_file(&path)?;
  let options =
    SqliteConnectOptions::new().filename(path).create_if_missing(false).disable_statement_logging();
  let pool = fixed(
    SqlitePoolOptions::new().max_connections(1).connect_with(options).await,
    "receiver",
    "OPEN_FAILED",
  )?;
  for (index, table) in TABLES.iter().enumerate() {
    let mut columns = table
      .columns
      .iter()
      .map(|column| {
        let kind = match column.kind {
          Kind::Text | Kind::Json => "TEXT",
          Kind::Integer => "INTEGER",
          Kind::Boolean => "BOOLEAN",
        };
        let nullable = if column.nullable { "" } else { " NOT NULL" };
        format!("\"{}\" {kind}{nullable}", column.name)
      })
      .collect::<Vec<_>>();
    if name == "new_schema.sqlite" && table.name == "GachaRecords" {
      columns.push("local_note TEXT".into());
      columns.push("local_origin TEXT NOT NULL DEFAULT 'vm-new-db'".into());
    }
    let mut keys = table.columns.iter().filter(|column| column.pk > 0).collect::<Vec<_>>();
    keys.sort_by_key(|column| column.pk);
    columns.push(format!(
      "PRIMARY KEY ({})",
      keys.iter().map(|column| format!("\"{}\"", column.name)).collect::<Vec<_>>().join(", ")
    ));
    if fault == Some(index) {
      columns.push("CHECK (0)".into());
    }
    let sql = format!("CREATE TABLE main.\"{}\" ({})", table.name, columns.join(", "));
    fixed(sqlx::query(&sql).execute(&pool).await, "receiver", "CREATE_SCHEMA_FAILED")?;
  }
  let names: Vec<String> = fixed(
    sqlx::query_scalar("SELECT name FROM main.sqlite_master WHERE type = 'table'")
      .fetch_all(&pool)
      .await,
    "receiver",
    "SCHEMA_READ_FAILED",
  )?;
  ensure(
    names.len() == TABLES.len()
      && names.iter().all(|name| TABLES.iter().any(|table| table.name == name)),
    "receiver",
    "FOUR_TABLES_REQUIRED",
  )?;
  let mut tx = fixed(pool.begin().await, "receiver", "BEGIN_FAILED")?;
  for table in TABLES {
    checked(check_schema(&mut tx, table, SchemaUse::Import).await, "receiver")?;
  }
  fixed(tx.rollback().await, "receiver", "ROLLBACK_FAILED")?;
  Ok(pool)
}

/// 获取四表计数，不读取或输出其他表中的账户字段。
/// @since Beta v0.14.2
async fn counts(pool: &SqlitePool) -> E2eResult<Vec<u64>> {
  let mut counts = Vec::new();
  for table in TABLES {
    let sql = format!("SELECT count(*) FROM main.\"{}\"", table.name);
    let count: i64 =
      fixed(sqlx::query_scalar(&sql).fetch_one(pool).await, "counts", "QUERY_FAILED")?;
    ensure(count >= 0, "counts", "INVALID_COUNT")?;
    counts.push(count as u64);
  }
  Ok(counts)
}

/// 独立按 JSON 语义比较数值、对象与有序数组，不使用待测业务相等函数。
/// @since Beta v0.14.2
fn semantic_equal(left: &Value, right: &Value) -> bool {
  match (left, right) {
    (Value::Number(left), Value::Number(right)) => left.as_f64() == right.as_f64(),
    (Value::Array(left), Value::Array(right)) => {
      left.len() == right.len()
        && left.iter().zip(right).all(|(left, right)| semantic_equal(left, right))
    }
    (Value::Object(left), Value::Object(right)) => {
      left.len() == right.len()
        && left
          .iter()
          .all(|(key, left)| right.get(key).is_some_and(|right| semantic_equal(left, right)))
    }
    _ => left == right,
  }
}

/// 在同一读取事务检查结构并逐行比较全部同步列，避免重新导出掩盖接收库的错误值。
/// @since Beta v0.14.2
async fn verify_rows(pool: &SqlitePool, expected: &Records, stage: &'static str) -> E2eResult<()> {
  ensure(expected.len() == TABLES.len(), stage, "TABLE_COUNT_MISMATCH")?;
  let mut tx = fixed(pool.begin().await, stage, "BEGIN_FAILED")?;
  for (index, table) in TABLES.iter().enumerate() {
    let projection = checked(check_schema(&mut tx, table, SchemaUse::Export).await, stage)?;
    let order = if table.name == "GachaRecords" { "\"id\"" } else { "\"uid\", \"id\"" };
    let columns = selection(table, &projection);
    let sql = format!("SELECT {columns} FROM main.\"{}\" ORDER BY {order}", table.name);
    let rows = fixed(sqlx::query(&sql).fetch_all(&mut *tx).await, stage, "ROW_READ_FAILED")?;
    ensure(rows.len() == expected[index].len(), stage, "ROW_COUNT_MISMATCH")?;
    for (actual, expected) in rows.iter().zip(&expected[index]) {
      let actual = checked(decode_row(table, actual), stage)?;
      for column in table.columns {
        let left = actual.get(column.name).ok_or((stage, "COLUMN_MISSING"))?;
        let right = expected.get(column.name).ok_or((stage, "COLUMN_MISSING"))?;
        let equal = if column.kind == Kind::Json {
          let left: Value = fixed(
            serde_json::from_str(left.as_str().ok_or((stage, "JSON_TYPE_INVALID"))?),
            stage,
            "JSON_INVALID",
          )?;
          let right: Value = fixed(
            serde_json::from_str(right.as_str().ok_or((stage, "JSON_TYPE_INVALID"))?),
            stage,
            "JSON_INVALID",
          )?;
          semantic_equal(&left, &right)
        } else {
          semantic_equal(left, right)
        };
        ensure(equal, stage, "BUSINESS_MISMATCH")?;
      }
    }
    eprintln!("E2E {stage} {} rows={}", table.name, rows.len());
  }
  fixed(tx.rollback().await, stage, "ROLLBACK_FAILED")
}

/// 首次插入/重入的统计必须逐表准确；错误不包含任何记录。
/// @since Beta v0.14.2
fn verify_stats(stats: &SyncImportStats, expected: &[u64], repeated: bool) -> E2eResult<()> {
  let all = [&stats.gacha_records, &stats.spiral_abyss, &stats.role_combat, &stats.hard_challenge];
  ensure(expected.len() == all.len(), "stats", "TABLE_COUNT_MISMATCH")?;
  for (stats, count) in all.iter().zip(expected) {
    ensure(
      stats.conflicts == 0
        && if repeated {
          stats.inserted == 0 && stats.identical == *count
        } else {
          stats.inserted == *count && stats.identical == 0
        },
      "stats",
      "IMPORT_STATS_MISMATCH",
    )?;
  }
  Ok(())
}

/// 传入实际导出步骤或已知快照，在生产发布路径中完成连接预检和写入。
/// @since Beta v0.14.2
async fn publish(
  env: &Environment,
  load_snapshot: impl std::future::Future<Output = Result<String, String>>,
) -> E2eResult<String> {
  checked(
    sync_webdav::upload_snapshot(
      &env.dav.address,
      env.dav.username.clone(),
      env.dav.password.clone(),
      false,
      true,
      load_snapshot,
    )
    .await,
    "upload",
  )
}

/// 重发已校验的快照也经过同一条发布路径。
/// @since Beta v0.14.2
async fn upload(env: &Environment, snapshot: &str) -> E2eResult<String> {
  publish(env, async { Ok(snapshot.to_owned()) }).await
}

/// 下载当前或独立历史清单，仍使用实际生产传输函数。
/// @since Beta v0.14.2
async fn download(env: &Environment, id: Option<String>) -> Result<String, String> {
  sync_webdav::download_snapshot(
    &env.dav.address,
    env.dav.username.clone(),
    env.dav.password.clone(),
    false,
    true,
    id,
  )
  .await
}

/// 与实际流程相同：传输校验、完整业务验证全部成功后才调用事务导入。
/// @since Beta v0.14.2
async fn receive(
  env: &Environment,
  pool: &SqlitePool,
  id: Option<String>,
) -> E2eResult<SyncImportStats> {
  let snapshot = checked(download(env, id).await, "download")?;
  let records = checked(validate_snapshot(&snapshot), "validate")?;
  checked(import_into_pool(pool, &records).await, "import")
}

/// 独立检查传输信封和列白名单，不读取真实库账号字段，也不依赖导入器丢弃额外数据。
/// @since Beta v0.14.2
fn verify_export_whitelist(snapshot: &str) -> E2eResult<()> {
  let root: Value = fixed(serde_json::from_str(snapshot), "whitelist", "JSON_INVALID")?;
  let root = root.as_object().ok_or(("whitelist", "ENVELOPE_INVALID"))?;
  ensure(
    root.len() == 2 && root.get("version").and_then(Value::as_i64) == Some(1),
    "whitelist",
    "ENVELOPE_INVALID",
  )?;
  let tables =
    root.get("tables").and_then(Value::as_object).ok_or(("whitelist", "ENVELOPE_INVALID"))?;
  ensure(tables.len() == 4, "whitelist", "FOUR_TABLES_REQUIRED")?;
  for table in TABLES {
    let rows =
      tables.get(table.name).and_then(Value::as_array).ok_or(("whitelist", "TABLE_INVALID"))?;
    for row in rows {
      let row = row.as_object().ok_or(("whitelist", "ROW_INVALID"))?;
      ensure(
        row.len() == table.columns.len()
          && row.keys().all(|key| table.columns.iter().any(|column| column.name == key)),
        "whitelist",
        "COLUMN_NOT_ALLOWED",
      )?;
    }
  }
  eprintln!("E2E whitelist_verified");
  Ok(())
}

/// 将同一真实 v1 快照两次拉入扩列接收库，确保默认值和本地标记不被同步改写。
/// @since Beta v0.14.2
async fn schema_skew(
  env: &Environment,
  expected: &Records,
  expected_counts: &[u64],
  snapshot_id: &str,
) -> E2eResult<()> {
  let gacha_rows = expected.first().ok_or(("schema_skew", "TABLE_COUNT_MISMATCH"))?;
  let Some(first) = gacha_rows.first() else {
    eprintln!("E2E schema_skew_skipped_empty GachaRecords rows=0");
    return Ok(());
  };
  let id = first.get("id").and_then(Value::as_str).ok_or(("schema_skew", "ROW_KEY_INVALID"))?;
  let pool = receiver(env, "new_schema.sqlite", None).await?;
  let first_stage = "schema_skew_first";
  let repeated_stage = "schema_skew_repeat";
  let default_sql =
    "SELECT count(*) FROM main.GachaRecords WHERE local_note IS NULL AND local_origin = $1";
  let default_origin = "vm-new-db";
  let local_note = "e2e-local-note";
  let local_origin = "e2e-local-origin";

  let inserted = receive(env, &pool, Some(snapshot_id.into())).await?;
  verify_stats(&inserted, expected_counts, false)?;
  verify_rows(&pool, expected, first_stage).await?;
  let defaults: i64 = fixed(
    sqlx::query_scalar(default_sql).bind(default_origin).fetch_one(&pool).await,
    first_stage,
    "LOCAL_COLUMNS_READ_FAILED",
  )?;
  ensure(defaults == gacha_rows.len() as i64, first_stage, "LOCAL_DEFAULT_MISMATCH")?;

  let updated = fixed(
    sqlx::query("UPDATE main.GachaRecords SET local_note = $1, local_origin = $2 WHERE id = $3")
      .bind(local_note)
      .bind(local_origin)
      .bind(id)
      .execute(&pool)
      .await,
    "schema_skew_marker",
    "LOCAL_MARKER_WRITE_FAILED",
  )?;
  ensure(updated.rows_affected() == 1, "schema_skew_marker", "LOCAL_MARKER_COUNT_MISMATCH")?;

  let repeated = receive(env, &pool, Some(snapshot_id.into())).await?;
  verify_stats(&repeated, expected_counts, true)?;
  verify_rows(&pool, expected, repeated_stage).await?;
  let marker: i64 = fixed(
    sqlx::query_scalar("SELECT count(*) FROM main.GachaRecords WHERE id = $1 AND local_note = $2 AND local_origin = $3")
      .bind(id)
      .bind(local_note)
      .bind(local_origin)
      .fetch_one(&pool)
      .await,
    repeated_stage,
    "LOCAL_COLUMNS_READ_FAILED",
  )?;
  ensure(marker == 1, repeated_stage, "LOCAL_MARKER_MISMATCH")?;
  let defaults_after: i64 = fixed(
    sqlx::query_scalar(default_sql).bind(default_origin).fetch_one(&pool).await,
    repeated_stage,
    "LOCAL_COLUMNS_READ_FAILED",
  )?;
  ensure(defaults_after == defaults - 1, repeated_stage, "LOCAL_DEFAULT_MISMATCH")?;
  pool.close().await;
  eprintln!("E2E schema_skew_acceptance_complete");
  Ok(())
}

/// 核心真实库 roundtrip；安全故障验收在此之后运行，不用合成数据库替代源库。
/// @since Beta v0.14.2
async fn roundtrip(env: &Environment) -> E2eResult<()> {
  ensure(
    TABLES.iter().map(|table| table.name).eq([
      "GachaRecords",
      "SpiralAbyss",
      "RoleCombat",
      "HardChallenge",
    ]),
    "whitelist",
    "FOUR_TABLES_REQUIRED",
  )?;
  let source = source_pool(env).await?;
  let expected_counts = counts(&source).await?;
  let snapshot = checked(export_from_pool(&source).await, "export")?;
  verify_export_whitelist(&snapshot)?;
  let expected = checked(validate_snapshot(&snapshot), "validate_source")?;
  ensure(
    expected.iter().map(Vec::len).map(|count| count as u64).eq(expected_counts.iter().copied()),
    "export",
    "SOURCE_COUNT_MISMATCH",
  )?;
  // validate_snapshot 严格限制根对象、四个表和每行全部列；不读取账号表做比较。
  let receiver = receiver(env, "receiver.sqlite", None).await?;
  let absent = download(env, None).await;
  ensure(
    matches!(absent, Err(ref error) if error.starts_with("WEBDAV_NOT_FOUND：")),
    "preflight",
    "FRESH_DAV_REQUIRED",
  )?;
  let mut exported_with_bad_credentials = false;
  let rejected = sync_webdav::upload_snapshot(
    &env.dav.address,
    env.dav.username.clone(),
    format!("wrong-{}", uuid::Uuid::new_v4()),
    false,
    true,
    async {
      exported_with_bad_credentials = true;
      Err(INVALID.to_owned())
    },
  )
  .await;
  ensure(
    !exported_with_bad_credentials
      && matches!(rejected, Err(ref error) if error.starts_with("WEBDAV_AUTH：")),
    "preflight",
    "AUTH_DID_NOT_PRECEDE_EXPORT",
  )?;
  eprintln!("E2E authentication_failure_before_export");
  let old_id = publish(env, export_from_pool(&source)).await?;
  source.close().await;
  let latest = checked(download(env, None).await, "download_latest")?;
  ensure(latest == snapshot, "download_latest", "TRANSPORT_MISMATCH")?;
  let inserted = receive(env, &receiver, None).await?;
  verify_stats(&inserted, &expected_counts, false)?;
  verify_rows(&receiver, &expected, "first_import").await?;
  let repeated = receive(env, &receiver, None).await?;
  verify_stats(&repeated, &expected_counts, true)?;
  verify_rows(&receiver, &expected, "repeat_import").await?;
  schema_skew(env, &expected, &expected_counts, &old_id).await?;
  let new_id = upload(env, &snapshot).await?;
  ensure(new_id != old_id, "republish", "SNAPSHOT_ID_REUSED")?;
  let historical = checked(download(env, Some(old_id.clone())).await, "download_history")?;
  ensure(historical == snapshot, "download_history", "TRANSPORT_MISMATCH")?;
  let historical_stats = receive(env, &receiver, Some(old_id.clone())).await?;
  verify_stats(&historical_stats, &expected_counts, true)?;
  verify_rows(&receiver, &expected, "history_import").await?;
  eprintln!("E2E roundtrip_complete");
  safety_faults(env, &receiver, &snapshot, &expected, &expected_counts, &old_id, &new_id).await?;
  merge_semantics(env, &snapshot, &expected, &expected_counts).await?;
  receiver.close().await;
  Ok(())
}

/// 故障注入只操作本次专用目录中的固定 current 或已确认 UUID 的数据对象。
/// @since Beta v0.14.2
fn resource_url(env: &Environment, name: &str) -> E2eResult<Url> {
  let snapshot = name
    .strip_prefix("teyvatguide-sync-")
    .and_then(|name| name.strip_suffix(".json"))
    .and_then(|id| uuid::Uuid::parse_str(id).ok())
    .is_some_and(|id| id.get_version_num() == 4 && name == format!("teyvatguide-sync-{id}.json"));
  ensure(name == "teyvatguide-sync-current.json" || snapshot, "fault", "RESOURCE_NOT_OWNED")?;
  let mut url = env.base.clone();
  url.path_segments_mut().map_err(|_| ("fault", "URL_INVALID"))?.pop_if_empty().push(name);
  Ok(url)
}

/// 独立客户端仅供显式故障注入；正常上传下载始终走生产传输函数。
/// @since Beta v0.14.2
fn fault_client() -> E2eResult<Client> {
  fixed(
    Client::builder()
      .no_proxy()
      .redirect(Policy::none())
      .connect_timeout(Duration::from_secs(15))
      .timeout(Duration::from_secs(120))
      .build(),
    "fault",
    "CLIENT_FAILED",
  )
}

/// 有界读取本次对象及强 ETag；错误不保留 URL、响应体或认证信息。
/// @since Beta v0.14.2
async fn remote_resource(
  env: &Environment,
  name: &str,
) -> E2eResult<(Vec<u8>, header::HeaderValue)> {
  let client = fault_client()?;
  let mut response = fixed(
    client
      .get(resource_url(env, name)?)
      .basic_auth(&env.dav.username, Some(&env.dav.password))
      .header(header::ACCEPT_ENCODING, "identity")
      .header(header::CACHE_CONTROL, "no-cache, no-store")
      .send()
      .await,
    "fault",
    "NETWORK_FAILED",
  )?;
  ensure(response.status() == StatusCode::OK, "fault", "GET_FAILED")?;
  let etag =
    response.headers().get(header::ETAG).cloned().ok_or(("fault", "STRONG_ETAG_REQUIRED"))?;
  let bytes = etag.as_bytes();
  ensure(
    bytes.len() >= 2
      && bytes[0] == b'"'
      && bytes[bytes.len() - 1] == b'"'
      && bytes[1..bytes.len() - 1]
        .iter()
        .all(|byte| *byte == 0x21 || (0x23..=0x7e).contains(byte) || *byte >= 0x80),
    "fault",
    "STRONG_ETAG_REQUIRED",
  )?;
  let mut body = Vec::new();
  while let Some(chunk) = fixed(response.chunk().await, "fault", "READ_FAILED")? {
    ensure(
      body.len().saturating_add(chunk.len()) <= MAX_SNAPSHOT_BYTES,
      "fault",
      "RESPONSE_LIMIT",
    )?;
    body.extend_from_slice(&chunk);
  }
  Ok((body, etag))
}

/// 仅在原内容符合预期且强 ETag 匹配时破坏/恢复本次对象，不进行无条件覆盖。
/// @since Beta v0.14.2
async fn replace_remote(
  env: &Environment,
  name: &str,
  before: &[u8],
  after: &[u8],
) -> E2eResult<()> {
  let (body, etag) = remote_resource(env, name).await?;
  ensure(body == before, "fault", "UNEXPECTED_REMOTE_CHANGE")?;
  let client = fault_client()?;
  let response = fixed(
    client
      .request(Method::PUT, resource_url(env, name)?)
      .basic_auth(&env.dav.username, Some(&env.dav.password))
      .header(header::IF_MATCH, etag)
      .header(header::CONTENT_TYPE, "application/json")
      .body(after.to_vec())
      .send()
      .await,
    "fault",
    "NETWORK_FAILED",
  )?;
  ensure(
    matches!(response.status(), StatusCode::OK | StatusCode::CREATED | StatusCode::NO_CONTENT),
    "fault",
    "CONDITIONAL_PUT_FAILED",
  )?;
  let (body, _) = remote_resource(env, name).await?;
  ensure(body == after, "fault", "WRITE_NOT_CONFIRMED")
}

/// 基于已导出的实库记录验证全包校验、事务回滚和真实 HTTP 完整性/历史恢复。
/// 故障后的远端恢复会在负向断言失败时仍尝试执行，不删除任何远端对象。
/// @since Beta v0.14.2
async fn safety_faults(
  env: &Environment,
  destination: &SqlitePool,
  snapshot: &str,
  expected: &Records,
  expected_counts: &[u64],
  old_id: &str,
  new_id: &str,
) -> E2eResult<()> {
  let last =
    expected.iter().rposition(|rows| !rows.is_empty()).ok_or(("fault", "REAL_ROWS_REQUIRED"))?;
  let empty = vec![0; TABLES.len()];
  let invalid = receiver(env, "invalid.sqlite", None).await?;
  let mut malformed: Value =
    fixed(serde_json::from_str(snapshot), "invalid_import", "JSON_INVALID")?;
  let row = malformed
    .get_mut("tables")
    .and_then(|tables| tables.get_mut(TABLES[last].name))
    .and_then(Value::as_array_mut)
    .and_then(|rows| rows.last_mut())
    .and_then(Value::as_object_mut)
    .ok_or(("invalid_import", "ROW_MISSING"))?;
  row.insert("__e2e_forbidden".into(), Value::Bool(true));
  let malformed = fixed(serde_json::to_string(&malformed), "invalid_import", "JSON_INVALID")?;
  let invalid_result = match validate_snapshot(&malformed) {
    Ok(records) => checked(import_into_pool(&invalid, &records).await, "invalid_import"),
    Err(error) => checked(Err(error), "invalid_import"),
  };
  ensure(
    matches!(invalid_result, Err(("invalid_import", "SYNC_INVALID"))),
    "invalid_import",
    "INVALID_NOT_REJECTED",
  )?;
  ensure(counts(&invalid).await? == empty, "invalid_import", "PARTIAL_WRITE")?;
  invalid.close().await;
  eprintln!("E2E invalid_import_no_writes");

  // CHECK(0) 使最后一张有数据的表失败；若只有单表有记录，用恒值唯一索引在第二行失败。
  let earlier = expected_counts[..last].iter().any(|count| *count != 0);
  ensure(earlier || expected_counts[last] >= 2, "rollback", "MULTIPLE_REAL_ROWS_REQUIRED")?;
  let rollback = receiver(env, "rollback.sqlite", if earlier { Some(last) } else { None }).await?;
  if !earlier {
    let sql =
      format!("CREATE UNIQUE INDEX main.e2e_rollback_guard ON \"{}\" ((1))", TABLES[last].name);
    fixed(sqlx::query(&sql).execute(&rollback).await, "rollback", "FAULT_SETUP_FAILED")?;
  }
  ensure(
    matches!(
      checked(import_into_pool(&rollback, expected).await, "rollback"),
      Err(("rollback", "SYNC_DATABASE"))
    ),
    "rollback",
    "FAILURE_NOT_REPORTED",
  )?;
  ensure(counts(&rollback).await? == empty, "rollback", "PARTIAL_WRITE")?;
  rollback.close().await;
  eprintln!("E2E transaction_rollback_no_writes");

  let name = format!("teyvatguide-sync-{new_id}.json");
  let mut damaged = snapshot.as_bytes().to_vec();
  ensure(!damaged.is_empty(), "integrity", "EMPTY_SNAPSHOT")?;
  damaged[0] ^= 1; // 保持长度不变，专门证明 SHA-256 不匹配被拒绝。
  replace_remote(env, &name, snapshot.as_bytes(), &damaged).await?;
  let integrity_result: E2eResult<()> = async {
    ensure(
      matches!(receive(env, destination, None).await, Err(("download", "WEBDAV_INTEGRITY"))),
      "integrity",
      "LATEST_CORRUPTION_ACCEPTED",
    )?;
    ensure(
      matches!(
        receive(env, destination, Some(new_id.into())).await,
        Err(("download", "WEBDAV_INTEGRITY"))
      ),
      "integrity",
      "HISTORY_CORRUPTION_ACCEPTED",
    )?;
    verify_rows(destination, expected, "integrity_no_writes").await?;
    let history = receiver(env, "history.sqlite", None).await?;
    let recovered = receive(env, &history, Some(old_id.into())).await?;
    verify_stats(&recovered, expected_counts, false)?;
    verify_rows(&history, expected, "old_id_recovery").await?;
    history.close().await;
    Ok(())
  }
  .await;
  replace_remote(env, &name, &damaged, snapshot.as_bytes()).await?;
  integrity_result?;
  eprintln!("E2E same_length_hash_corruption_rejected");

  let current_name = "teyvatguide-sync-current.json";
  let (pointer, _) = remote_resource(env, current_name).await?;
  replace_remote(env, current_name, &pointer, b"{").await?;
  let pointer_result: E2eResult<()> = async {
    ensure(
      matches!(receive(env, destination, None).await, Err(("download", "WEBDAV_INVALID_METADATA"))),
      "current",
      "DAMAGED_POINTER_ACCEPTED",
    )?;
    let recovered = receive(env, destination, Some(old_id.into())).await?;
    verify_stats(&recovered, expected_counts, true)?;
    verify_rows(destination, expected, "damaged_current_old_id").await?;
    Ok(())
  }
  .await;
  replace_remote(env, current_name, b"{", &pointer).await?;
  pointer_result?;
  ensure(
    checked(download(env, None).await, "final_download")? == snapshot,
    "final_download",
    "TRANSPORT_MISMATCH",
  )?;
  eprintln!("E2E damaged_current_recovered_by_old_id");
  eprintln!("E2E safety_complete");
  Ok(())
}

/// 从真实首行副本生成一条业务冲突和一条同 UID、新合法主键的新增记录。
/// 只构造内存测试包，不改源库或普通接收库；候选主键碰撞时继续寻找。
/// @since Beta v0.14.2
fn merge_variants(
  table: &Table,
  rows: &[Map<String, Value>],
) -> E2eResult<(Map<String, Value>, Map<String, Value>)> {
  let original = rows.first().ok_or(("merge", "REAL_ROWS_REQUIRED"))?;
  let mut conflict = original.clone();
  match table.name {
    "GachaRecords" | "HardChallenge" => {
      let name = if original.get("name").and_then(Value::as_str) == Some("E2E合并冲突") {
        "E2E合并冲突2"
      } else {
        "E2E合并冲突"
      };
      conflict.insert("name".into(), Value::String(name.into()));
    }
    "SpiralAbyss" => {
      let count = original
        .get("totalBattleTimes")
        .and_then(Value::as_i64)
        .ok_or(("merge", "BUSINESS_FIELD_INVALID"))?;
      conflict.insert(
        "totalBattleTimes".into(),
        Value::from(if count < 1_000_000 { count + 1 } else { count - 1 }),
      );
    }
    "RoleCombat" => {
      let flag = original
        .get("hasDetailData")
        .and_then(Value::as_i64)
        .ok_or(("merge", "BUSINESS_FIELD_INVALID"))?;
      conflict.insert("hasDetailData".into(), Value::from(1 - flag));
    }
    _ => return Err(("merge", "TABLE_NOT_ALLOWED")),
  }
  let mut added = original.clone();
  if table.name == "GachaRecords" {
    let ids = rows
      .iter()
      .filter_map(|row| row.get("id").and_then(Value::as_str))
      .collect::<std::collections::HashSet<_>>();
    let id = (0..=rows.len())
      .map(|candidate| format!("9{candidate:031}"))
      .find(|candidate| !ids.contains(candidate.as_str()))
      .ok_or(("merge", "UNIQUE_ID_UNAVAILABLE"))?;
    added.insert("id".into(), Value::String(id));
  } else {
    let ids = rows
      .iter()
      .filter_map(|row| row.get("id").and_then(Value::as_i64))
      .collect::<std::collections::HashSet<_>>();
    let id = (1..=rows.len() + 1)
      .map(|candidate| candidate as i64)
      .find(|candidate| !ids.contains(candidate))
      .ok_or(("merge", "UNIQUE_ID_UNAVAILABLE"))?;
    added.insert("id".into(), Value::from(id));
  }
  ensure(
    validate_record(table, &conflict).is_ok() && validate_record(table, &added).is_ok(),
    "merge",
    "GENERATED_ROW_INVALID",
  )?;
  ensure(
    conflict != *original
      && added.get("uid") == original.get("uid")
      && added.get("id") != original.get("id"),
    "merge",
    "VARIANT_NOT_DISTINCT",
  )?;
  Ok((conflict, added))
}

/// 序列化并验证只含四表的内存增量包，上传前不允许发布不合法包。
/// @since Beta v0.14.2
fn merge_snapshot(records: &Records) -> E2eResult<String> {
  ensure(records.len() == TABLES.len(), "merge", "TABLE_COUNT_MISMATCH")?;
  let mut tables = Map::new();
  for (table, rows) in TABLES.iter().zip(records) {
    tables
      .insert(table.name.into(), Value::Array(rows.iter().cloned().map(Value::Object).collect()));
  }
  let snapshot = fixed(
    serde_json::to_string(&serde_json::json!({"version":1,"tables":tables})),
    "merge",
    "JSON_INVALID",
  )?;
  checked(validate_snapshot(&snapshot), "merge_validate")?;
  Ok(snapshot)
}

/// 逐表检查混合包的新增、相同与冲突统计；空源表没有构造测试记录。
/// @since Beta v0.14.2
fn verify_merge_stats(
  stats: &SyncImportStats,
  expected: &Records,
  inserted: u64,
  identical: u64,
  conflicts: u64,
) -> E2eResult<()> {
  let all = [&stats.gacha_records, &stats.spiral_abyss, &stats.role_combat, &stats.hard_challenge];
  ensure(expected.len() == all.len(), "merge", "TABLE_COUNT_MISMATCH")?;
  for (stats, rows) in all.iter().zip(expected) {
    let active = u64::from(!rows.is_empty());
    ensure(
      stats.inserted == inserted * active
        && stats.identical == identical * active
        && stats.conflicts == conflicts * active,
      "merge",
      "IMPORT_STATS_MISMATCH",
    )?;
  }
  Ok(())
}

/// 独立磁盘库验证真实记录增量合并、冲突保留、重入及稀疏包不传播删除。
/// 每一步均通过真实生产 DAV 上传/下载，再全列检查原始记录和新增记录。
/// @since Beta v0.14.2
async fn merge_semantics(
  env: &Environment,
  snapshot: &str,
  expected: &Records,
  expected_counts: &[u64],
) -> E2eResult<()> {
  let merge = receiver(env, "merge.sqlite", None).await?;
  let initial = checked(import_into_pool(&merge, expected).await, "merge_seed")?;
  verify_stats(&initial, expected_counts, false)?;
  verify_rows(&merge, expected, "merge_seed").await?;
  let mut mixed: Records = vec![Vec::new(); TABLES.len()];
  let mut sparse: Records = vec![Vec::new(); TABLES.len()];
  let mut final_rows = expected.clone();
  for (index, table) in TABLES.iter().enumerate() {
    if expected[index].is_empty() {
      eprintln!("E2E merge_skipped_empty {} rows=0", table.name);
      continue;
    }
    let (conflict, added) = merge_variants(table, &expected[index])?;
    mixed[index].extend([conflict, added.clone()]);
    sparse[index].push(added.clone());
    final_rows[index].push(added);
    final_rows[index].sort_by(|left, right| {
      if table.name == "GachaRecords" {
        left.get("id").and_then(Value::as_str).cmp(&right.get("id").and_then(Value::as_str))
      } else {
        left
          .get("uid")
          .and_then(Value::as_str)
          .cmp(&right.get("uid").and_then(Value::as_str))
          .then_with(|| {
            left.get("id").and_then(Value::as_i64).cmp(&right.get("id").and_then(Value::as_i64))
          })
      }
    });
  }
  ensure(sparse.iter().any(|rows| !rows.is_empty()), "merge", "REAL_ROWS_REQUIRED")?;
  let mixed_snapshot = merge_snapshot(&mixed)?;
  upload(env, &mixed_snapshot).await?;
  let mixed_stats = receive(env, &merge, None).await?;
  verify_merge_stats(&mixed_stats, expected, 1, 0, 1)?;
  verify_rows(&merge, &final_rows, "merge_conflicts_preserved").await?;
  let repeated = receive(env, &merge, None).await?;
  verify_merge_stats(&repeated, expected, 0, 1, 1)?;
  verify_rows(&merge, &final_rows, "merge_repeat").await?;
  upload(env, &merge_snapshot(&sparse)?).await?;
  let sparse_stats = receive(env, &merge, None).await?;
  verify_merge_stats(&sparse_stats, expected, 0, 1, 0)?;
  verify_rows(&merge, &final_rows, "merge_sparse_no_deletions").await?;
  merge.close().await;
  // 保持专用 DAV 的最终 current 指向完整原始快照，便于主线程独立归档复核。
  upload(env, snapshot).await?;
  ensure(
    checked(download(env, None).await, "merge_restore")? == snapshot,
    "merge_restore",
    "TRANSPORT_MISMATCH",
  )?;
  eprintln!("E2E merge_acceptance_complete");
  Ok(())
}

/// 显式运行仍要求三个环境变量齐备；失败路径也先校验源文件摘要未改变。
/// @since Beta v0.14.2
#[test]
#[ignore = "requires isolated real source DB, empty private workdir, and dedicated real WebDAV"]
fn real_database_webdav_roundtrip() {
  let env = finish(environment());
  let before = finish(source_hash(&env.source));
  let result = tauri::async_runtime::block_on(roundtrip(&env));
  let after = finish(source_hash(&env.source));
  finish(ensure(before == after, "source", "SOURCE_HASH_CHANGED"));
  finish(no_source_sidecars(&env.source));
  eprintln!("E2E source_unchanged");
  finish(result);
  eprintln!("E2E acceptance_complete");
}
