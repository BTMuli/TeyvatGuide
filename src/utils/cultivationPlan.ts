/**
 * 养成计划材料聚合工具
 * @since Beta v0.12.6
 */

import { platform } from "@tauri-apps/plugin-os";
import type { CraftableMaterial, CultivationMaterial, ExperienceTarget } from "@utils/userCalc.js";
import userCalc, {
  allocateExperienceRequirements,
  calculateCraftableMaterials,
  createCraftingCalculator,
} from "@utils/userCalc.js";

import { WikiMaterialData } from "@/data/index.js";

const DUST_OF_AZOTH_ID = 104201;
const DREAM_SOLVENT_ID = 113021;
const CONVERSION_MEDIA_IDS = new Set([DUST_OF_AZOTH_ID, DREAM_SOLVENT_ID]);

/**
 * 自动媒介转换的推荐及库存快照。
 * @since Beta v0.12.6
 */
type AutomaticConversionContext = TGApp.App.UserCalc.AutomaticConversionContext;

/**
 * 养成计划的材料分配结果。
 * @since Beta v0.12.6
 */
export type PlanMaterialAllocation = TGApp.App.UserCalc.PlanMaterialAllocation;

/**
 * 媒介转换推荐准备结果。
 * @since Beta v0.12.6
 */
export type ConversionPreparation = TGApp.App.UserCalc.ConversionPreparation;

/**
 * 获取养成目标的稳定逻辑键。
 * @since Beta v0.12.6
 * @param entry - 目标的逻辑身份字段
 * @returns 可用于保存转换意图的稳定键
 */
export function getCultivationEntryKey(
  entry: Pick<TGApp.Sqlite.Cultivation.Entry, "type" | "itemId" | "instanceKey">,
): string {
  return JSON.stringify(<const>[entry.type, entry.itemId, entry.instanceKey]);
}

/**
 * 将单个目标的重复材料需求合并。
 * @since Beta v0.12.0
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
 * @since Beta v0.12.0
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
 * 合并多组材料消耗并按星级与 ID 排序。
 * @since Beta v0.12.6
 * @param costLists - 需要合并的材料消耗列表
 * @returns 合并后的有序材料消耗
 */
function mergeCraftingCosts(
  ...costLists: ReadonlyArray<ReadonlyArray<TGApp.App.UserCalc.CraftingCost>>
): Array<TGApp.App.UserCalc.CraftingCost> {
  const costs = new Map<number, TGApp.App.UserCalc.CraftingCost>();
  for (const costList of costLists) {
    for (const cost of costList) {
      if (!Number.isFinite(cost.count) || cost.count <= 0) continue;
      const previous = costs.get(cost.id);
      costs.set(cost.id, {
        ...cost,
        count: (previous?.count ?? 0) + cost.count,
        owned: Math.max(previous?.owned ?? 0, cost.owned),
      });
    }
  }
  return Array.from(costs.values()).sort((a, b) => b.star - a.star || a.id - b.id);
}

/**
 * 按材料 ID 索引的只读 Wiki 数据。
 * @since Beta v0.12.6
 */
type MaterialMap = ReadonlyMap<number, TGApp.App.Material.WikiItem>;

/**
 * 普通合成与完整转换使用的计算器集合。
 * @since Beta v0.12.6
 */
type CraftingCalculators = {
  ordinary: TGApp.App.UserCalc.CraftingCalculator;
  full: TGApp.App.UserCalc.CraftingCalculator;
};

/**
 * 单个养成目标的材料分配上下文。
 * @since Beta v0.12.6
 */
type EntryPlan = {
  entry: TGApp.Sqlite.Cultivation.EntryWithItems;
  requirements: Map<number, number>;
  directOwned: Map<number, number>;
  results: Array<TGApp.App.UserCalc.ResultMaterial>;
  explicitMaterialIds: Set<number>;
};

/**
 * 自动媒介转换后的材料分配结果。
 * @since Beta v0.12.6
 */
type MediaConversionAllocation = {
  remainingInventory: Map<number, number>;
  results: Array<TGApp.App.UserCalc.ResultMaterial>;
  automaticConversions: Array<AutomaticConversionContext>;
};

/**
 * 明确采用转换方案后的材料分配结果。
 * @since Beta v0.12.6
 */
type ExplicitConversionAllocation = {
  remainingInventory: Map<number, number>;
  results: Array<TGApp.App.UserCalc.ResultMaterial>;
  explicitMaterialIds: Set<number>;
  appliedConversions: Array<TGApp.App.UserCalc.AppliedConversion>;
};

/**
 * 复制材料结果及其嵌套消耗，避免编辑上下文共享分配结果。
 * @since Beta v0.12.6
 * @param result - 需要更新或复制的材料结果
 * @returns 不共享嵌套合成消耗的材料结果
 */
function cloneResultMaterial(
  result: TGApp.App.UserCalc.ResultMaterial,
): TGApp.App.UserCalc.ResultMaterial {
  return {
    ...result,
    craftingCosts: result.craftingCosts.map((cost) => ({ ...cost })),
  };
}

/**
 * 复制转换意图及其来源上限。
 * @since Beta v0.12.6
 * @param intent - 待复制的转换意图
 * @returns 独立复制的转换意图及来源上限
 */
function cloneConversionIntent(
  intent: TGApp.App.UserCalc.ConversionIntent,
): TGApp.App.UserCalc.ConversionIntent {
  return {
    materialId: intent.materialId,
    count: intent.count,
    sourceLimits: intent.sourceLimits.map((source) => ({ ...source })),
  };
}

/**
 * 复制转换推荐及其材料上下文。
 * @since Beta v0.12.6
 * @param recommendation - 待复制的转换推荐
 * @returns 不共享材料与消耗数组的转换推荐
 */
function cloneConversionRecommendation(
  recommendation: TGApp.App.UserCalc.ConversionRecommendation,
): TGApp.App.UserCalc.ConversionRecommendation {
  return {
    material: cloneResultMaterial(recommendation.material),
    count: recommendation.count,
    costs: recommendation.costs.map((cost) => ({ ...cost })),
  };
}

/**
 * 从库存中扣除一组实际或假设的合成消耗。
 * @since Beta v0.12.6
 * @param inventory - 可用于本轮计算的材料库存
 * @param costs - 材料消耗列表
 * @returns 扣除消耗且数量不小于零的新库存
 */
function subtractCraftingCosts(
  inventory: ReadonlyMap<number, number>,
  costs: ReadonlyArray<TGApp.App.UserCalc.CraftingCost>,
): Map<number, number> {
  const next = new Map(inventory);
  for (const cost of costs) {
    const count = Number.isFinite(cost.count) ? Math.max(cost.count, 0) : 0;
    if (count <= 0) continue;
    next.set(cost.id, Math.max((next.get(cost.id) ?? 0) - count, 0));
  }
  return next;
}

/**
 * 按计划中稳定的目标优先级排序。
 * @since Beta v0.12.6
 * @param entries - 需要排序的养成目标
 * @returns 按优先级、创建时间及 ID 排序的目标副本
 */
function sortCultivationEntries(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
): Array<TGApp.Sqlite.Cultivation.EntryWithItems> {
  return [...entries].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.created.localeCompare(b.created) || a.id.localeCompare(b.id),
  );
}

/**
 * 复制库存并把异常负值归零，避免中间计算将虚拟预留暴露给调用方。
 * @since Beta v0.12.6
 * @param inventory - 可用于本轮计算的材料库存
 * @returns 已将负数量归零的库存副本
 */
function normalizeInventory(inventory: ReadonlyMap<number, number>): Map<number, number> {
  const normalized = new Map<number, number>();
  for (const [id, count] of inventory) normalized.set(id, Math.max(count, 0));
  return normalized;
}

