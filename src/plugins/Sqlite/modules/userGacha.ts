/**
 * 用户祈愿模块
 * @since Beta v0.11.2
 */

import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGLogger from "@utils/TGLogger.js";
import { getWikiBrief } from "@utils/toolFunc.js";
import { ref, type Ref } from "vue";

import TGSqlite from "../index.js";

/**
 * 批量插入祈愿数据
 * @since Beta v0.11.2
 * @param uid - 用户UID
 * @param data - 祈愿数据
 * @param size - batchSize
 * @param cnt - cntRef
 */
async function insertGachaList(
  uid: string,
  data: Array<TGApp.Plugins.UIGF.GachaItem>,
  size: number,
  cnt: Ref<number>,
): Promise<void> {
  const statements: Array<{
    query: string;
    values: Array<string | number | null>;
  }> = [];
  for (let i = 0; i < data.length; i += size) {
    const batch = data.slice(i, i + size);
    const batchParams: Array<string | number | null> = [];
    const valueSql = batch
      .map((item, itemIndex) => {
        const updateTime = fmtUtil.dateTime(Date.now());
        batchParams.push(
          uid,
          item.gacha_type,
          item.item_id ?? null,
          item.count ?? 1,
          item.time,
          item.name,
          item.item_type ?? null,
          item.rank_type ?? null,
          item.id,
          item.uigf_gacha_type,
          updateTime,
        );
        const paramOffset = itemIndex * 11;
        return `(${Array.from({ length: 11 }, (_, index) => `$${paramOffset + index + 1}`).join(", ")})`;
      })
      .join(",\n");
    statements.push({
      query: `INSERT INTO GachaRecords(uid, gachaType, itemId, count, time,
                                      name, type, rank, id, uigfType, updated)
              VALUES ${valueSql}
              ON CONFLICT(id) DO UPDATE SET
                uid = excluded.uid,
                gachaType = excluded.gachaType,
                itemId = excluded.itemId,
                count = excluded.count,
                time = excluded.time,
                name = excluded.name,
                type = excluded.type,
                rank = excluded.rank,
                uigfType = excluded.uigfType,
                updated = excluded.updated;`,
      values: batchParams,
    });
  }
  if (statements.length === 0) return;
  await TGSqlite.executeTransaction(statements);
  cnt.value += data.length;
}

/**
 * 转换祈愿数据，防止多语言
 * @since Beta v0.9.5
 * @param gacha - UIGF数据
 * @param timezone - 时区
 * @returns 转换后的数据
 */
function transGacha(
  gacha: TGApp.Plugins.UIGF.GachaItem,
  timezone: number = 8,
): TGApp.Plugins.UIGF.GachaItem {
  const find = getWikiBrief(gacha.item_id);
  if (!find) return { ...gacha, time: fmtUtil.utc8Time(gacha.time, timezone) };
  return {
    gacha_type: gacha.gacha_type,
    item_id: gacha.item_id,
    count: gacha.count ?? "1",
    time: fmtUtil.utc8Time(gacha.time, timezone),
    name: find.name,
    item_type: "element" in find ? "角色" : "武器",
    rank_type: find.star.toString(),
    id: gacha.id,
    uigf_gacha_type: gacha.uigf_gacha_type,
  };
}

/**
 * 获取数据库的uid列表
 * @since Beta v0.4.7
 * @returns uid列表
 */
async function getUidList(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM GachaRecords;");
  return res.map((i) => i.uid);
}

/**
 * 获取检测增量更新的记录 ID
 * @since Beta v0.4.7
 * @param uid - UID
 * @param type - 类型
 * @returns ID
 */
async function getGachaCheck(uid: string, type: string): Promise<string | undefined> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ id: string }>;
  const res = await db.select<resType>(
    "SELECT id FROM GachaRecords WHERE uid = ? AND gachaType = ? ORDER BY id DESC LIMIT 1;",
    [uid, type],
  );
  if (res.length === 0) return undefined;
  return res[0].id;
}

