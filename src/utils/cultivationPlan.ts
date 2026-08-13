/**
 * 养成计划材料聚合工具
 * @since Beta v0.11.5
 */

import type { CraftableMaterial, CultivationMaterial } from "@utils/userCalc.js";
import userCalc, { calculateCraftingAllocation } from "@utils/userCalc.js";

/**
 * 养成计划的材料分配结果。
 * @since Beta v0.11.5
 */
export type PlanMaterialAllocation = {
  /** 按目标 ID 保存的实际材料分配结果 */
  entries: Map<string, Array<TGApp.App.UserCalc.ResultMaterial>>;
  /** 所有活动目标的汇总材料结果 */
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  /** 分配完成后尚未使用的背包材料 */
  remainingInventory: Map<number, number>;
};

/**
 * 将单个目标的重复材料需求合并。
 * @since Beta v0.11.5
 */
function aggregateRequirements(
  items: ReadonlyArray<TGApp.Sqlite.Cultivation.Item>,
): Map<number, number> {
  const requirements = new Map<number, number>();
  for (const item of items) {
    const required = Math.max(item.required, 0);
    requirements.set(item.materialId, (requirements.get(item.materialId) ?? 0) + required);
  }
  return requirements;
}

/**
 * 根据材料 Wiki 数据构建合成消耗展示项。
 * @since Beta v0.11.5
 */
function buildCraftingCosts(
  crafting: CraftableMaterial | undefined,
  inventory: ReadonlyMap<number, number>,
  materialMap: ReadonlyMap<number, TGApp.App.Material.WikiItem>,
): Array<TGApp.App.UserCalc.CraftingCost> {
  return (crafting?.consumed ?? [])
    .map((cost) => {
      const material = materialMap.get(cost.id);
      return {
        id: cost.id,
        name: material?.name ?? `材料 ${cost.id}`,
        type: material?.type ?? "未知类型",
        star: material?.star ?? 1,
        count: cost.count,
        owned: inventory.get(cost.id) ?? 0,
      };
    })
    .sort((a, b) => b.star - a.star || a.id - b.id);
}

/**
 * 按目标优先级分配计划库存并汇总材料完成情况。
 * @since Beta v0.11.5
 * @param entries - 养成目标列表
 * @param inventory - 计划可用背包材料
 * @param materials - 材料 Wiki 数据
 * @returns 各目标、计划汇总及剩余库存的分配结果
 */
export function allocatePlanMaterials(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): PlanMaterialAllocation {
  const materialMap = new Map(materials.map((material) => <const>[material.id, material]));
  let remainingInventory = new Map(inventory);
  const allocatedEntries = new Map<string, Array<TGApp.App.UserCalc.ResultMaterial>>();

  const activeEntries = entries
    .filter((entry) => entry.status === "active")
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.created.localeCompare(b.created) || a.id.localeCompare(b.id),
    );

  for (const entry of activeEntries) {
    const requirements = aggregateRequirements(entry.items);
    const ownedMaterials = new Map<number, number>();
    for (const [materialId, required] of requirements) {
      const owned = Math.min(Math.max(remainingInventory.get(materialId) ?? 0, 0), required);
      ownedMaterials.set(materialId, owned);
      remainingInventory.set(materialId, (remainingInventory.get(materialId) ?? 0) - owned);
    }

    const unmetRequirements = Array.from(requirements, ([id, required]) => ({
      id,
      count: required - (ownedMaterials.get(id) ?? 0),
    }));
    const inventoryBeforeCrafting = remainingInventory;
    const craftingAllocation = entry.allowCrafting
      ? calculateCraftingAllocation(
          unmetRequirements,
          inventoryBeforeCrafting,
          materials,
          entry.useDust,
          entry.useSolvent,
        )
      : undefined;
    if (craftingAllocation) remainingInventory = craftingAllocation.remainingInventory;

    const entryMaterials = Array.from(requirements, ([id, required]) => {
      const material = materialMap.get(id);
      const owned = ownedMaterials.get(id) ?? 0;
      const crafting = craftingAllocation?.materials.get(id);
      const craftable = crafting?.count ?? 0;
      const available = owned + craftable;
      return {
        id,
        name: material?.name ?? `材料 ${id}`,
        type: material?.type ?? "未知类型",
        star: material?.star ?? 1,
        required,
        owned,
        craftable,
        craftingCosts: buildCraftingCosts(crafting, inventoryBeforeCrafting, materialMap),
        missing: Math.max(required - available, 0),
        progress: required === 0 ? 100 : Math.min((available / required) * 100, 100),
      };
    });
    allocatedEntries.set(entry.id, sortCultivationResults(entryMaterials));
  }

  const aggregate = new Map<
    number,
    {
      required: number;
      owned: number;
      craftable: number;
      craftingCosts: Map<number, number>;
    }
  >();
  for (const entryMaterials of allocatedEntries.values()) {
    for (const result of entryMaterials) {
      const current = aggregate.get(result.id) ?? {
        required: 0,
        owned: 0,
        craftable: 0,
        craftingCosts: new Map<number, number>(),
      };
      current.required += result.required;
      current.owned += result.owned;
      current.craftable += result.craftable;
      for (const cost of result.craftingCosts) {
        current.craftingCosts.set(cost.id, (current.craftingCosts.get(cost.id) ?? 0) + cost.count);
      }
      aggregate.set(result.id, current);
    }
  }

  const resultMaterials = Array.from(aggregate, ([id, result]) => {
    const material = materialMap.get(id);
    const available = result.owned + result.craftable;
    return {
      id,
      name: material?.name ?? `材料 ${id}`,
      type: material?.type ?? "未知类型",
      star: material?.star ?? 1,
      required: result.required,
      owned: result.owned,
      craftable: result.craftable,
      craftingCosts: Array.from(result.craftingCosts, ([costId, count]) => {
        const cost = materialMap.get(costId);
        return {
          id: costId,
          name: cost?.name ?? `材料 ${costId}`,
          type: cost?.type ?? "未知类型",
          star: cost?.star ?? 1,
          count,
          owned: inventory.get(costId) ?? 0,
        };
      }).sort((a, b) => b.star - a.star || a.id - b.id),
      missing: Math.max(result.required - available, 0),
      progress: result.required === 0 ? 100 : Math.min((available / result.required) * 100, 100),
    };
  });

  return {
    entries: allocatedEntries,
    materials: sortCultivationResults(resultMaterials),
    remainingInventory,
  };
}

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
 * 从接口计算结果解析用户当前可用材料
 *
 * 接口不会始终在 `available_material` 中返回摩拉等材料，此时使用总需求与缺口数量推导。
 * @since Beta v0.11.2
 * @param result - 接口养成计算结果
 * @returns 材料 ID 与当前可用数量映射
 */