/**
 * 从临时分配前后库存计算真实合成消耗，并应用到实际库存。
 * @since Beta v0.12.6
 * @param inventory - 可用于本轮计算的材料库存
 * @param before - 本轮合成前的库存快照
 * @param after - 本轮合成后的库存快照
 * @returns 扣除本轮实际合成消耗后的库存副本
 */
function applyInventoryConsumption(
  inventory: ReadonlyMap<number, number>,
  before: ReadonlyMap<number, number>,
  after: ReadonlyMap<number, number>,
): Map<number, number> {
  const next = new Map(inventory);
  const ids = new Set([...before.keys(), ...after.keys()]);
  for (const id of ids) {
    const consumed = Math.max((before.get(id) ?? 0) - (after.get(id) ?? 0), 0);
    if (consumed > 0) next.set(id, Math.max((next.get(id) ?? 0) - consumed, 0));
  }
  return next;
}

/**
 * 将单个材料数量加到库存映射中。
 * @since Beta v0.12.6
 * @param inventory - 可用于本轮计算的材料库存
 * @param id - 材料 ID
 * @param count - 材料数量
 */
function addInventoryCount(inventory: Map<number, number>, id: number, count: number): void {
  inventory.set(id, (inventory.get(id) ?? 0) + count);
}

/**
 * 判断配方是否包含嬗变之尘或异梦溶媒。
 * @since Beta v0.12.6
 * @param recipe - 材料 Wiki 合成配方
 * @returns 配方是否消耗转换媒介
 */
function hasConversionMedia(recipe: TGApp.App.Material.Convert): boolean {
  return recipe.source.some((source) => CONVERSION_MEDIA_IDS.has(Number(source.id)));
}

/**
 * 判断库存中是否仍有可用于媒介转换的材料。
 * @since Beta v0.12.6
 * @param inventory - 可用于本轮计算的材料库存
 * @returns 库存中是否存在可用转换媒介
 */
function hasConversionMediaInventory(inventory: ReadonlyMap<number, number>): boolean {
  return (inventory.get(DUST_OF_AZOTH_ID) ?? 0) > 0 || (inventory.get(DREAM_SOLVENT_ID) ?? 0) > 0;
}

/**
 * 判断一次递归合成是否实际消耗了转换媒介。
 * @since Beta v0.12.6
 * @param crafting - 材料的实际合成分配结果
 * @returns 实际合成消耗是否包含转换媒介
 */
function usesConversionMedia(crafting: CraftableMaterial): boolean {
  return crafting.consumed.some((source) => CONVERSION_MEDIA_IDS.has(source.id));
}

/**
 * 构建不含媒介配方的 Wiki 快照，供普通合成阶段使用。
 * @since Beta v0.12.6
 * @param materials - 材料 Wiki 数据
 * @returns 仅保留普通合成配方的材料数据
 */
function buildOrdinaryMaterials(
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): Array<TGApp.App.Material.WikiItem> {
  return materials.map((material) => {
    const convert = material.convert.filter((recipe) => !hasConversionMedia(recipe));
    return convert.length === material.convert.length ? material : { ...material, convert };
  });
}

/**
 * 按单个目标计算稳定的材料需求，不修改目标记录或输入库存。
 * @since Beta v0.12.6
 * @param entry - 养成目标及其材料需求
 * @param inventory - 可用于本轮计算的材料库存
 * @returns 已合并并处理经验材料替代关系的目标需求
 */
function getEntryRequirements(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  inventory: ReadonlyMap<number, number>,
): Map<number, number> {
  return new Map(
    allocateExperienceRequirements(
      Array.from(aggregateRequirements(entry.items), ([id, count]) => ({ id, count })),
      inventory,
      [
        {
          type: entry.type,
          currentLevel: entry.currentState.level,
          targetLevel: entry.targetState.level,
          star: entry.star,
        },
      ],
    ).map((item) => <const>[item.id, item.count]),
  );
}

/**
 * 创建尚未计算合成的材料展示项。
 * @since Beta v0.12.6
 * @param requirements - 本轮需要满足的材料 ID 与数量
 * @param directOwned - 已预留给各材料直接需求的数量
 * @param materialMap - 按材料 ID 索引的 Wiki 数据
 * @returns 包含直接持有量及初始缺口的材料结果
 */
function createEntryResults(
  requirements: ReadonlyMap<number, number>,
  directOwned: ReadonlyMap<number, number>,
  materialMap: MaterialMap,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  return Array.from(requirements, ([id, required]) => {
    const material = materialMap.get(id);
    const owned = directOwned.get(id) ?? 0;
    return {
      id,
      name: material?.name ?? `材料 ${id}`,
      type: material?.type ?? "未知类型",
      star: material?.star ?? 1,
      required,
      owned,
      craftable: 0,
      craftingCosts: [],
      missing: Math.max(required - owned, 0),
      progress: required === 0 ? 100 : Math.min((owned / required) * 100, 100),
    };
  });
}

/**
 * 重新计算材料的缺口和进度，同时保持输入结果不可变。
 * @since Beta v0.12.6
 * @param result - 需要更新或复制的材料结果
 * @param craftable - 可通过合成补足的数量
 * @param craftingCosts - 实际发生的材料合成消耗
 * @returns 按合成量与消耗更新后的材料结果
 */
function updateResultMaterial(
  result: TGApp.App.UserCalc.ResultMaterial,
  craftable: number,
  craftingCosts: ReadonlyArray<TGApp.App.UserCalc.CraftingCost>,
): TGApp.App.UserCalc.ResultMaterial {
  const available = result.owned + craftable;
  return {
    ...result,
    craftable,
    craftingCosts: [...craftingCosts],
    missing: Math.max(result.required - available, 0),
    progress: result.required === 0 ? 100 : Math.min((available / result.required) * 100, 100),
  };
}

/**
 * 将一次合成分配应用到目标结果。
 * @since Beta v0.12.6
 * @param results - 目标材料需求与分配结果
 * @param allocation - 当前计算器生成的合成分配结果
 * @param inventory - 可用于本轮计算的材料库存
 * @param materialMap - 按材料 ID 索引的 Wiki 数据
 * @returns 应用本轮合成结果后的材料列表
 */
function applyCraftingAllocation(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  allocation: ReadonlyMap<number, CraftableMaterial>,
  inventory: ReadonlyMap<number, number>,
  materialMap: MaterialMap,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  return sortCultivationResults(
    results.map((result) => {
      const crafting = allocation.get(result.id);
      if (!crafting || crafting.count <= 0) return result;
      return updateResultMaterial(result, result.craftable + crafting.count, [
        ...result.craftingCosts,
        ...buildCraftingCosts(crafting, inventory, materialMap),
      ]);
    }),
  );
}

/**
 * 在已经预留直接库存的余量中执行普通合成。
 * 合成计算器需要看到当前目标的直接持有量，因此只把这一目标的直接量作为
 * 虚拟输入加回；全局余量中的其他目标直接量始终不会进入该函数。
 * @since Beta v0.12.6
 * @param requirements - 本轮需要满足的材料 ID 与数量
 * @param directOwned - 已预留给各材料直接需求的数量
 * @param results - 目标材料需求与分配结果
 * @param inventory - 可用于本轮计算的材料库存
 * @param materialMap - 按材料 ID 索引的 Wiki 数据
 * @param calculator - 本轮复用的材料合成计算器
 * @returns 普通合成分配后的结果与库存
 */
function allocateOrdinaryCrafting(
  requirements: ReadonlyMap<number, number>,
  directOwned: ReadonlyMap<number, number>,
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  inventory: ReadonlyMap<number, number>,
  materialMap: MaterialMap,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
): MediaConversionAllocation {
  const calculationInventory = new Map(inventory);
  for (const [id, count] of directOwned) addInventoryCount(calculationInventory, id, count);
  const requirementsList = Array.from(requirements, ([id, count]) => ({ id, count }));
  const allocation = calculator(requirementsList, calculationInventory, false, false);
  return {
    remainingInventory: allocation.remainingInventory,
    results: applyCraftingAllocation(results, allocation.materials, inventory, materialMap),
    automaticConversions: [],
  };
}

