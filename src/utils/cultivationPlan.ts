/**
 * 养成计划材料聚合工具
 * @since Beta v0.11.2
 */

import userCalc, { type CraftableMaterial, type CultivationMaterial } from "@utils/userCalc.js";

/**
 * 汇总活动养成目标的材料需求
 * @since Beta v0.11.2
 * @param entries - 养成目标列表
 * @returns 聚合后的材料需求
 */
export function aggregateEntryMaterials(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
): Array<CultivationMaterial> {
  return userCalc.merge(
    ...entries
      .filter((entry) => entry.status === "active")
      .map((entry) => entry.items.map((item) => ({ id: item.materialId, count: item.required }))),
  );
}

/**
 * 根据需求和背包构建材料完成情况
 * @since Beta v0.11.2
 * @param requirements - 材料需求
 * @param inventory - 背包材料
 * @param materials - 材料 Wiki 数据
 * @param allowCrafting - 是否允许合成
 * @param useDust - 是否允许使用嬗变之尘
 * @returns 材料完成情况
 */
export function buildCultivationResults(
  requirements: ReadonlyArray<CultivationMaterial>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  allowCrafting: boolean,
  useDust: boolean,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const craftableMaterials: Map<number, CraftableMaterial> = allowCrafting
    ? userCalc.craft(requirements, inventory, materials, useDust)
    : new Map();
  return requirements
    .map((required) => {
      const info = materials.find((material) => material.id === required.id);
      const owned = inventory.get(required.id) ?? 0;
      const crafting = craftableMaterials.get(required.id);
      const craftable = crafting?.count ?? 0;
      const available = owned + craftable;
      const craftingCosts: Array<TGApp.App.UserCalc.CraftingCost> = (crafting?.consumed ?? [])
        .map((cost) => {
          const costInfo = materials.find((material) => material.id === cost.id);
          return {
            id: cost.id,
            name: costInfo?.name ?? `材料 ${cost.id}`,
            type: costInfo?.type ?? "未知类型",
            star: costInfo?.star ?? 1,
            count: cost.count,
            owned: inventory.get(cost.id) ?? 0,
          };
        })
        .sort((a, b) => b.star - a.star || a.id - b.id);
      return {
        id: required.id,
        name: info?.name ?? `材料 ${required.id}`,
        type: info?.type ?? "未知类型",
        star: info?.star ?? 1,
        required: required.count,
        owned,
        craftable,
        craftingCosts,
        missing: Math.max(required.count - available, 0),
        progress: required.count === 0 ? 100 : Math.min((available / required.count) * 100, 100),
      };
    })
    .sort((a, b) => b.missing - a.missing || b.star - a.star || a.id - b.id);
}

/**
 * 判断材料是否在指定服务器日期开放
 * @since Beta v0.11.2
 * @param materialId - 材料 ID
 * @param serverDay - 服务器星期，周日为 0
 * @param materials - 材料 Wiki 数据
 * @returns 是否今日开放
 */
export function isMaterialAvailableToday(
  materialId: number,
  serverDay: number,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): boolean {
  const material = materials.find((item) => item.id === materialId);
  const scheduledSources =
    material?.source.filter((source) => (source.days?.length ?? 0) > 0) ?? [];
  if (serverDay === 0) return scheduledSources.length > 0;
  return scheduledSources.some((source) => source.days?.includes(serverDay) === true);
}

/**
 * 获取固定服务器时区下按每日 4 点刷新的星期
 * @since Beta v0.11.2
 * @param timezone - UTC 时区偏移小时数
 * @returns 星期，周日为 0
 */
export function getServerDay(timezone: number): number {
  const serverResetOffset = (timezone - 4) * 60 * 60 * 1000;
  return new Date(Date.now() + serverResetOffset).getUTCDay();
}

/**
 * 获取固定服务器时区下按每日 4 点刷新的日期键
 * @since Beta v0.11.2
 * @param timezone - UTC 时区偏移小时数
 * @returns YYYY-MM-DD 日期
 */
export function getServerDateKey(timezone: number): string {
  const serverResetOffset = (timezone - 4) * 60 * 60 * 1000;
  return new Date(Date.now() + serverResetOffset).toISOString().slice(0, 10);
}

/**
 * 根据原神 UID 推断固定服务器时区
 * @since Beta v0.11.2
 * @param uid - 游戏 UID
 * @returns UTC 时区偏移小时数
 */
export function getUidServerTimezone(uid: number): number {
  const value = String(uid);
  if (value.startsWith("6")) return -5;
  if (value.startsWith("7")) return 1;
  return 8;
}