export function getCalculateInventory(result: TGApp.Game.Calculate.Result): Map<number, number> {
  const inventory = new Map(
    result.available_material.map((material) => [material.id, material.num]),
  );
  for (const material of result.overall_consume) {
    if (inventory.has(material.id)) continue;
    const inferredCount = Math.max(material.num - material.lack_num, 0);
    inventory.set(material.id, inferredCount);
  }
  return inventory;
}

/**
 * 将比背包记录更新的接口库存下界合并到计划库存。
 *
 * 每种材料只采用最新接口快照；接口在材料充足时最多返回本次需求量，因此仅提高库存下界。接口
 * 确认不足的数据会先回写背包，写入时间会使更早的接口快照失效。
 * @since Beta v0.11.5
 * @param inventory - 本地背包材料
 * @param bagMaterials - 本地背包材料记录
 * @param entries - 养成目标列表
 * @returns 合并后的材料 ID 与可用数量映射
 */
export function mergePlanInventory(
  inventory: ReadonlyMap<number, number>,
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>,
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
): Map<number, number> {
  const merged = new Map(inventory);
  const latestApiInventory = new Map<number, { count: number; updated: string }>();
  for (const entry of entries) {
    if (entry.calculationMode !== "api" || !entry.apiResult) continue;
    for (const [materialId, count] of getCalculateInventory(entry.apiResult.result)) {
      const current = latestApiInventory.get(materialId);
      if (current && Date.parse(current.updated) >= Date.parse(entry.apiResult.updated)) continue;
      latestApiInventory.set(materialId, { count, updated: entry.apiResult.updated });
    }
  }
  for (const [materialId, apiInventory] of latestApiInventory) {
    const bagUpdated = bagMaterials.get(materialId)?.updated ?? "";
    if (bagUpdated.length > 0 && Date.parse(bagUpdated) >= Date.parse(apiInventory.updated))
      continue;
    merged.set(materialId, Math.max(merged.get(materialId) ?? 0, apiInventory.count));
  }
  return merged;
}

/**
 * 根据需求和背包构建材料完成情况
 * @since Beta v0.11.2
 * @param requirements - 材料需求
 * @param inventory - 背包材料
 * @param materials - 材料 Wiki 数据
 * @param allowCrafting - 是否允许合成
 * @param useDust - 是否允许使用嬗变之尘
 * @param useSolvent - 是否允许使用异梦溶媒
 * @returns 材料完成情况
 */
export function buildCultivationResults(
  requirements: ReadonlyArray<CultivationMaterial>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  allowCrafting: boolean,
  useDust: boolean,
  useSolvent: boolean,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const craftableMaterials: Map<number, CraftableMaterial> = allowCrafting
    ? userCalc.craft(requirements, inventory, materials, useDust, useSolvent)
    : new Map();
  return sortCultivationResults(
    requirements.map((required) => {
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
    }),
  );
}

/**
 * 按养成用途及完成状态排列材料结果。
 * @since Beta v0.11.4
 * @param results - 材料完成情况
 * @returns 排序后的材料完成情况
 */
export function sortCultivationResults(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  return [...results].sort((a, b) => b.missing - a.missing || b.star - a.star || a.id - b.id);
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
    material?.source.filter(
      (source) => source.type === "domain" && (source.days?.length ?? 0) > 0,
    ) ?? [];
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
