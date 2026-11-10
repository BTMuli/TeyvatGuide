/**
 * 用户背包材料模块
 * @since Beta v0.13.1
 */
import { platform } from "@tauri-apps/plugin-os";
import fmtUtil from "@utils/display/fmtUtil.js";
import { getCalculateInventory } from "@utils/game/cultivationPlan.js";

import TGSqlite from "../index.js";

import { WikiMaterialData } from "@/data/index.js";

export const SKIP_BAG_TYPES: ReadonlyArray<string> = ["角色成长", "系统开放", "好感成长"];

/**
 * 默认材料页签下的材料类型排序
 * @since Beta v0.11.3
 */
export const BAG_DEFAULT_ORDER = <const>[
  "高级兑换券",
  "普通兑换券",
  "限定祈愿道具",
  "祈愿道具",
  "稀有货币",
  "通用货币",
  "七国徽印",
  "角色经验素材",
  "武器强化素材",
  "锻造用矿石",
  "药剂",
  "角色成长",
  "系统开放",
  "好感成长",
  "挑战结算道具",
  "传说任务解锁道具",
  "徽印",
  "圣遗物强化素材",
];

/**
 * 角色与武器培养素材页签下的材料类型排序
 * @since Beta v0.11.3
 */
export const BAG_CW_ORDER = <const>[
  "角色天赋素材",
  "角色突破素材",
  "武器突破素材",
  "角色培养素材",
  "角色与武器培养素材",
];

/**
 * 区域特产页签下的材料类型排序
 * @since Beta v0.11.3
 */
export const BAG_AREAM_ORDER = <const>[
  "蒙德区域特产",
  "璃月区域特产",
  "稻妻区域特产",
  "须弥区域特产",
  "枫丹区域特产",
  "纳塔区域特产",
  "挪德卡莱区域特产",
  "至冬区域特产",
];

const BAG_OTHER_ORDER = <const>[
  "贵重物品",
  "冒险道具",
  "任务道具",
  "圣物匣",
  "食材",
  "食物",
  "素材",
  "消耗品",
  "小道具",
];
const BAG_TYPE_ORDER: ReadonlyArray<string> = [
  ...BAG_DEFAULT_ORDER,
  ...BAG_CW_ORDER,
  ...BAG_AREAM_ORDER,
  ...BAG_OTHER_ORDER,
];
const YAE_PROP_MATERIAL_IDS: ReadonlySet<number> = new Set([201, 202, 203, 204, 206, 207]);

/**
 * 获取材料类型排序序号
 * @since Beta v0.11.3
 * @param type - 材料类型
 * @returns 排序序号
 */
export function getBagTypeOrder(type: string): number {
  const index = BAG_TYPE_ORDER.indexOf(type);
  return index === -1 ? BAG_TYPE_ORDER.length : index;
}

/**
 * 判断材料是否可在背包中记录
 * @since Beta v0.11.3
 * @param material - WIKI 材料信息
 * @returns 是否可记录
 */
export function isTrackableBagMaterial(material: TGApp.App.Material.WikiItem): boolean {
  return !SKIP_BAG_TYPES.includes(material.type);
}

/**
 * 获取有效材料ID
 * @since Beta v0.11.3
 * @returns ID列表
 */
function getValidMIds(): Array<number> {
  const filter = WikiMaterialData.filter(isTrackableBagMaterial);
  return filter.map((f) => f.id);
}

/**
 * 插入或更新材料数据
 * @since Beta v0.13.1
 * @param uid - 存档UID
 * @param itemId - 材料ID
 * @param count - 材料数量
 * @param manual - 是否手动
 * @returns 无返回值
 */
async function insertMaterial(
  uid: number,
  itemId: number,
  count: number,
  manual: boolean = false,
): Promise<void> {
  const now = Date.now();
  const statements: Array<TGApp.App.Sqlite.SqlStatement> = [
    {
      query: `INSERT INTO UserBagMaterial(uid, id, count, updated)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT(uid, id) DO UPDATE SET
                count = $3,
                updated = $4;`,
      values: [uid, itemId, count, fmtUtil.dateTime(now)],
    },
    {
      query: `INSERT INTO UserBagMaterialRecord(uid, materialId, time, count, manual)
              VALUES ($1, $2, $3, $4, $5);`,
      values: [uid, itemId, Math.floor(now / 1000), count, manual ? 1 : 0],
    },
  ];
  await TGSqlite.executeTransaction(statements);
}