/**
 * 按允许的媒介转换配方为当前目标补足材料。
 * @since Beta v0.12.6
 * @param results - 目标材料需求与分配结果
 * @param inventory - 可用于本轮计算的材料库存
 * @param materialMap - 按材料 ID 索引的 Wiki 数据
 * @param calculator - 本轮复用的材料合成计算器
 * @param useDust - 是否允许使用含嬗变之尘的配方
 * @param useSolvent - 是否允许使用含异梦溶媒的配方
 * @returns 自动媒介转换后的材料、库存及推荐上下文
 */
function allocateMediaConversions(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  inventory: ReadonlyMap<number, number>,
  materialMap: MaterialMap,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
  useDust: boolean,
  useSolvent: boolean,
): MediaConversionAllocation {
  let remainingInventory = new Map(inventory);
  const automaticConversions: Array<AutomaticConversionContext> = [];
  if (
    (!useDust || (remainingInventory.get(DUST_OF_AZOTH_ID) ?? 0) <= 0) &&
    (!useSolvent || (remainingInventory.get(DREAM_SOLVENT_ID) ?? 0) <= 0)
  ) {
    return { remainingInventory, results: [...results], automaticConversions };
  }
  let nextResults = [...results];
  for (const result of sortCultivationResults(results)) {
    const missing = Math.max(result.required - result.owned - result.craftable, 0);
    if (missing <= 0) continue;
    const material = materialMap.get(result.id);
    if (!material) continue;
    const canUseDust = useDust && (remainingInventory.get(DUST_OF_AZOTH_ID) ?? 0) > 0;
    const canUseSolvent = useSolvent && (remainingInventory.get(DREAM_SOLVENT_ID) ?? 0) > 0;
    if (!canUseDust && !canUseSolvent) break;
    const beforeTarget = new Map(remainingInventory);
    const allocation = calculator(
      [{ id: result.id, count: missing }],
      remainingInventory,
      canUseDust,
      canUseSolvent,
    );
    const crafting = allocation.materials.get(result.id);
    if (!crafting || crafting.count <= 0) continue;
    remainingInventory = allocation.remainingInventory;
    const costs = buildCraftingCosts(crafting, beforeTarget, materialMap);
    automaticConversions.push({
      recommendation: {
        material: cloneResultMaterial(result),
        count: crafting.count,
        costs: costs.map((cost) => ({ ...cost })),
      },
      inventory: new Map(beforeTarget),
    });
    nextResults = nextResults.map((item) =>
      item.id === result.id
        ? updateResultMaterial(item, item.craftable + crafting.count, [
            ...item.craftingCosts,
            ...costs,
          ])
        : item,
    );
  }
  return {
    remainingInventory,
    results: sortCultivationResults(nextResults),
    automaticConversions,
  };
}

/**
 * 按目标材料顺序应用明确的转换意图，并记录可重新打开编辑器的原始上下文。
 * @since Beta v0.12.6
 * @param results - 目标材料需求与分配结果
 * @param inventory - 可用于本轮计算的材料库存
 * @param materials - 材料 Wiki 数据
 * @param calculator - 本轮复用的材料合成计算器
 * @param intents - 待处理的转换意图列表
 * @returns 已采用方案应用后的材料、库存与转换记录
 */
function allocateExplicitConversions(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
  intents: ReadonlyArray<TGApp.App.UserCalc.ConversionIntent>,
): ExplicitConversionAllocation {
  let remainingInventory = new Map(inventory);
  let nextResults = results.map(cloneResultMaterial);
  const orderedResults = sortCultivationResults(results);
  const resultOrder = new Map(orderedResults.map((result, index) => [result.id, index]));
  const orderedIntents = intents
    .map((intent, index) => ({ intent, index, order: resultOrder.get(intent.materialId) }))
    .filter(
      (
        item,
      ): item is { intent: TGApp.App.UserCalc.ConversionIntent; index: number; order: number } =>
        item.order !== undefined,
    )
    .sort((a, b) => a.order - b.order || a.index - b.index);
  const explicitMaterialIds = new Set<number>();
  const appliedConversions: Array<TGApp.App.UserCalc.AppliedConversion> = [];

  for (const { intent } of orderedIntents) {
    explicitMaterialIds.add(intent.materialId);
    const result = nextResults.find((item) => item.id === intent.materialId);
    if (!result) continue;
    const beforeResult = cloneResultMaterial(result);
    const beforeInventory = new Map(remainingInventory);
    const sourceLimits = new Map(intent.sourceLimits.map((source) => [source.id, source.count]));
    const preview = calculateConversionPreviewWithCalculator(
      beforeResult,
      beforeInventory,
      materials,
      sourceLimits,
      intent.count,
      calculator,
    );
    const recommendation = cloneConversionRecommendation(preview);
    remainingInventory = subtractCraftingCosts(remainingInventory, recommendation.costs);
    nextResults = nextResults.map((item) =>
      item.id === result.id
        ? updateResultMaterial(item, item.craftable + recommendation.count, [
            ...item.craftingCosts,
            ...recommendation.costs,
          ])
        : item,
    );
    appliedConversions.push({
      intent: cloneConversionIntent(intent),
      recommendation,
      plannedCosts: calculateConversionPlanWithCalculator(
        beforeResult,
        beforeInventory,
        materials,
        sourceLimits,
        intent.count,
        recommendation,
        calculator,
      ).costs,
      inventory: new Map(beforeInventory),
    });
  }

  return {
    remainingInventory,
    results: sortCultivationResults(nextResults),
    explicitMaterialIds,
    appliedConversions,
  };
}

/**
 * 合并多个目标的材料结果，并按来源 ID 合并实际合成消耗。
 * @since Beta v0.12.6
 * @param results - 待合并的材料结果
 * @returns 合并后的材料结果
 */
export function mergeCultivationResults(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const merged = new Map<
    number,
    {
      base: TGApp.App.UserCalc.ResultMaterial;
      required: number;
      owned: number;
      craftable: number;
      costs: Map<number, TGApp.App.UserCalc.CraftingCost>;
    }
  >();
  for (const result of results) {
    const current = merged.get(result.id);
    if (!current) {
      const costs = new Map<number, TGApp.App.UserCalc.CraftingCost>();
      for (const cost of result.craftingCosts) {
        const existing = costs.get(cost.id);
        if (existing) {
          existing.count += cost.count;
          existing.owned = Math.max(existing.owned, cost.owned);
        } else {
          costs.set(cost.id, { ...cost });
        }
      }
      merged.set(result.id, {
        base: { ...result, craftingCosts: [...result.craftingCosts] },
        required: result.required,
        owned: result.owned,
        craftable: result.craftable,
        costs,
      });
      continue;
    }
    current.required += result.required;
    current.owned += result.owned;
    current.craftable += result.craftable;
    for (const cost of result.craftingCosts) {
      const existing = current.costs.get(cost.id);
      if (existing) {
        existing.count += cost.count;
        existing.owned = Math.max(existing.owned, cost.owned);
      } else {
        current.costs.set(cost.id, { ...cost });
      }
    }
  }
  return sortCultivationResults(
    Array.from(merged.values(), (result) => {
      const available = result.owned + result.craftable;
      return {
        ...result.base,
        required: result.required,
        owned: result.owned,
        craftable: result.craftable,
        craftingCosts: Array.from(result.costs.values()).sort(
          (a, b) => b.star - a.star || a.id - b.id,
        ),
        missing: Math.max(result.required - available, 0),
        progress: result.required === 0 ? 100 : Math.min((available / result.required) * 100, 100),
      };
    }),
  );
}

