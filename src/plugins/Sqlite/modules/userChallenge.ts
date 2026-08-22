/**
 * 幽境危战模块
 * @since Beta v0.11.4
 */

import showSnackbar from "@comp/func/snackbar.js";
import { path } from "@tauri-apps/api";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import fmtUtil from "@utils/fmtUtil.js";
import TGLogger from "@utils/TGLogger.js";

import TGSqlite from "../index.js";

type JsonValidation<T> =
  { ok: true; value: T } | { field: ChallengeJsonField; ok: false; reason: string };

type ChallengeJsonField = "single" | "mp" | "blings";

type ChallengeQuarantine = {
  field: ChallengeJsonField | "record";
  raw: TGApp.Sqlite.Challenge.TableRaw;
  reason: string;
};

type ChallengeReadResult = {
  quarantine: Array<ChallengeQuarantine>;
  valid: Array<TGApp.Sqlite.Challenge.TableTrans>;
};

const quarantineLogKeys = new Set<string>();
const MaxQuarantineLogEntries = 100;

/**
 * 将通过 api 获取到的数据转换为数据库中的数据
 * @since Beta v0.8.0
 * @param data - 挑战数据
 * @returns 转换后的数据
 */
function transUserChallenge(
  data: TGApp.Game.Challenge.ChallengeItem,
): TGApp.Sqlite.Challenge.TableTrans {
  return {
    uid: "",
    id: Number(data.schedule.schedule_id),
    startTime: fmtUtil.dateTime(Number(data.schedule.start_time) * 1000),
    endTime: fmtUtil.dateTime(Number(data.schedule.end_time) * 1000),
    name: data.schedule.name,
    single: data.single,
    mp: data.mp,
    blings: data.blings,
    updated: fmtUtil.dateTime(new Date().getTime()),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChallengeTeam(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.avatar_id === "number" &&
    typeof value.name === "string" &&
    typeof value.element === "string" &&
    typeof value.image === "string" &&
    typeof value.level === "number" &&
    typeof value.rarity === "number" &&
    typeof value.rank === "number"
  );
}

function isChallengeAvatar(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.avatar_id === "number" &&
    typeof value.side_icon === "string" &&
    typeof value.dps === "string" &&
    typeof value.type === "number"
  );
}

function isChallengeMonster(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.level === "number" &&
    typeof value.icon === "string" &&
    Array.isArray(value.desc) &&
    value.desc.every((item) => typeof item === "string") &&
    Array.isArray(value.tags) &&
    value.tags.every(
      (item) => isRecord(item) && typeof item.type === "string" && typeof item.desc === "string",
    ) &&
    typeof value.monster_id === "number"
  );
}

function isChallengeData(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.second === "number" &&
    Array.isArray(value.teams) &&
    value.teams.every(isChallengeTeam) &&
    Array.isArray(value.best_avatar) &&
    value.best_avatar.every(isChallengeAvatar) &&
    isChallengeMonster(value.monster)
  );
}

function isChallenge(value: unknown): value is TGApp.Game.Challenge.Challenge {
  if (!isRecord(value) || !Array.isArray(value.challenge)) return false;
  if (typeof value.has_data !== "boolean") return false;
  if (value.best !== null) {
    if (
      !isRecord(value.best) ||
      typeof value.best.difficulty !== "number" ||
      typeof value.best.second !== "number" ||
      typeof value.best.icon !== "string"
    ) {
      return false;
    }
  }
  return value.challenge.every(isChallengeData);
}

function isChallengeBlings(value: unknown): value is TGApp.Game.Challenge.ChallengeBlings {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.avatar_id === "number" &&
        typeof item.name === "string" &&
        typeof item.element === "string" &&
        typeof item.image === "string" &&
        typeof item.side_icon === "string" &&
        typeof item.rarity === "number" &&
        typeof item.is_plus === "boolean",
    )
  );
}

function parseJsonField<T>(
  value: unknown,
  field: ChallengeJsonField,
  validator: (parsed: unknown) => parsed is T,
): JsonValidation<T> {
  if (value === undefined) return { field, ok: false, reason: "missing" };
  if (value === null) return { field, ok: false, reason: "null" };
  if (typeof value !== "string") return { field, ok: false, reason: "not-string" };
  if (value.trim() === "") return { field, ok: false, reason: "empty" };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!validator(parsed)) return { field, ok: false, reason: "invalid-structure" };
    return { ok: true, value: parsed };
  } catch {
    return { field, ok: false, reason: "invalid-json" };
  }
}