/**
 * 删除记录
 * @since Beta v0.13.1
 * @param uid - 存档UID
 * @param itemId - 材料ID
 * @param count - 材料数量
 * @returns 无返回值
 */
async function deleteRecord(uid: number, itemId: number, count: number): Promise<void> {
  const now = Date.now();
  const statements: Array<TGApp.App.Sqlite.SqlStatement> = [
    {
      query: "DELETE FROM UserBagMaterialRecord WHERE uid = $1 AND materialId = $2;",
      values: [uid, itemId],
    },
    {
      query: `INSERT INTO UserBagMaterial(uid, id, count, updated)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT(uid, id) DO UPDATE SET
                count = $3,
                updated = $4;`,
      values: [uid, itemId, count, fmtUtil.dateTime(now)],
    },
    {
      query: `INSERT INTO UserBagMaterialRecord(uid, materialId, time, count, manual)
              VALUES ($1, $2, $3, $4, $5);`,
      values: [uid, itemId, Math.floor(now / 1000), count, 0],
    },
  ];
  await TGSqlite.executeTransaction(statements);
}

/**
 * 删除指定时间的一条材料历史记录，至少保留一条且不修改当前库存。
 * @since Beta v0.13.1
 * @param uid - 存档 UID
 * @param itemId - 材料 ID
 * @param time - 记录时间戳（秒）
 * @returns 是否成功删除记录
 */
async function deleteSingleRecord(uid: number, itemId: number, time: number): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const result = await db.execute(
    `DELETE FROM UserBagMaterialRecord
     WHERE uid = $1 AND materialId = $2 AND time = $3
       AND EXISTS (
         SELECT 1 FROM UserBagMaterialRecord AS other
         WHERE other.uid = $1 AND other.materialId = $2 AND other.time <> $3
       );`,
    [uid, itemId, time],
  );
  return result.rowsAffected > 0;
}

/**
 * 获取UID列表
 * @since Beta v0.9.0
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserBagMaterial");
  return res.map((u) => u.uid);
}

/**
 * 删除指定UID数据
 * @since Beta v0.13.1
 */
async function delUid(uid: number): Promise<void> {
  await TGSqlite.executeTransaction([
    {
      query: "DELETE FROM UserBagMaterialRecord WHERE uid = $1;",
      values: [uid],
    },
    {
      query: "DELETE FROM UserBagMaterial WHERE uid = $1;",
      values: [uid],
    },
  ]);
}

/**
 * 获取指定UID的材料数据
 * @since Beta v0.13.1
 * @param uid - 存档UID
 * @param id - 材料ID
 * @returns 材料数据
 */
async function getMaterial(
  uid: number,
  id?: number,
): Promise<Array<TGApp.Sqlite.UserBag.MaterialTable>> {
  const db = await TGSqlite.getDB();
  let res: Array<TGApp.Sqlite.UserBag.MaterialTable>;
  if (id !== undefined) {
    res = await db.select<Array<TGApp.Sqlite.UserBag.MaterialTable>>(
      "SELECT uid, id, count, updated FROM UserBagMaterial WHERE uid = $1 AND id = $2;",
      [uid, id],
    );
  } else {
    res = await db.select<Array<TGApp.Sqlite.UserBag.MaterialTable>>(
      "SELECT uid, id, count, updated FROM UserBagMaterial WHERE uid = $1;",
      [uid],
    );
  }
  const validIds = new Set<number>(getValidMIds());
  const list = res.filter((item) => validIds.has(item.id));
  if (id !== undefined) return list;
  const ids = new Set<number>(validIds);
  for (const item of list) if (ids.has(item.id)) ids.delete(item.id);
  for (const item of ids) list.push({ uid: uid, id: item, count: 0, updated: "" });
  return list;
}

/**
 * 获取材料更新记录
 * @since Beta v0.13.1
 * @param uid - 存档UID
 * @param id - 材料ID
 * @returns 按时间倒序排列的更新记录
 */
async function getRecords(
  uid: number,
  id: number,
): Promise<Array<TGApp.Sqlite.UserBag.MaterialRecord>> {
  const db = await TGSqlite.getDB();
  const rows = await db.select<Array<{ count: number; time: number; manual: number }>>(
    `SELECT count, time, manual
     FROM UserBagMaterialRecord
     WHERE uid = $1 AND materialId = $2
     ORDER BY time DESC;`,
    [uid, id],
  );
  return rows.map((row) => ({
    count: row.count,
    time: row.time,
    ...(row.manual === 1 ? { manual: true } : {}),
  }));
}

