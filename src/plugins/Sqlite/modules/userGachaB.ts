/**
 * 千星奇域祈愿模块
 * @since Beta v0.11.2
 */

import showLoading from "@comp/func/loading.js";
import TGSqlite from "@Sql/index.js";
import fmtUtil from "@utils/fmtUtil.js";
import { ref, type Ref } from "vue";

import { AppGachaBData } from "@/data/index.js";

/**
 * 批量插入颂愿数据
 * @since Beta v0.11.2
 * @param uid - 用户UID
 * @param data - 祈愿数据
 * @param size - batchSize
 * @param cnt - cntRef
 */
async function insertGachaBList(
  uid: string,
  data: Array<TGApp.Plugins.UIGF.GachaItemB>,
  size: number,
  cnt?: Ref<number>,
): Promise<void> {
  const statements: Array<{
    query: string;
    values: Array<string>;
  }> = [];
  for (let i = 0; i < data.length; i += size) {
    const batch = data.slice(i, i + size);
    const batchParams: Array<string> = [];
    const valueSql = batch
      .map((item, itemIndex) => {
        const updateTime = fmtUtil.dateTime(Date.now());
        const gachaType = item.op_gacha_type === "1000" ? "1000" : "2000";
        batchParams.push(
          item.id,
          uid,
          item.schedule_id,
          gachaType,
          item.op_gacha_type,
          item.time,
          item.item_id,
          item.item_name,
          item.item_type,
          item.rank_type,
          updateTime,
        );
        const paramOffset = itemIndex * 11;
        return `(${Array.from({ length: 11 }, (_, index) => `$${paramOffset + index + 1}`).join(", ")})`;
      })
      .join(",\n");
    statements.push({
      query: `INSERT INTO GachaBRecords(id, uid, scheduleId, gachaType, opGachaType, time,
                                       itemId, name, type, rank, updated)
              VALUES ${valueSql}
              ON CONFLICT(id) DO UPDATE SET
                uid = excluded.uid,
                scheduleId = excluded.scheduleId,
                gachaType = excluded.gachaType,
                opGachaType = excluded.opGachaType,
                time = excluded.time,
                itemId = excluded.itemId,
                name = excluded.name,
                type = excluded.type,
                rank = excluded.rank,
                updated = excluded.updated;`,
      values: batchParams,
    });
  }
  if (statements.length === 0) return;
  await TGSqlite.executeTransaction(statements);
  if (cnt) cnt.value += data.length;
}

/**
 * 插入列表数据
 * @since Beta v0.9.5
 * @param uid - UID
 * @param list - 抽卡记录列表
 * @returns 无返回值
 */
async function insertGachaList(
  uid: string,
  list: Array<TGApp.Plugins.UIGF.GachaItemB>,
): Promise<void> {
  await insertGachaBList(uid, list, 100);
}

/**
 * 转换颂愿数据，防止多语言
 * @since Beta v0.9.5
 * @param gacha - 颂愿数据
 * @param timezone - 时区
 * @returns 转换后的数据
 */
function transGacha(
  gacha: TGApp.Plugins.UIGF.GachaItemB,
  timezone: number = 8,
): TGApp.Plugins.UIGF.GachaItemB {
  const find = AppGachaBData.find((i) => i.id === gacha.item_id);
  if (!find) return gacha;
  return {
    id: gacha.id,
    item_id: gacha.item_id,
    item_name: find.name,
    item_type: find.type,
    op_gacha_type: gacha.op_gacha_type,
    rank_type: find.rank.toString(),
    schedule_id: gacha.schedule_id,
    time: fmtUtil.utc8Time(gacha.time, timezone),
  };
}

/**
 * 插入UIGF4数据
 * @since Beta v0.9.5
 * @param data - UIGF数据
 * @param showProgress - 是否显示进度
 * @returns 无返回值
 */
async function mergeUIGF4(
  data: TGApp.Plugins.UIGF.GachaUgc,
  showProgress: boolean = false,
): Promise<void> {
  const len = data.list.length;
  const cnt = ref<number>(0);
  let timer: NodeJS.Timeout | null = null;
  if (showProgress) {
    timer = setInterval(async () => {
      const progress = Math.round((cnt.value / len) * 100 * 100) / 100;
      const current = data.list[cnt.value].time ?? "";
      const name = data.list[cnt.value].item_name ?? "";
      const rank = data.list[cnt.value].rank_type ?? "0";
      await showLoading.update(`[${progress}%][${current}] ${"⭐".repeat(Number(rank))}-${name}`, {
        timeout: 0,
      });
    }, 1000);
  }
  const transformed = data.list.map((g) => transGacha(g));
  await insertGachaBList(data.uid.toString(), transformed, 100, cnt);
  if (timer) {
    clearInterval(timer);
    await showLoading.update(`[100%] 完成`, { timeout: 0 });
  }
}

/**
 * 获取数据库UID列表
 * @since Beta v0.8.4
 * @returns uid列表
 */
async function getUidList(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM GachaBRecords;");
  return res.map((i) => i.uid);
}

/**
 * 获取增量更新的记录 ID
 * @since Beta v0.8.4
 * @param uid - UID
 * @param  type - 类型
 * @returns ID
 */
async function getGachaCheck(uid: string, type: string): Promise<string | undefined> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ id: string }>;
  const res = await db.select<resType>(
    "SELECT id FROM GachaBRecords WHERE uid = ? AND opGachaType = ? ORDER BY id DESC LIMIT 1;",
    [uid, type],
  );
  if (res.length === 0) return undefined;
  return res[0].id;
}

/**
 * 获取用户颂愿记录
 * @since Beta v0.8.4
 * @param uid - UID
 * @param type - 类型
 * @returns 颂愿记录
 */
async function getGachaRecords(
  uid: string,
  type?: string,
): Promise<Array<TGApp.Sqlite.Gacha.GachaB>> {
  const db = await TGSqlite.getDB();
  if (type) {
    return await db.select("SELECT * FROM GachaBRecords WHERE uid = ? AND opGachaType = ?;", [
      uid,
      type,
    ]);
  }
  return await db.select("SELECT * FROM GachaBRecords WHERE uid = ?;", [uid]);
}

/**
 * 删除用户祈愿数据
 * @since Beta v0.8.4
 * @param uid - UID
 * @returns 无返回值
 */
async function deleteRecords(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM GachaBRecords WHERE uid = ?;", [uid]);
}

/**
 * 更新单条数据名称&类型
 * @since Beta v0.9.5
 * @param raw - 原始数据
 * @param data - 对应数据
 * @returns 无返回值
 */
async function updateNt(
  raw: TGApp.Sqlite.Gacha.GachaB,
  data: TGApp.App.Gacha.GachaBMeta,
): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("UPDATE GachaBRecords SET name = $1,type = $2 WHERE id = $3;", [
    data.name,
    data.type,
    raw.id,
  ]);
}

const TSUserGachaB = {
  getUidList,
  getGachaCheck,
  getGachaRecords,
  insertGachaList,
  deleteRecords,
  mergeUIGF4,
  updateNt,
};

export default TSUserGachaB;