function parseRawChallenge(
  raw: TGApp.Sqlite.Challenge.TableRaw,
): TGApp.Sqlite.Challenge.TableTrans | ChallengeQuarantine {
  if (
    typeof raw.uid !== "string" ||
    raw.uid.trim() === "" ||
    typeof raw.id !== "number" ||
    !Number.isFinite(raw.id) ||
    typeof raw.startTime !== "string" ||
    typeof raw.endTime !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.updated !== "string"
  ) {
    return { field: "record", raw, reason: "invalid-record-metadata" };
  }
  const single = parseJsonField(raw.single, "single", isChallenge);
  if (!single.ok) return { field: single.field, raw, reason: single.reason };
  const mp = parseJsonField(raw.mp, "mp", isChallenge);
  if (!mp.ok) return { field: mp.field, raw, reason: mp.reason };
  const blings = parseJsonField(raw.blings, "blings", isChallengeBlings);
  if (!blings.ok) return { field: blings.field, raw, reason: blings.reason };
  return {
    uid: raw.uid,
    id: raw.id,
    startTime: raw.startTime,
    endTime: raw.endTime,
    name: raw.name,
    single: single.value,
    mp: mp.value,
    blings: blings.value,
    updated: raw.updated,
  };
}

function isQuarantine(
  value: TGApp.Sqlite.Challenge.TableTrans | ChallengeQuarantine,
): value is ChallengeQuarantine {
  return "raw" in value;
}

async function logQuarantinedChallenge(challenge: ChallengeQuarantine): Promise<void> {
  const key = `${challenge.raw.uid ?? "null"}|${challenge.raw.id ?? "null"}|${challenge.field}|${challenge.reason}`;
  if (quarantineLogKeys.has(key) || quarantineLogKeys.size >= MaxQuarantineLogEntries) return;
  quarantineLogKeys.add(key);
  await TGLogger.Warn(
    JSON.stringify({
      scope: "TSUserChallenge.quarantine",
      uid: challenge.raw.uid,
      id: challenge.raw.id,
      field: challenge.field,
      reason: challenge.reason,
    }),
  );
}

async function readChallenges(uid?: string): Promise<ChallengeReadResult> {
  const db = await TGSqlite.getDB();
  const query = `SELECT uid, id, startTime, endTime, name, single, mp, blings, updated
                 FROM HardChallenge${uid === undefined ? "" : " WHERE uid = $1"}
                 ORDER BY id DESC;`;
  const rows = await db.select<Array<TGApp.Sqlite.Challenge.TableRaw>>(
    query,
    uid === undefined ? [] : [uid],
  );
  const result: ChallengeReadResult = { quarantine: [], valid: [] };
  for (const raw of rows) {
    const parsed = parseRawChallenge(raw);
    if (isQuarantine(parsed)) {
      result.quarantine.push(parsed);
      await logQuarantinedChallenge(parsed);
    } else result.valid.push(parsed);
  }
  return result;
}

function stringifyJson(value: unknown, field: ChallengeJsonField): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error(`HardChallenge ${field} cannot be serialized`);
  return serialized;
}

function parseBackupChallenge(value: unknown): TGApp.Sqlite.Challenge.TableTrans {
  if (!isRecord(value)) throw new Error("challenge backup item must be an object");
  if (
    typeof value.uid === "string" &&
    typeof value.id === "number" &&
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    typeof value.name === "string" &&
    typeof value.updated === "string" &&
    isChallenge(value.single) &&
    isChallenge(value.mp) &&
    isChallengeBlings(value.blings)
  ) {
    return {
      uid: value.uid,
      id: value.id,
      startTime: value.startTime,
      endTime: value.endTime,
      name: value.name,
      single: value.single,
      mp: value.mp,
      blings: value.blings,
      updated: value.updated,
    };
  }
  const raw: TGApp.Sqlite.Challenge.TableRaw = {
    uid: typeof value.uid === "string" ? value.uid : null,
    id: typeof value.id === "number" ? value.id : null,
    startTime: typeof value.startTime === "string" ? value.startTime : null,
    endTime: typeof value.endTime === "string" ? value.endTime : null,
    name: typeof value.name === "string" ? value.name : null,
    single:
      value.single === undefined || value.single === null || typeof value.single === "string"
        ? value.single
        : null,
    mp:
      value.mp === undefined || value.mp === null || typeof value.mp === "string" ? value.mp : null,
    blings:
      value.blings === undefined || value.blings === null || typeof value.blings === "string"
        ? value.blings
        : null,
    updated: typeof value.updated === "string" ? value.updated : null,
  };
  const parsed = parseRawChallenge(raw);
  if (isQuarantine(parsed)) {
    throw new Error(`HardChallenge backup validation failed: ${parsed.field}/${parsed.reason}`);
  }
  return parsed;
}

/**
 * 生成参数化插入语句。
 * @since Beta v0.11.3
 * @param data - 挑战数据
 * @param uid - 用户UID
 * @returns SQL 语句与参数
 */