/**
 * 使用已构建的普通合成计算器预留转换推荐来源。
 * @since Beta v0.12.6
 * @param results - 目标材料需求与分配结果
 * @param remainingInventory - 已扣除直接需求及已采用合成的库存余量
 * @param calculator - 本轮复用的材料合成计算器
 * @param protectedResults - 需优先保护普通合成来源的其他目标结果
 * @returns 预留普通合成来源后的库存和材料缺口
 */
function prepareConversionRecommendationsWithCalculator(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  remainingInventory: ReadonlyMap<number, number>,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
  protectedResults: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial> = [],
): ConversionPreparation {
  const orderedResults = sortCultivationResults(results);
  let ordinaryRemaining = new Map(remainingInventory);

  // 单目标编辑只展示自身建议，但仍须保护计划中其余目标尚未采用的普通合成来源。
  if (protectedResults.length > 0) {
    ordinaryRemaining = calculator(
      protectedResults.map((result) => ({ id: result.id, count: result.missing })),
      ordinaryRemaining,
      false,
      false,
    ).remainingInventory;
  }

  const missing = new Map<number, number>();
  // 先在临时库存中预留全部普通合成，避免媒介建议抢走普通合成所需的来源材料。
  for (const result of orderedResults) {
    const requiredMissing = Math.max(result.required - result.owned - result.craftable, 0);
    if (requiredMissing <= 0) {
      missing.set(result.id, 0);
      continue;
    }
    const allocation = calculator(
      [{ id: result.id, count: requiredMissing }],
      ordinaryRemaining,
      false,
      false,
    );
    const crafted = allocation.materials.get(result.id)?.count ?? 0;
    ordinaryRemaining = allocation.remainingInventory;
    missing.set(result.id, Math.max(requiredMissing - crafted, 0));
  }

  return { inventory: ordinaryRemaining, missing };
}

/**
 * 预留媒介转换推荐所需的普通合成来源。
 * @since Beta v0.12.6
 * @param results - 当前待补足的材料结果
 * @param remainingInventory - 已扣除直接需求及已采用合成的库存余量
 * @param materials - 材料 Wiki 数据
 * @param protectedResults - 需优先预留普通合成来源的其他目标结果
 * @returns 预留普通合成来源后的库存及各目标的普通合成后缺口
 */
export function prepareConversionRecommendations(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  remainingInventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  protectedResults: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial> = [],
): ConversionPreparation {
  const ordinaryMaterials = buildOrdinaryMaterials(materials);
  return prepareConversionRecommendationsWithCalculator(
    results,
    normalizeInventory(remainingInventory),
    createCraftingCalculator(ordinaryMaterials),
    protectedResults,
  );
}

/**
 * 基于已完成的普通合成预留结果生成媒介转换建议。
 * @since Beta v0.12.6
 * @param results - 目标材料需求与分配结果
 * @param preparation - 预留普通合成来源后的库存与缺口
 * @param materialMap - 按材料 ID 索引的 Wiki 数据
 * @param calculator - 本轮复用的材料合成计算器
 * @returns 不占用受保护普通合成来源的转换推荐
 */
function buildConversionRecommendationsFromPreparation(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  preparation: ConversionPreparation,
  materialMap: ReadonlyMap<number, TGApp.App.Material.WikiItem>,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
): Array<TGApp.App.UserCalc.ConversionRecommendation> {
  const ordinaryMissing = preparation.missing;
  const ordinaryRemaining = preparation.inventory;
  const recommendations: Array<TGApp.App.UserCalc.ConversionRecommendation> = [];
  if (!hasConversionMediaInventory(ordinaryRemaining)) return recommendations;
  const orderedResults = sortCultivationResults(results);
  let available = new Map(ordinaryRemaining);
  const ownedBeforeRecommendations = new Map(available);
  for (const result of orderedResults) {
    const missing = ordinaryMissing.get(result.id) ?? 0;
    if (missing <= 0) continue;
    const material = materialMap.get(result.id);
    if (!material) continue;
    const canUseDust = (available.get(DUST_OF_AZOTH_ID) ?? 0) > 0;
    const canUseSolvent = (available.get(DREAM_SOLVENT_ID) ?? 0) > 0;
    if (!canUseDust && !canUseSolvent) break;
    const allocation = calculator(
      [{ id: result.id, count: missing }],
      available,
      canUseDust,
      canUseSolvent,
    );
    const crafting = allocation.materials.get(result.id);
    if (!crafting || crafting.count <= 0 || !usesConversionMedia(crafting)) continue;
    available = allocation.remainingInventory;
    recommendations.push({
      material: {
        ...result,
        craftingCosts: result.craftingCosts.map((cost) => ({ ...cost })),
      },
      count: crafting.count,
      costs: buildCraftingCosts(crafting, ownedBeforeRecommendations, materialMap),
    });
  }
  return recommendations;
}

/**
 * 基于当前分配后的缺口生成媒介转换建议。建议只读，不会修改目标结果或传入库存。
 * @since Beta v0.12.6
 * @param results - 当前直接库存和已采用合成后的结果
 * @param remainingInventory - 已扣除直接需求及已采用合成的库存余量
 * @param materials - 材料 Wiki 数据
 * @param protectedResults - 需优先预留普通合成来源的其他目标结果
 * @returns 可额外采用的媒介转换建议
 */
export function buildConversionRecommendations(
  results: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  remainingInventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  protectedResults: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial> = [],
): Array<TGApp.App.UserCalc.ConversionRecommendation> {
  if (!hasConversionMediaInventory(remainingInventory)) return [];
  const preparation = prepareConversionRecommendations(
    results,
    remainingInventory,
    materials,
    protectedResults,
  );
  const materialMap = new Map(materials.map((material) => <const>[material.id, material]));
  const fullCalculator = createCraftingCalculator(materials);
  return buildConversionRecommendationsFromPreparation(
    results,
    preparation,
    materialMap,
    fullCalculator,
  );
}

/**
 * 获取目标材料配方图中当前库存可用的转换来源。
 * @since Beta v0.12.6
 * @param targetId - 目标材料 ID
 * @param inventory - 可用于转换预览的库存
 * @param materials - 材料 Wiki 数据
 * @returns 按星级降序及 ID 升序排列的来源材料
 */
export function getConversionSourceMaterials(
  targetId: number,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): Array<TGApp.App.Material.WikiItem> {
  const materialMap = new Map(materials.map((material) => <const>[material.id, material]));
  const candidates = new Map<number, TGApp.App.Material.WikiItem>();
  const visited = new Set<number>();

  /**
   * 递归收集目标材料可使用的非媒介转换来源。
   * @since Beta v0.12.6
   * @param id - 材料 ID
   */
  const visit = (id: number): void => {
    if (visited.has(id)) return;
    visited.add(id);
    const material = materialMap.get(id);
    if (!material) return;
    for (const recipe of material.convert) {
      for (const source of recipe.source) {
        const sourceId = Number(source.id);
        if (
          !Number.isInteger(sourceId) ||
          sourceId === targetId ||
          CONVERSION_MEDIA_IDS.has(sourceId)
        ) {
          continue;
        }
        const sourceMaterial = materialMap.get(sourceId);
        if (sourceMaterial && (inventory.get(sourceId) ?? 0) > 0) {
          candidates.set(sourceId, sourceMaterial);
        }
        visit(sourceId);
      }
    }
  };

  visit(targetId);
  return Array.from(candidates.values()).sort((a, b) => b.star - a.star || a.id - b.id);
}