/**
 * 获取用户祈愿记录
 * @since Beta v0.4.7
 * @param uid - UID
 * @returns 祈愿记录
 */
async function getGachaRecords(uid: string): Promise<Array<TGApp.Sqlite.Gacha.Gacha>> {
  const db = await TGSqlite.getDB();
  return await db.select("SELECT * FROM GachaRecords WHERE uid = ?;", [uid]);
}

/**
 * 获取指定EndId后的祈愿记录
 * @since Beta v0.9.1
 * @param uid - UID
 * @param pool - Pool
 * @param endId - endId
 * @returns 祈愿记录
 */
async function getGachaRecordsByEndId(
  uid: string,
  pool: string,
  endId?: string,
): Promise<Array<TGApp.Sqlite.Gacha.Gacha>> {
  const db = await TGSqlite.getDB();
  if (endId && endId !== "0") {
    return await db.select(
      "SELECT * FROM GachaRecords WHERE uid = ? AND uigfType = ? AND id > ?;",
      [uid, pool, endId],
    );
  }
  return await db.select("SELECT * FROM GachaRecords WHERE uid = ? AND uigfType = ?;", [uid, pool]);
}

/**
 * 获取用户祈愿记录，并按照日期进行分组排序
 * @since Beta v0.6.8
 * @param uid - UID
 * @param type - 类型
 * @returns 日期分组的祈愿记录
 */
async function getGachaRecordsByDate(
  uid: string,
  type?: string,
): Promise<Record<string, Array<TGApp.Sqlite.Gacha.Gacha>>> {
  const db = await TGSqlite.getDB();
  type resType = Array<TGApp.Sqlite.Gacha.Gacha>;
  let res: resType;
  if (type) {
    res = await db.select<resType>(
      "SELECT * FROM GachaRecords WHERE uid = ? AND gachaType = ? ORDER BY time;",
      [uid, type],
    );
  } else {
    res = await db.select<resType>("SELECT * FROM GachaRecords WHERE uid = ? ORDER BY time;", [
      uid,
    ]);
  }
  const map: Record<string, Array<TGApp.Sqlite.Gacha.Gacha>> = {};
  for (const item of res) {
    // key 是 yyyy-MM-dd hh:mm:ss，按照日期分组
    const key = item.time.split(" ")[0];
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

/**
 * 获取指定卡池的祈愿记录
 * @since Beta v0.9.1
 * @param pool - 卡池信息
 * @param uid - 用户UID
 */
async function getGachaRecordsByPool(
  pool: TGApp.App.Gacha.PoolItem,
  uid: string,
): Promise<Array<TGApp.Sqlite.Gacha.Gacha>> {
  console.log(pool, uid);
  const db = await TGSqlite.getDB();
  type resType = Array<TGApp.Sqlite.Gacha.Gacha>;
  return await db.select<resType>(
    "SELECT * FROM GachaRecords WHERE uid = ? AND gachaType = ? AND time >= ? AND time <= ?;",
    [
      uid.toString(),
      pool.type.toString(),
      pool.from.slice(0, 19).replace("T", " "),
      pool.to.slice(0, 19).replace("T", " "),
    ],
  );
}

/**
 * 删除指定UID的祈愿记录
 * @since Beta v0.4.7
 * @param uid - UID
 * @returns 无返回值
 */
async function deleteGachaRecords(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM GachaRecords WHERE uid = ?;", [uid]);
}

/**
 * 清理祈愿记录
 * @since Beta v0.6.4
 * @param uid - UID
 * @param pool - 池子
 * @param map - 祈愿数据
 * @returns 无返回值
 */
async function cleanGachaRecords(
  uid: string,
  pool: string,
  map: Record<string, Array<string>>,
): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const [time, ids] of Object.entries(map)) {
    const sql = `DELETE
                 FROM GachaRecords
                 WHERE uid = '${uid}'
                   AND gachaType = '${pool}'
                   AND time = '${time}'
                   AND id NOT IN (${ids.map((i) => `'${i}'`).join(",")});
    `;
    const res = await db.execute(sql);
    if (res.rowsAffected > 0) {
      showSnackbar.success(`[${uid}][${pool}][${time}]清理了${res.rowsAffected}条祈愿记录`);
    }
  }
}