function getInsertSql(
  data: TGApp.Sqlite.Challenge.TableTrans,
  uid?: string,
): TGApp.App.Sqlite.SqlStatement {
  const parsed = parseRawChallenge({
    ...data,
    uid: uid ?? data.uid,
    single: stringifyJson(data.single, "single"),
    mp: stringifyJson(data.mp, "mp"),
    blings: stringifyJson(data.blings, "blings"),
  });
  if (isQuarantine(parsed)) {
    throw new Error(`HardChallenge validation failed: ${parsed.field}/${parsed.reason}`);
  }
  const updated = fmtUtil.dateTime(new Date().getTime());
  return {
    query: `INSERT INTO HardChallenge(uid, id, startTime, endTime, name, single, mp, blings, updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT(uid, id) DO UPDATE SET
              startTime = $3,
              endTime = $4,
              name = $5,
              single = $6,
              mp = $7,
              blings = $8,
              updated = $9;`,
    values: [
      parsed.uid,
      parsed.id,
      parsed.startTime,
      parsed.endTime,
      parsed.name,
      stringifyJson(parsed.single, "single"),
      stringifyJson(parsed.mp, "mp"),
      stringifyJson(parsed.blings, "blings"),
      updated,
    ],
  };
}

/**
 * 获取所有数据的UID
 * @since Beta v0.11.3
 * @returns 所有数据的UID
 */
async function getAllUid(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type ResType = Array<{ uid: string }>;
  const res = await db.select<ResType>(
    "SELECT DISTINCT uid FROM HardChallenge WHERE uid IS NOT NULL AND trim(uid) <> '';",
  );
  return res.map((item) => item.uid);
}

/**
 * 获取挑战数据；不符合业务结构的原始行会保留在数据库并被隔离。
 * @since Beta v0.11.3
 * @param uid - 游戏UID
 * @returns 有效挑战数据
 */
async function getChallenge(uid?: string): Promise<Array<TGApp.Sqlite.Challenge.TableTrans>> {
  return (await readChallenges(uid)).valid;
}

/**
 * 保存挑战数据
 * @since Beta v0.11.3
 * @param uid - 游戏UID
 * @param data - 挑战数据
 * @returns 无返回值
 */
async function saveChallenge(uid: string, data: TGApp.Game.Challenge.ChallengeItem): Promise<void> {
  const statement = getInsertSql(transUserChallenge(data), uid);
  const db = await TGSqlite.getDB();
  await db.execute(statement.query, statement.values);
}

/**
 * 删除指定UID的挑战数据
 * @since Beta v0.11.3
 * @param uid - 游戏UID
 * @returns 无返回值
 */
async function delChallenge(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM HardChallenge WHERE uid = $1;", [uid]);
}

/**
 * 备份挑战数据
 * @since Beta v0.11.3
 * @param dir - 备份目录
 * @returns 无返回值
 */
async function backupChallenge(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
    await TGLogger.Warn(`[TSUserChallenge][Backup] 未检测到备份目录，已创建`);
  }
  const data = await readChallenges();
  await writeTextFile(`${dir}${path.sep()}challenge.json`, JSON.stringify(data.valid));
  await writeTextFile(
    `${dir}${path.sep()}challenge.quarantine.json`,
    JSON.stringify(data.quarantine.map((item) => item.raw)),
  );
}

/**
 * 恢复挑战数据
 * @since Beta v0.11.3
 * @param dir - 备份目录
 * @returns 是否恢复成功
 */
async function restoreChallenge(dir: string): Promise<boolean> {
  const filePath = `${dir}${path.sep()}challenge.json`;
  if (!(await exists(filePath))) return false;
  try {
    const backupData: unknown = JSON.parse(await readTextFile(filePath));
    if (!Array.isArray(backupData)) throw new Error("challenge.json must contain an array");
    const quarantinePath = `${dir}${path.sep()}challenge.quarantine.json`;
    if (await exists(quarantinePath)) {
      const quarantineData: unknown = JSON.parse(await readTextFile(quarantinePath));
      if (!Array.isArray(quarantineData))
        throw new Error("challenge.quarantine.json must contain an array");
      if (quarantineData.length > 0) {
        await TGLogger.Warn(
          JSON.stringify({
            scope: "TSUserChallenge.restore",
            reason: "quarantine-data-not-restored-requires-manual-review",
            count: quarantineData.length,
          }),
        );
        showSnackbar.warn(
          `挑战备份中有 ${quarantineData.length} 条隔离数据未恢复，请根据 challenge.quarantine.json 手动处理。`,
          6000,
        );
      }
    }
    const statements = backupData.map((item) => getInsertSql(parseBackupChallenge(item)));
    await TGSqlite.executeTransaction(statements);
    return true;
  } catch (error) {
    await TGLogger.Error(
      JSON.stringify({
        scope: "TSUserChallenge.restore",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

const TSUserChallenge = {
  getAllUid,
  getChallenge,
  saveChallenge,
  delChallenge,
  backupChallenge,
  restoreChallenge,
};

export default TSUserChallenge;