/**
 * 使用既有合成计算上下文计算单个媒介转换推荐的只读预览。
 * @since Beta v0.12.6
 * @param material - 待补足的材料结果
 * @param inventory - 普通合成来源预留后的可用库存
 * @param materials - 材料 Wiki 数据
 * @param sourceLimits - 用户为非媒介来源指定的数量上限
 * @param count - 请求转换的目标数量
 * @param calculator - 当前单轮复用的合成计算器
 * @returns 转换预览结果
 */
function calculateConversionPreviewWithCalculator(
  material: TGApp.App.UserCalc.ResultMaterial,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  sourceLimits: ReadonlyMap<number, number>,
  count: number,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
): TGApp.App.UserCalc.ConversionRecommendation {
  const previewMaterial = {
    ...material,
    craftingCosts: material.craftingCosts.map((cost) => ({ ...cost })),
  };
  /**
   * 创建未发生转换时的只读推荐结果。
   * @since Beta v0.12.6
   * @returns 保留目标材料且转换数量为零的推荐
   */
  const empty = (): TGApp.App.UserCalc.ConversionRecommendation => ({
    material: previewMaterial,
    count: 0,
    costs: [],
  });
  if (!Number.isFinite(count) || !Number.isInteger(count) || count <= 0) return empty();
  if (
    !Number.isFinite(material.missing) ||
    !Number.isInteger(material.missing) ||
    material.missing <= 0
  ) {
    return empty();
  }

  const materialInfo = materials.find((item) => item.id === material.id);
  if (!materialInfo || materialInfo.convert.length === 0) return empty();

  const dust = Math.max(inventory.get(DUST_OF_AZOTH_ID) ?? 0, 0);
  const solvent = Math.max(inventory.get(DREAM_SOLVENT_ID) ?? 0, 0);
  if (dust <= 0 && solvent <= 0) return empty();

  const limitedInventory = new Map<number, number>();
  limitedInventory.set(DUST_OF_AZOTH_ID, dust);
  limitedInventory.set(DREAM_SOLVENT_ID, solvent);
  for (const [sourceId, limit] of sourceLimits) {
    if (
      sourceId === material.id ||
      CONVERSION_MEDIA_IDS.has(sourceId) ||
      !Number.isFinite(limit) ||
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      continue;
    }
    const available = Math.max(inventory.get(sourceId) ?? 0, 0);
    if (available <= 0) continue;
    limitedInventory.set(sourceId, Math.min(limit, available));
  }

  const allocation = calculator(
    [{ id: material.id, count: Math.min(count, material.missing) }],
    limitedInventory,
    dust > 0,
    solvent > 0,
  );
  const crafting = allocation.materials.get(material.id);
  if (!crafting || crafting.count <= 0 || !usesConversionMedia(crafting)) return empty();

  const materialMap = new Map(materials.map((item) => <const>[item.id, item]));
  return {
    material: previewMaterial,
    count: Math.min(crafting.count, material.missing),
    costs: buildCraftingCosts(crafting, inventory, materialMap),
  };
}

/**
 * 计算单个媒介转换推荐的只读预览。
 * @since Beta v0.12.6
 * @param material - 待补足的材料结果
 * @param inventory - 普通合成来源预留后的可用库存
 * @param materials - 材料 Wiki 数据
 * @param sourceLimits - 用户为非媒介来源指定的数量上限
 * @param count - 请求转换的目标数量
 * @returns 转换预览结果
 */
export function calculateConversionPreview(
  material: TGApp.App.UserCalc.ResultMaterial,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  sourceLimits: ReadonlyMap<number, number>,
  count: number,
): TGApp.App.UserCalc.ConversionRecommendation {
  return calculateConversionPreviewWithCalculator(
    material,
    inventory,
    materials,
    sourceLimits,
    count,
    createCraftingCalculator(materials),
  );
}

/**
 * 按目标需求计算各转换来源的数量上限，不受当前库存限制。
 * @since Beta v0.12.6
 * @param targetId - 目标材料 ID
 * @param count - 目标需求数量
 * @param materials - 材料配方数据
 * @returns 各来源通过最短配方路径满足需求所需的数量
 */
export function getConversionSourceLimits(
  targetId: number,
  count: number,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): Map<number, number> {
  if (!Number.isSafeInteger(count) || count < 0) return new Map();
  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const rates = new Map<number, number>([[targetId, 1]]);
  const pending = [targetId];
  for (let index = 0; index < pending.length; index++) {
    const id = pending[index];
    const rate = rates.get(id) ?? 1;
    for (const recipe of materialMap.get(id)?.convert ?? []) {
      for (const source of recipe.source) {
        const sourceId = Number(source.id);
        const nextRate = rate * source.count;
        if (
          sourceId === targetId ||
          CONVERSION_MEDIA_IDS.has(sourceId) ||
          !materialMap.has(sourceId) ||
          !Number.isSafeInteger(nextRate) ||
          nextRate <= 0 ||
          nextRate >= (rates.get(sourceId) ?? Infinity)
        ) {
          continue;
        }
        rates.set(sourceId, nextRate);
        pending.push(sourceId);
      }
    }
  }
  rates.delete(targetId);
  return new Map(Array.from(rates, ([id, rate]) => [id, rate * count]));
}

/**
 * 计算完整转换需求；当前可执行消耗优先，不把缺少的材料计入实际供给。
 * @since Beta v0.12.6
 * @param material - 转换前的目标需求
 * @param inventory - 当前可用余量
 * @param materials - 材料配方数据
 * @param sourceLimits - 用户选定来源及计划数量上限
 * @param count - 请求转换数量
 * @param actual - 已计算的实际转换结果
 * @param calculator - 当前单轮复用的合成计算器
 * @returns 全部方案可完成的数量及所需材料
 */
function calculateConversionPlanWithCalculator(
  material: TGApp.App.UserCalc.ResultMaterial,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  sourceLimits: ReadonlyMap<number, number>,
  count: number,
  actual: TGApp.App.UserCalc.ConversionRecommendation,
  calculator: TGApp.App.UserCalc.CraftingCalculator,
): TGApp.App.UserCalc.ConversionRecommendation {
  const requested = Math.min(Math.max(count, 0), material.missing);
  if (!Number.isSafeInteger(requested) || requested <= actual.count) {
    return cloneConversionRecommendation(actual);
  }
  const spent = new Map(actual.costs.map((cost) => [cost.id, cost.count]));
  const limits = new Map<number, number>();
  const capacities = getConversionSourceLimits(material.id, material.missing, materials);
  for (const [id, limit] of sourceLimits) {
    if (!Number.isSafeInteger(limit) || limit <= 0 || !capacities.has(id)) continue;
    limits.set(id, Math.max(Math.min(limit, capacities.get(id) ?? 0) - (spent.get(id) ?? 0), 0));
  }
  // 仅供需求预览使用的媒介预算；不写入真实库存，也不参与实际材料分配。
  const mediaRate = Math.max(
    1,
    ...materials.flatMap((item) =>
      item.convert.flatMap((recipe) =>
        recipe.source
          .filter((source) => CONVERSION_MEDIA_IDS.has(Number(source.id)))
          .map((source) => source.count),
      ),
    ),
  );
  const mediaBudget =
    Math.max(
      Array.from(limits.values()).reduce((sum, value) => sum + value, 0),
      requested,
    ) *
    mediaRate *
    materials.length;
  const virtualInventory = new Map(limits);
  virtualInventory.set(DUST_OF_AZOTH_ID, mediaBudget);
  virtualInventory.set(DREAM_SOLVENT_ID, mediaBudget);
  const remaining = calculateConversionPreviewWithCalculator(
    { ...material, missing: requested - actual.count },
    virtualInventory,
    materials,
    limits,
    requested - actual.count,
    calculator,
  );
  const costs = new Map(actual.costs.map((cost) => [cost.id, { ...cost }]));
  for (const cost of remaining.costs) {
    const previous = costs.get(cost.id);
    costs.set(cost.id, {
      ...cost,
      count: (previous?.count ?? 0) + cost.count,
      owned: inventory.get(cost.id) ?? 0,
    });
  }
  return {
    material: cloneResultMaterial(material),
    count: actual.count + remaining.count,
    costs: Array.from(costs.values()).sort((a, b) => b.star - a.star || a.id - b.id),
  };
}