/**
 * 合并祈愿数据
 * @since Beta v0.9.8
 * @param uid - UID
 * @param data - UIGF数据
 * @param showProgress - 是否显示进度
 * @returns 无返回值
 */
async function mergeUIGF(
  uid: string,
  data: Array<TGApp.Plugins.UIGF.GachaItem>,
  showProgress: boolean = false,
): Promise<void> {
  const len = data.length;
  const cnt = ref<number>(0);
  let timer: NodeJS.Timeout | null = null;
  if (showProgress) {
    timer = setInterval(async () => {
      const progress = Math.round((cnt.value / len) * 100 * 100) / 100;
      const current = data[cnt.value]?.time ?? "";
      const name = data[cnt.value]?.name ?? "";
      const rank = data[cnt.value]?.rank_type ?? "0";
      await showLoading.update(`[${progress}%][${current}] ${"⭐".repeat(Number(rank))}-${name}`, {
        timeout: 0,
      });
    }, 1000);
  }
  try {
    const transformed = data.map((g) => transGacha(g));
    await insertGachaList(uid, transformed, 100, cnt);
  } catch (e) {
    await TGLogger.Error(`[UserGacha][mergeUIGF] 合并祈愿数据异常`);
    await TGLogger.Error(`[UserGacha][mergeUIGF] UID: ${uid}, 数据量: ${data.length}`);
    await TGLogger.Error(`[UserGacha][mergeUIGF] ${e}`);
    throw e;
  } finally {
    if (timer) {
      clearInterval(timer);
      await showLoading.update(`[100%] 完成`, { timeout: 0 });
    }
  }
}

/**
 * 合并祈愿数据（v4.x）
 * @since Beta v0.9.8
 * @param data - UIGF数据
 * @param showProgress - 是否显示进度
 * @returns 无返回值
 */
async function mergeUIGF4(
  data: TGApp.Plugins.UIGF.GachaHk4e,
  showProgress: boolean = false,
): Promise<void> {
  const len = data.list.length;
  const cnt = ref<number>(0);
  let timer: NodeJS.Timeout | null = null;
  if (showProgress) {
    timer = setInterval(async () => {
      const progress = Math.round((cnt.value / len) * 100 * 100) / 100;
      const current = data.list[cnt.value]?.time ?? "";
      const name = data.list[cnt.value]?.name ?? data.list[cnt.value]?.item_id;
      const rank = data.list[cnt.value]?.rank_type ?? "0";
      await showLoading.update(`[${progress}%][${current}] ${"⭐".repeat(Number(rank))}-${name}`, {
        timeout: 0,
      });
    }, 1000);
  }
  const uid = data.uid.toString();
  const transformed = data.list.map((g) => transGacha(g, data.timezone));
  await insertGachaList(uid, transformed, 100, cnt);
  if (timer) {
    clearInterval(timer);
    await showLoading.update(`[100%] 完成`, { timeout: 0 });
  }
}

/**
 * 更新单条数据ID
 * @since Beta v0.9.0
 * @param raw - 原始数据
 * @param itemId - 物品ID
 * @returns 无返回值
 */
async function updateItemIdById(raw: TGApp.Sqlite.Gacha.Gacha, itemId: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("UPDATE GachaRecords SET itemId = ? WHERE id = ?;", [itemId.toString(), raw.id]);
}

const TSUserGacha = {
  getUidList,
  getGachaCheck,
  deleteGachaRecords,
  cleanGachaRecords,
  mergeUIGF,
  mergeUIGF4,
  update: {
    itemId: updateItemIdById,
  },
  record: {
    all: getGachaRecords,
    endId: getGachaRecordsByEndId,
    time: getGachaRecordsByDate,
    pool: getGachaRecordsByPool,
  },
};

export default TSUserGacha;