/**
 * 保存Yae获取的材料数据
 * @since Beta v0.13.1
 * @param uid - 存档UID
 * @param list - 材料数据
 * @returns 无返回值
 */
async function saveYaeData(
  uid: number,
  list: Array<TGApp.Plugins.Yae.BagItemMaterial>,
): Promise<{ total: number; skip: number }> {
  let skip = 0;
  const ids = new Set<number>(getValidMIds());
  for (const id of YAE_PROP_MATERIAL_IDS) ids.delete(id);
  const newList = list.filter((item) => ids.has(item.item_id));
  for (const item of newList) if (ids.has(item.item_id)) ids.delete(item.item_id);
  // 处理0数据
  for (const item of ids.values()) {
    newList.push({ item_id: item, kind: "material", info: { count: 0 } });
  }
  for (const item of newList) {
    const read = await getMaterial(uid, item.item_id);
    if (read.length === 0) {
      await insertMaterial(uid, item.item_id, item.info.count);
      continue;
    }
    const local = read[0];
    // 数量相同，不更新
    if (item.info.count === local.count) {
      skip++;
      continue;
    }
    await insertMaterial(uid, item.item_id, item.info.count);
  }
  return { total: newList.length, skip: skip };
}

/**
 * 保存货币数据
 * @since Beta v0.13.1
 * @param uid - 存档UID
 * @param id - 货币ID
 * @param cnt - 货币数量
 * @returns 无返回值
 */
async function saveYaeCoin(uid: number, id: number, cnt: number): Promise<void> {
  const read = await getMaterial(uid, id);
  if (read.length === 0) {
    await insertMaterial(uid, id, cnt);
    return;
  }
  const local = read[0];
  if (cnt === local.count) return;
  await insertMaterial(uid, id, cnt);
}

/**
 * 使用养成接口返回的背包材料更新背包存档。
 *
 * `available_material` 会覆盖对应材料。合成产物往往只出现在 `overall_consume` 里，这里把扣掉
 * 仍可合成量后的持有量作为下界补写，避免刷新后只更新蓝/绿、紫色仍停在合成前。
 * macOS 无需已有背包存档，接口解析数量直接回写，允许减少或归零；其他平台保留下界补写。
 * @since Beta v0.13.1
 * @param uid - 存档 UID
 * @param result - 接口养成计算结果
 * @returns 发生变更的材料数量
 */
async function saveCalculateData(
  uid: number,
  result: TGApp.Game.Calculate.Result,
): Promise<number> {
  if (!result.has_user_info) return 0;
  const preferApiInventory = platform() === "macos";
  const db = await TGSqlite.getDB();
  const bagRows = await db.select<Array<{ value: number }>>(
    "SELECT 1 AS value FROM UserBagMaterial WHERE uid = $1 LIMIT 1;",
    [uid],
  );
  if (!preferApiInventory && bagRows.length === 0) return 0;
  const validIds = new Set<number>(getValidMIds());
  const calculated = getCalculateInventory(result);
  if (preferApiInventory) {
    let changed = 0;
    for (const [materialId, count] of calculated) {
      if (!validIds.has(materialId)) continue;
      const [local] = await getMaterial(uid, materialId);
      if (local?.updated && local.count === count) continue;
      await insertMaterial(uid, materialId, count);
      changed++;
    }
    return changed;
  }
  const written = new Map<number, number>();
  let changed = 0;
  for (const material of result.available_material) {
    if (!validIds.has(material.id)) continue;
    const count = Math.max(material.num, 0);
    written.set(material.id, count);
    const read = await getMaterial(uid, material.id);
    const local = read[0];
    if (local?.updated && local.count === count) continue;
    await insertMaterial(uid, material.id, count);
    changed++;
  }
  for (const [materialId, count] of calculated) {
    if (!validIds.has(materialId) || (written.get(materialId) ?? 0) >= count) continue;
    const read = await getMaterial(uid, materialId);
    const local = read[0];
    if ((local?.count ?? 0) >= count) continue;
    await insertMaterial(uid, materialId, count);
    changed++;
  }
  return changed;
}

const TSUserBagMaterial = {
  getAllUid,
  delUid,
  saveYaeData,
  saveYaeCoin,
  saveCalculateData,
  getMaterial,
  getRecords,
  insertMaterial,
  deleteRecord,
  deleteSingleRecord,
  getValidMIds,
};

export default TSUserBagMaterial;