/**
 * 计算完整转换需求；当前可执行消耗优先，不把缺少的材料计入实际供给。
 * @since Beta v0.12.6
 * @param material - 转换前的目标需求
 * @param inventory - 当前可用余量
 * @param materials - 材料配方数据
 * @param sourceLimits - 用户选定来源及计划数量上限
 * @param count - 请求转换数量
 * @param actual - 可选的已计算实际转换结果
 * @returns 全部方案可完成的数量及所需材料
 */
export function calculateConversionPlan(
  material: TGApp.App.UserCalc.ResultMaterial,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  sourceLimits: ReadonlyMap<number, number>,
  count: number,
  actual: TGApp.App.UserCalc.ConversionRecommendation = calculateConversionPreview(
    material,
    inventory,
    materials,
    sourceLimits,
    count,
  ),
): TGApp.App.UserCalc.ConversionRecommendation {
  return calculateConversionPlanWithCalculator(
    material,
    inventory,
    materials,
    sourceLimits,
    count,
    actual,
    createCraftingCalculator(materials),
  );
}

/**
 * 构建转换方案的来源和媒介需求行，与养成目标进度分开展示。
 * @since Beta v0.12.6
 * @param options - 当前展示范围内的转换方案
 * @returns 按材料合并的计划需求、可用量和缺口
 */
export function buildConversionDemandMaterials(
  options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const demands = new Map<number, TGApp.App.UserCalc.ResultMaterial>();
  const actualCosts = new Map<number, number>();
  const freeInventory = new Map<number, number>();

  for (const option of options) {
    if (option.intent?.count === 0) continue;
    const isManual = option.intent !== undefined;
    const availableInventory = isManual
      ? option.remainingInventory
      : option.allocatedCosts !== undefined
        ? (option.remainingInventory ?? option.inventory)
        : option.inventory;
    const costs = (
      isManual ? (option.plannedCosts ?? option.recommendation.costs) : option.recommendation.costs
    ).filter((cost) => Number.isFinite(cost.count) && cost.count > 0);
    if (costs.length === 0) continue;

    for (const cost of costs) {
      const previous = demands.get(cost.id);
      demands.set(cost.id, {
        id: cost.id,
        name: cost.name,
        type: cost.type,
        star: cost.star,
        required: (previous?.required ?? 0) + cost.count,
        owned: 0,
        craftable: 0,
        craftingCosts: [],
        missing: 0,
        progress: 0,
      });
      const available = Math.max(availableInventory?.get(cost.id) ?? 0, 0);
      freeInventory.set(cost.id, Math.max(freeInventory.get(cost.id) ?? 0, available));
    }

    const occupiedCosts = isManual ? option.recommendation.costs : (option.allocatedCosts ?? []);
    for (const cost of occupiedCosts) {
      if (!Number.isFinite(cost.count) || cost.count <= 0) continue;
      actualCosts.set(cost.id, (actualCosts.get(cost.id) ?? 0) + cost.count);
    }
  }
  return sortCultivationResults(
    Array.from(demands.values(), (demand) => {
      const owned = (actualCosts.get(demand.id) ?? 0) + (freeInventory.get(demand.id) ?? 0);
      return {
        ...demand,
        owned,
        missing: Math.max(demand.required - owned, 0),
        progress: demand.required === 0 ? 100 : Math.min((owned / demand.required) * 100, 100),
      };
    }),
  );
}

/**
 * 汇总额外合成消耗，扣除已在转换需求中展示的已采用方案实际用量。
 * @since Beta v0.12.6
 * @param materials - 当前展示范围内的材料结果
 * @param options - 同一展示范围内的转换方案
 * @returns 不含已采用转换用量的合成消耗，保留同材料的普通合成部分
 */
export function getAdditionalCraftingCosts(
  materials: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption> = [],
): Array<TGApp.App.UserCalc.CraftingCost> {
  const costs = new Map<number, TGApp.App.UserCalc.CraftingCost>();
  for (const material of materials) {
    for (const cost of material.craftingCosts) {
      const previous = costs.get(cost.id);
      costs.set(cost.id, {
        ...cost,
        count: (previous?.count ?? 0) + cost.count,
        owned: Math.max(previous?.owned ?? 0, cost.owned),
      });
    }
  }
  for (const option of options) {
    if (option.intent?.count === 0) continue;
    const allocatedCosts =
      option.intent !== undefined ? option.recommendation.costs : (option.allocatedCosts ?? []);
    for (const cost of allocatedCosts) {
      const current = costs.get(cost.id);
      if (current) current.count = Math.max(current.count - cost.count, 0);
    }
  }
  return Array.from(costs.values())
    .filter((cost) => cost.count > 0)
    .sort((a, b) => b.star - a.star || a.id - b.id);
}

/**
 * 获取材料详情中的合成与转换消耗。
 *
 * 只读取当前材料及传入范围内的转换选项，不改变材料结果、库存或转换意图。
 * @since Beta v0.12.6
 * @param material - 当前展示的材料结果
 * @param options - 当前目标范围内的转换选项
 * @returns 按材料合并并排序的合成与转换消耗
 */
export function getMaterialCraftingCosts(
  material: TGApp.App.UserCalc.ResultMaterial,
  options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption> = [],
): Array<TGApp.App.UserCalc.CraftingCost> {
  const matchingOptions = options.filter(
    (option) => option.recommendation.material.id === material.id && option.intent?.count !== 0,
  );
  const costs = new Map<number, TGApp.App.UserCalc.CraftingCost>(
    getAdditionalCraftingCosts([material], matchingOptions)
      .filter((cost) => Number.isFinite(cost.count) && cost.count > 0)
      .map((cost) => [cost.id, { ...cost }]),
  );

  for (const option of matchingOptions) {
    const optionCosts =
      option.intent !== undefined
        ? (option.plannedCosts ?? option.recommendation.costs)
        : option.recommendation.costs;
    for (const cost of optionCosts) {
      if (!Number.isFinite(cost.count) || cost.count <= 0) continue;
      const previous = costs.get(cost.id);
      costs.set(cost.id, {
        ...cost,
        count: (previous?.count ?? 0) + cost.count,
        owned: Math.max(previous?.owned ?? 0, cost.owned),
      });
    }
  }

  return Array.from(costs.values()).sort((a, b) => b.star - a.star || a.id - b.id);
}

/**
 * 将未采用的自动转换数量投影到材料结果。
 *
 * 仅用于详情和统计展示，不会修改原始分配结果或转换选项；已采用的手动方案已经计入
 * `craftable`，不在此重复计算。
 * @since Beta v0.12.6
 * @param materials - 原始分配或接口返回的材料结果
 * @param options - 当前展示范围内的转换选项
 * @returns 叠加自动转换可执行数量后的材料结果
 */
export function getConversionResultMaterials(
  materials: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>,
  options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption> = [],
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const automaticCounts = new Map<number, number>();
  for (const option of options) {
    if (option.intent !== undefined) continue;
    const count = option.recommendation.count;
    if (!Number.isFinite(count) || count <= 0) continue;
    const allocatedCount =
      option.allocatedCount !== undefined &&
      Number.isFinite(option.allocatedCount) &&
      option.allocatedCount > 0
        ? option.allocatedCount
        : 0;
    const materialId = option.recommendation.material.id;
    automaticCounts.set(
      materialId,
      (automaticCounts.get(materialId) ?? 0) + Math.max(count - allocatedCount, 0),
    );
  }

  return sortCultivationResults(
    materials.map((material) => {
      const remaining = Math.max(material.required - material.owned - material.craftable, 0);
      const count = Math.min(automaticCounts.get(material.id) ?? 0, remaining);
      return updateResultMaterial(material, material.craftable + count, material.craftingCosts);
    }),
  );
}

/**
 * 按目标优先级分配计划库存并汇总材料完成情况。
 *
 * 已完成目标仍生成展示用材料列表，但不占用进行中目标的库存，也不计入计划汇总。
 * @since Beta v0.12.6
 * @param entries - 养成目标列表
 * @param inventory - 计划可用背包材料
 * @param materials - 材料 Wiki 数据
 * @param intents - 按养成目标稳定键保存的手动转换设置
 * @returns 各目标、计划汇总及剩余库存的分配结果
 */
export function allocatePlanMaterials(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  intents: ReadonlyMap<string, ReadonlyArray<TGApp.App.UserCalc.ConversionIntent>> = new Map(),
): PlanMaterialAllocation {
  const materialMap = new Map(materials.map((material) => <const>[material.id, material]));
  const ordinaryMaterials = buildOrdinaryMaterials(materials);
  const calculators: CraftingCalculators = {
    ordinary: createCraftingCalculator(ordinaryMaterials),
    full: createCraftingCalculator(materials),
  };
  const allocatedEntries = new Map<string, Array<TGApp.App.UserCalc.ResultMaterial>>();
  const appliedConversions = new Map<string, Array<TGApp.App.UserCalc.AppliedConversion>>();
  const automaticConversions = new Map<string, Array<AutomaticConversionContext>>();

  const activeEntries = sortCultivationEntries(
    entries.filter((entry) => entry.status === "active"),
  );

  const activePlans: Array<EntryPlan> = activeEntries.map((entry) => ({
    entry,
    requirements: new Map(),
    directOwned: new Map<number, number>(),
    results: [],
    explicitMaterialIds: new Set<number>(),
  }));
  const normalizedInventory = normalizeInventory(inventory);
  let remainingInventory = new Map(normalizedInventory);

  // 先按优先级从全体 active 目标预留直接库存，后续任何合成阶段都只能使用该余量。
  for (const plan of activePlans) {
    plan.requirements = getEntryRequirements(plan.entry, remainingInventory);
    for (const [id, required] of plan.requirements) {
      const owned = Math.min(remainingInventory.get(id) ?? 0, required);
      plan.directOwned.set(id, owned);
      remainingInventory.set(id, Math.max((remainingInventory.get(id) ?? 0) - owned, 0));
    }
    plan.results = createEntryResults(plan.requirements, plan.directOwned, materialMap);
  }

  // 所有目标先完成普通合成，确保后续媒介转换不会挪用任一目标已经采用的普通来源。
  for (const plan of activePlans) {
    if (plan.entry.allowCrafting) {
      const ordinary = allocateOrdinaryCrafting(
        plan.requirements,
        plan.directOwned,
        plan.results,
        remainingInventory,
        materialMap,
        calculators.ordinary,
      );
      plan.results = ordinary.results;
      remainingInventory = ordinary.remainingInventory;
    }
  }

  // 媒介转换前临时预留所有仍缺目标的普通合成来源，即使目标关闭自动合成也不让高优先级转换抢走它们。
  const ordinaryProtectionRequirements = activePlans.flatMap((plan) =>
    plan.results
      .filter((result) => result.missing > 0)
      .map((result) => ({ id: result.id, count: result.missing })),
  );
  const conversionStartInventory = remainingInventory;
  let conversionInventory = conversionStartInventory;
  if (ordinaryProtectionRequirements.length > 0) {
    conversionInventory = calculators.ordinary(
      ordinaryProtectionRequirements,
      conversionStartInventory,
      false,
      false,
    ).remainingInventory;
  }
  const conversionBeforeMedia = new Map(conversionInventory);

  // 普通合成完成后，先按目标优先级应用明确转换，再执行没有明确意图的自动转换。
  for (const plan of activePlans) {
    const entryIntents = intents.get(getCultivationEntryKey(plan.entry)) ?? [];
    const explicit = allocateExplicitConversions(
      plan.results,
      conversionInventory,
      materials,
      calculators.full,
      entryIntents,
    );
    plan.results = explicit.results;
    plan.explicitMaterialIds = explicit.explicitMaterialIds;
    appliedConversions.set(plan.entry.id, explicit.appliedConversions);
    conversionInventory = explicit.remainingInventory;
    let entryAutomaticConversions: Array<AutomaticConversionContext> = [];

    const automaticResults = plan.results.filter(
      (result) => !plan.explicitMaterialIds.has(result.id),
    );
    if (
      plan.entry.allowCrafting &&
      (plan.entry.useDust || plan.entry.useSolvent) &&
      automaticResults.length > 0
    ) {
      const converted = allocateMediaConversions(
        automaticResults,
        conversionInventory,
        materialMap,
        calculators.full,
        plan.entry.useDust,
        plan.entry.useSolvent,
      );
      entryAutomaticConversions = converted.automaticConversions;
      const convertedResults = new Map(converted.results.map((result) => [result.id, result]));
      plan.results = sortCultivationResults(
        plan.results.map((result) => convertedResults.get(result.id) ?? result),
      );
      conversionInventory = converted.remainingInventory;
    }
    automaticConversions.set(plan.entry.id, entryAutomaticConversions);
    allocatedEntries.set(plan.entry.id, plan.results);
  }
  remainingInventory = applyInventoryConsumption(
    conversionStartInventory,
    conversionBeforeMedia,
    conversionInventory,
  );

  for (const entry of entries) {
    if (entry.status !== "completed") continue;
    const requirements = getEntryRequirements(entry, inventory);
    const directOwned = new Map<number, number>();
    let completedRemaining = new Map(normalizedInventory);
    for (const [id, required] of requirements) {
      const owned = Math.min(completedRemaining.get(id) ?? 0, required);
      directOwned.set(id, owned);
      completedRemaining.set(id, Math.max((completedRemaining.get(id) ?? 0) - owned, 0));
    }
    let results = createEntryResults(requirements, directOwned, materialMap);
    if (entry.allowCrafting) {
      const ordinary = allocateOrdinaryCrafting(
        requirements,
        directOwned,
        results,
        completedRemaining,
        materialMap,
        calculators.ordinary,
      );
      results = ordinary.results;
      completedRemaining = ordinary.remainingInventory;
      if (entry.useDust || entry.useSolvent) {
        results = allocateMediaConversions(
          results,
          completedRemaining,
          materialMap,
          calculators.full,
          entry.useDust,
          entry.useSolvent,
        ).results;
      }
    }
    allocatedEntries.set(entry.id, results);
  }

  const resultMaterials = mergeCultivationResults(activePlans.flatMap((plan) => plan.results));
  const conversionPreparation = prepareConversionRecommendationsWithCalculator(
    resultMaterials,
    remainingInventory,
    calculators.ordinary,
  );
  const recommendations = buildConversionRecommendationsFromPreparation(
    resultMaterials,
    conversionPreparation,
    materialMap,
    calculators.full,
  );

  return {
    entries: allocatedEntries,
    appliedConversions,
    materials: resultMaterials,
    remainingInventory,
    conversionInventory: conversionPreparation.inventory,
    recommendations,
    automaticConversions,
  };
}

/**
 * 构建按养成目标归属的转换编辑上下文。
 *
 * 该函数只生成展示和编辑数据，不会修改既有分配结果或采用的转换意图。
 * @since Beta v0.12.6
 * @param entries - 当前计划目标
 * @param allocation - 已完成的计划材料分配
 * @param materials - 材料 Wiki 数据
 * @param entryIds - 可选的目标 ID 筛选，在全计划推荐分配后应用
 * @returns 按目标优先级排列的已采用方案及剩余推荐
 */
export function getConversionOptions(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
  allocation: PlanMaterialAllocation,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  entryIds?: ReadonlySet<string>,
): Array<TGApp.App.UserCalc.ConversionOption> {
  const activeEntries = sortCultivationEntries(
    entries.filter((entry) => entry.status === "active"),
  );
  let workingInventory = normalizeInventory(allocation.remainingInventory);
  const options: Array<TGApp.App.UserCalc.ConversionOption> = [];
  let materialMap: Map<number, TGApp.App.Material.WikiItem> | undefined;
  let calculators: CraftingCalculators | undefined;

  for (const entry of activeEntries) {
    const entryKey = getCultivationEntryKey(entry);
    const results = allocation.entries.get(entry.id) ?? [];
    const applied = allocation.appliedConversions.get(entry.id) ?? [];
    const explicitMaterialIds = new Set(applied.map((conversion) => conversion.intent.materialId));

    for (const conversion of applied) {
      options.push({
        entryKey,
        entryName: entry.name,
        recommendation: cloneConversionRecommendation(conversion.recommendation),
        inventory: new Map(conversion.inventory),
        intent: cloneConversionIntent(conversion.intent),
        plannedCosts: conversion.plannedCosts.map((cost) => ({ ...cost })),
        remainingInventory: allocation.conversionInventory,
      });
    }

    const automaticResults = results.filter((result) => !explicitMaterialIds.has(result.id));
    const automaticOptions = new Map<number, TGApp.App.UserCalc.ConversionOption>();
    for (const context of allocation.automaticConversions.get(entry.id) ?? []) {
      automaticOptions.set(context.recommendation.material.id, {
        entryKey,
        entryName: entry.name,
        recommendation: cloneConversionRecommendation(context.recommendation),
        inventory: new Map(context.inventory),
        allocatedCount: context.recommendation.count,
        allocatedCosts: context.recommendation.costs.map((cost) => ({ ...cost })),
        remainingInventory: new Map(allocation.conversionInventory),
      });
    }
    if (automaticResults.length === 0) {
      options.push(...automaticOptions.values());
      continue;
    }
    if (!hasConversionMediaInventory(workingInventory)) {
      options.push(...automaticOptions.values());
      continue;
    }
    if (materialMap === undefined || calculators === undefined) {
      materialMap = new Map(materials.map((material) => <const>[material.id, material]));
      const ordinaryMaterials = buildOrdinaryMaterials(materials);
      calculators = {
        ordinary: createCraftingCalculator(ordinaryMaterials),
        full: createCraftingCalculator(materials),
      };
    }
    const protectedResults = activeEntries.flatMap((otherEntry) =>
      (allocation.entries.get(otherEntry.id) ?? []).filter(
        (result) => otherEntry.id !== entry.id || explicitMaterialIds.has(result.id),
      ),
    );
    const preparation = prepareConversionRecommendationsWithCalculator(
      automaticResults,
      workingInventory,
      calculators.ordinary,
      protectedResults,
    );
    const recommendations = buildConversionRecommendationsFromPreparation(
      automaticResults,
      preparation,
      materialMap,
      calculators.full,
    );
    let recommendationInventory = preparation.inventory;
    for (const recommendation of recommendations) {
      const existing = automaticOptions.get(recommendation.material.id);
      if (existing) {
        existing.recommendation = {
          ...existing.recommendation,
          count: existing.recommendation.count + recommendation.count,
          costs: mergeCraftingCosts(existing.recommendation.costs, recommendation.costs),
        };
      } else {
        automaticOptions.set(recommendation.material.id, {
          entryKey,
          entryName: entry.name,
          recommendation: cloneConversionRecommendation(recommendation),
          inventory: new Map(recommendationInventory),
        });
      }
      recommendationInventory = subtractCraftingCosts(
        recommendationInventory,
        recommendation.costs,
      );
      workingInventory = subtractCraftingCosts(workingInventory, recommendation.costs);
    }
    options.push(...automaticOptions.values());
  }

  if (entryIds === undefined) return options;
  const entryKeys = new Set(
    activeEntries.filter((entry) => entryIds.has(entry.id)).map(getCultivationEntryKey),
  );
  return options.filter((option) => entryKeys.has(option.entryKey));
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
 * 从接口快照读取明确返回的背包数量。
 */
function getCalculateAvailableMaterials(result: TGApp.Game.Calculate.Result): Map<number, number> {
  return new Map(
    result.available_material.map((material) => [material.id, Math.max(material.num, 0)]),
  );
}

/**
 * 从接口计算结果解析用户当前背包材料。
 *
 * `available_material` 通常只含本次计算用到的低阶材料。`overall_consume.lack_num` 已含接口侧
 * 合成，因此 `num - lack_num` 是持有加可合成的上限，不能直接当真实库存，否则本地合成会把蓝/
 * 绿材料再算一次。这里用本地配方扣掉仍可合成的部分，把合成产物的持有量补进快照，刷新后紫色
 * 等高阶材料也会更新。
 * @since Beta v0.12.1
 * @param result - 接口养成计算结果
 * @returns 材料 ID 与当前背包数量映射
 */
export function getCalculateInventory(result: TGApp.Game.Calculate.Result): Map<number, number> {
  const inventory = getCalculateAvailableMaterials(result);
  const requirements = result.overall_consume
    .filter((material) => material.num > 0)
    .map((material) => ({ id: material.id, count: material.num }));
  const craftableMaterials =
    requirements.length > 0
      ? calculateCraftableMaterials(requirements, inventory, WikiMaterialData)
      : new Map<number, CraftableMaterial>();
  for (const material of result.overall_consume) {
    const effective = Math.max(material.num - material.lack_num, 0);
    const crafted = craftableMaterials.get(material.id)?.count ?? 0;
    const impliedOwned = Math.max(effective - crafted, 0);
    if (!inventory.has(material.id) || impliedOwned > (inventory.get(material.id) ?? 0)) {
      inventory.set(material.id, impliedOwned);
    }
  }
  return inventory;
}

/**
 * 将比背包记录更新的接口库存下界合并到计划库存。
 *
 * 每种材料只采用最新接口快照（含由 `overall_consume` 反推的合成产物持有量）；接口在材料充足
 * 时最多返回本次需求量，因此仅提高库存下界。接口确认不足的数据会先回写背包，写入时间会使更
 * 早的接口快照失效。
 * macOS 以接口数量覆盖对应材料，允许库存减少或归零。
 * @since Beta v0.12.0
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
  const preferApiInventory = platform() === "macos";
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
    merged.set(
      materialId,
      preferApiInventory
        ? apiInventory.count
        : Math.max(merged.get(materialId) ?? 0, apiInventory.count),
    );
  }
  return merged;
}

/**
 * 根据需求和背包构建材料完成情况
 * @since Beta v0.12.2
 * @param requirements - 材料需求
 * @param inventory - 背包材料
 * @param materials - 材料 Wiki 数据
 * @param allowCrafting - 是否允许合成
 * @param useDust - 是否允许使用嬗变之尘
 * @param useSolvent - 是否允许使用异梦溶媒
 * @param experienceTargets - 用于独立结算突破区间的等级目标
 * @returns 材料完成情况
 */
export function buildCultivationResults(
  requirements: ReadonlyArray<CultivationMaterial>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  allowCrafting: boolean,
  useDust: boolean,
  useSolvent: boolean,
  experienceTargets: ReadonlyArray<ExperienceTarget> = [],
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const adjustedRequirements = allocateExperienceRequirements(
    requirements,
    inventory,
    experienceTargets,
  );
  const craftableMaterials: Map<number, CraftableMaterial> = allowCrafting
    ? userCalc.craft(adjustedRequirements, inventory, materials, useDust, useSolvent)
    : new Map();
  return sortCultivationResults(
    adjustedRequirements.map((required) => {
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
