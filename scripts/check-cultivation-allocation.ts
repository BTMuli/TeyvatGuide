/**
 * 养成计划材料分配回归检查。
 * @since Beta v0.12.6
 */

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const server = await createServer({
  root,
  configFile: false,
  resolve: {
    alias: {
      "@": resolve(root, "src"),
      "@utils": resolve(root, "src/utils"),
    },
  },
  server: { middlewareMode: true, watch: null, hmr: false },
  optimizeDeps: { noDiscovery: true },
});

type PlanUtils = typeof import("../src/utils/cultivationPlan.js");

function makeMaterial(
  id: number,
  star = 3,
  convert: Array<TGApp.App.Material.Convert> = [],
): TGApp.App.Material.WikiItem {
  return {
    id,
    name: `材料 ${id}`,
    description: "回归材料",
    type: "regression",
    cType: "regression",
    star,
    source: [],
    convert,
  };
}

function makeRecipe(id: string, sources: Array<[number, number]>): TGApp.App.Material.Convert {
  return {
    id,
    source: sources.map(([sourceId, count]) => ({
      id: String(sourceId),
      name: `材料 ${sourceId}`,
      type: "regression",
      star: 1,
      count,
    })),
  };
}

function makeEntry(
  id: string,
  materialId: number,
  sortOrder: number,
  options: Partial<TGApp.Sqlite.Cultivation.CraftingOptions> = {},
  status: TGApp.Sqlite.Cultivation.EntryStatus = "active",
): TGApp.Sqlite.Cultivation.EntryWithItems {
  return {
    id,
    projectId: "regression-project",
    type: "weapon",
    itemId: materialId,
    instanceKey: id,
    name: id,
    icon: "",
    star: 5,
    currentState: {
      level: 1,
      promoteLevel: 0,
      ascended: false,
      talents: [],
    },
    targetState: {
      level: 1,
      promoteLevel: 0,
      ascended: false,
      talents: [],
    },
    status,
    sortOrder,
    calculationMode: "bag",
    allowCrafting: options.allowCrafting ?? true,
    useDust: options.useDust ?? false,
    useSolvent: options.useSolvent ?? false,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    items: [{ entryId: id, materialId, required: 1 }],
  };
}

function makeResult(
  id: number,
  required: number,
  owned = 0,
  craftable = 0,
): TGApp.App.UserCalc.ResultMaterial {
  return {
    id,
    name: `材料 ${id}`,
    type: "regression",
    star: 3,
    required,
    owned,
    craftable,
    craftingCosts: [],
    missing: Math.max(required - owned - craftable, 0),
    progress: required === 0 ? 100 : Math.min(((owned + craftable) / required) * 100, 100),
  };
}

function countCost(costs: ReadonlyArray<TGApp.App.UserCalc.CraftingCost>, id: number): number {
  return costs.find((cost) => cost.id === id)?.count ?? 0;
}

async function runChecks(
  utils: PlanUtils,
  wikiMaterials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): Promise<void> {
  const {
    allocatePlanMaterials,
    buildConversionRecommendations,
    calculateConversionPreview,
    calculateConversionPlan,
    buildConversionDemandMaterials,
    getConversionSourceLimits,
    getConversionSourceMaterials,
    getConversionOptions,
    getCultivationEntryKey,
    getAdditionalCraftingCosts,
    mergeCultivationResults,
    prepareConversionRecommendations,
  } = utils;
  const dust = 104201;
  const solvent = 113021;
  const source = 7001;
  const target = 7002;
  const materials = [
    makeMaterial(source),
    makeMaterial(target, 4, [
      makeRecipe("target-from-source", [
        [source, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(dust, 1),
    makeMaterial(solvent, 1),
  ];

  // 明确采用的转换更新需求列表和汇总，并不依赖自动合成开关。
  const manualEntry = makeEntry("manual", target, 0, { allowCrafting: false });
  manualEntry.items[0].required = 3;
  const manualKey = getCultivationEntryKey(manualEntry);
  const manualIntent: TGApp.App.UserCalc.ConversionIntent = {
    materialId: target,
    count: 2,
    sourceLimits: [{ id: source, count: 2 }],
  };
  const manualIntents = new Map([[manualKey, [manualIntent]]]);
  const manualInventory = new Map([
    [source, 4],
    [dust, 4],
  ]);
  const inventorySnapshot = new Map(manualInventory);
  const entrySnapshot = structuredClone(manualEntry);
  const intentsSnapshot = structuredClone(manualIntents);
  const adopted = allocatePlanMaterials([manualEntry], manualInventory, materials, manualIntents);
  const adoptedResult = adopted.entries.get(manualEntry.id)?.[0];
  assert.equal(adoptedResult?.craftable, 2);
  assert.equal(adoptedResult?.missing, 1);
  assert.equal(adoptedResult?.progress, (2 / 3) * 100);
  assert.equal(countCost(adoptedResult?.craftingCosts ?? [], source), 2);
  assert.equal(countCost(adoptedResult?.craftingCosts ?? [], dust), 2);
  assert.equal(adopted.materials[0]?.craftable, 2);
  assert.equal(countCost(adopted.materials[0]?.craftingCosts ?? [], source), 2);
  assert.equal(adopted.remainingInventory.get(source), 2);
  assert.deepEqual(manualInventory, inventorySnapshot);
  assert.deepEqual(manualEntry, entrySnapshot);
  assert.deepEqual(manualIntents, intentsSnapshot);

  // 需求上限不受库存限制，材料或媒介为零也能保存完整计划及缺口。
  const fullIntent = { ...manualIntent, count: 3, sourceLimits: [{ id: source, count: 3 }] };
  const noMediaInventory = new Map([
    [source, 1],
    [dust, 0],
  ]);
  const planned = calculateConversionPlan(
    makeResult(target, 3),
    noMediaInventory,
    materials,
    new Map([[source, 3]]),
    3,
  );
  assert.equal(getConversionSourceLimits(target, 3, materials).get(source), 3);
  assert.equal(planned.count, 3);
  assert.equal(countCost(planned.costs, source), 3);
  assert.equal(countCost(planned.costs, dust), 3);
  const plannedAllocation = allocatePlanMaterials(
    [manualEntry],
    noMediaInventory,
    materials,
    new Map([[manualKey, [fullIntent]]]),
  );
  assert.equal(plannedAllocation.materials[0]?.craftable, 0);
  assert.equal(plannedAllocation.materials[0]?.missing, 3);
  const demandRows = buildConversionDemandMaterials(
    getConversionOptions([manualEntry], plannedAllocation, materials),
  );
  assert.equal(demandRows.find((item) => item.id === source)?.required, 3);
  assert.equal(demandRows.find((item) => item.id === source)?.owned, 1);
  assert.equal(demandRows.find((item) => item.id === source)?.missing, 2);
  assert.equal(demandRows.find((item) => item.id === dust)?.missing, 3);
  assert.equal(plannedAllocation.remainingInventory.get(source), 1);

  // 编辑上下文按实际 entry.id 筛选；采用后继续显示方案，不会再次额外推荐同项。
  const adoptedOptions = getConversionOptions(
    [manualEntry],
    adopted,
    materials,
    new Set([manualEntry.id]),
  );
  assert.equal(adoptedOptions.length, 1);
  assert.equal(adoptedOptions[0]?.entryKey, manualKey);
  assert.equal(adoptedOptions[0]?.recommendation.material.missing, 3);
  assert.equal(adoptedOptions[0]?.inventory.get(source), 4);
  assert.equal(adoptedOptions[0]?.intent?.count, 2);

  // 转换需求已展示的消耗不再重复；同材料用于普通合成的部分仍须保留。
  const resultSnapshot = structuredClone(adopted.materials);
  const optionsSnapshot = structuredClone(adoptedOptions);
  assert.deepEqual(getAdditionalCraftingCosts(adopted.materials, adoptedOptions), []);
  assert.equal(countCost(getAdditionalCraftingCosts(adopted.materials), source), 2);
  const ordinaryResult = makeResult(7003, 1);
  ordinaryResult.craftingCosts = [
    { id: source, name: `材料 ${source}`, type: "regression", star: 3, count: 3, owned: 5 },
  ];
  const additionalCosts = getAdditionalCraftingCosts(
    [...adopted.materials, ordinaryResult],
    adoptedOptions,
  );
  assert.equal(countCost(additionalCosts, source), 3);
  assert.equal(additionalCosts.find((cost) => cost.id === source)?.owned, 5);
  assert.equal(countCost(additionalCosts, dust), 0);
  // 库存不足时只扣除实际用量，不能用计划需求抵消普通合成消耗。
  assert.equal(
    countCost(
      getAdditionalCraftingCosts(
        [ordinaryResult],
        getConversionOptions([manualEntry], plannedAllocation, materials),
      ),
      source,
    ),
    3,
  );
  assert.deepEqual(adopted.materials, resultSnapshot);
  assert.deepEqual(adoptedOptions, optionsSnapshot);

  // 替换方案从原始背包重算，不累计旧方案消耗；材料齐备后仍可重新编辑。
  const replacement = allocatePlanMaterials(
    [manualEntry],
    manualInventory,
    materials,
    new Map([
      [manualKey, [{ ...manualIntent, count: 3, sourceLimits: [{ id: source, count: 3 }] }]],
    ]),
  );
  assert.equal(replacement.materials[0]?.craftable, 3);
  assert.equal(replacement.materials[0]?.missing, 0);
  assert.equal(countCost(replacement.materials[0]?.craftingCosts ?? [], source), 3);
  assert.equal(
    getConversionOptions([manualEntry], replacement, materials)[0]?.recommendation.material.missing,
    3,
  );
  assert.equal(replacement.remainingInventory.get(source), 1);

  // 库存、媒介或需求变化会约束实际采用量，同时保留请求设置。
  const constrained = allocatePlanMaterials(
    [manualEntry],
    new Map([
      [source, 4],
      [dust, 1],
    ]),
    materials,
    manualIntents,
  );
  assert.equal(constrained.materials[0]?.craftable, 1);
  assert.equal(constrained.appliedConversions.get(manualEntry.id)?.[0]?.intent.count, 2);
  const smallerEntry = structuredClone(manualEntry);
  smallerEntry.items[0].required = 1;
  assert.equal(
    allocatePlanMaterials([smallerEntry], manualInventory, materials, manualIntents).materials[0]
      ?.craftable,
    1,
  );

  // 显式 0 抑制该目标的自动转换，移除设置后恢复自动行为。
  const automaticEntry = { ...manualEntry, allowCrafting: true, useDust: true };
  const disabled = allocatePlanMaterials(
    [automaticEntry],
    manualInventory,
    materials,
    new Map([[manualKey, [{ ...manualIntent, count: 0 }]]]),
  );
  assert.equal(disabled.materials[0]?.craftable, 0);
  assert.equal(getConversionOptions([automaticEntry], disabled, materials)[0]?.intent?.count, 0);
  assert.equal(
    allocatePlanMaterials([automaticEntry], manualInventory, materials).materials[0]?.craftable,
    3,
  );
  const explicitOverAutomatic = allocatePlanMaterials(
    [automaticEntry],
    manualInventory,
    materials,
    manualIntents,
  );
  assert.equal(explicitOverAutomatic.materials[0]?.craftable, 2);
  assert.equal(countCost(explicitOverAutomatic.materials[0]?.craftingCosts ?? [], dust), 2);

  // 两个目标共用来源与媒介，按优先级分配且汇总只累计实际消耗。
  const secondManual = makeEntry("manual-second", target, 1, { allowCrafting: false });
  secondManual.items[0].required = 2;
  const competing = allocatePlanMaterials(
    [manualEntry, secondManual],
    new Map([
      [source, 3],
      [dust, 3],
    ]),
    materials,
    new Map([
      [manualKey, [manualIntent]],
      [getCultivationEntryKey(secondManual), [manualIntent]],
    ]),
  );
  assert.equal(competing.entries.get(manualEntry.id)?.[0]?.craftable, 2);
  assert.equal(competing.entries.get(secondManual.id)?.[0]?.craftable, 1);
  assert.equal(competing.materials[0]?.craftable, 3);
  assert.equal(countCost(competing.materials[0]?.craftingCosts ?? [], source), 3);
  assert.equal(competing.remainingInventory.get(dust), 0);
  assert.equal(getConversionOptions([manualEntry, secondManual], competing, materials).length, 2);
  const competingDemands = buildConversionDemandMaterials(
    getConversionOptions([manualEntry, secondManual], competing, materials),
  );
  assert.equal(competingDemands.find((item) => item.id === source)?.required, 4);
  assert.equal(competingDemands.find((item) => item.id === source)?.owned, 3);
  assert.equal(competingDemands.find((item) => item.id === source)?.missing, 1);
  const highAutomatic = { ...manualEntry, allowCrafting: true, useDust: true };
  const highPriority = allocatePlanMaterials(
    [highAutomatic, secondManual],
    new Map([
      [source, 3],
      [dust, 3],
    ]),
    materials,
    new Map([[getCultivationEntryKey(secondManual), [manualIntent]]]),
  );
  assert.equal(highPriority.entries.get(highAutomatic.id)?.[0]?.craftable, 3);
  assert.equal(highPriority.entries.get(secondManual.id)?.[0]?.craftable, 0);

  // 已完成目标的保存设置不占用活动目标库存，恢复活动状态后会重新计算。
  const completedManual = { ...manualEntry, status: <const>"completed" };
  const completedManualAllocation = allocatePlanMaterials(
    [completedManual, secondManual],
    manualInventory,
    materials,
    new Map([
      [manualKey, [manualIntent]],
      [getCultivationEntryKey(secondManual), [manualIntent]],
    ]),
  );
  assert.equal(completedManualAllocation.materials[0]?.required, 2);
  assert.equal(completedManualAllocation.materials[0]?.craftable, 2);
  assert.equal(completedManualAllocation.remainingInventory.get(source), 2);

  // 高优先级转换不能挪用后续目标预留的周本来源。
  const weeklyEntries = [
    makeEntry("weekly-high", target, 0, { useDust: true }),
    makeEntry("weekly-low", source, 1),
  ];
  const weeklyAllocation = allocatePlanMaterials(
    weeklyEntries,
    new Map([
      [source, 1],
      [dust, 1],
    ]),
    materials,
  );
  assert.equal(weeklyAllocation.entries.get("weekly-high")?.[0]?.craftable, 0);
  assert.equal(weeklyAllocation.entries.get("weekly-low")?.[0]?.owned, 1);
  assert.equal(weeklyAllocation.remainingInventory.get(source), 0);
  assert.equal(weeklyAllocation.conversionInventory.get(source), 0);
  const weeklyManual = allocatePlanMaterials(
    weeklyEntries,
    new Map([
      [source, 1],
      [dust, 1],
    ]),
    materials,
    new Map([[getCultivationEntryKey(weeklyEntries[0]), [manualIntent]]]),
  );
  assert.equal(weeklyManual.entries.get("weekly-high")?.[0]?.craftable, 0);
  assert.equal(weeklyManual.entries.get("weekly-low")?.[0]?.owned, 1);

  // 元素石来源保护与周本相同，后续目标的直接库存优先级高于转换。
  const elementSource = 7011;
  const elementTarget = 7012;
  const elementMaterials = [
    makeMaterial(elementSource),
    makeMaterial(elementTarget, 4, [
      makeRecipe("element-target-from-source", [
        [elementSource, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(dust, 1),
  ];
  const elementAllocation = allocatePlanMaterials(
    [
      makeEntry("element-high", elementTarget, 0, { useDust: true }),
      makeEntry("element-low", elementSource, 1),
    ],
    new Map([
      [elementSource, 1],
      [dust, 1],
    ]),
    elementMaterials,
  );
  assert.equal(elementAllocation.entries.get("element-high")?.[0]?.craftable, 0);
  assert.equal(elementAllocation.entries.get("element-low")?.[0]?.owned, 1);

  // 媒介转换也要保护关闭自动合成目标仍可使用的普通来源。
  const protectedSource = 7015;
  const protectedTarget = 7016;
  const protectedMediaTarget = 7017;
  const protectedMaterials = [
    makeMaterial(protectedSource),
    makeMaterial(protectedTarget, 3, [makeRecipe("protected-target", [[protectedSource, 3]])]),
    makeMaterial(protectedMediaTarget, 3, [
      makeRecipe("protected-media-target", [
        [protectedSource, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(dust, 1),
  ];
  const protectedAllocation = allocatePlanMaterials(
    [
      makeEntry("protected-media", protectedMediaTarget, 0, { useDust: true }),
      makeEntry("protected-ordinary", protectedTarget, 1, { allowCrafting: false }),
    ],
    new Map([
      [protectedSource, 3],
      [dust, 1],
    ]),
    protectedMaterials,
  );
  assert.equal(protectedAllocation.entries.get("protected-media")?.[0]?.craftable, 0);
  assert.equal(protectedAllocation.entries.get("protected-ordinary")?.[0]?.missing, 1);

  // 同一目标显式关闭的材料仍须预留普通来源，不能被该目标的其他转换推荐挪用。
  const ownProtected = makeEntry("own-protected", protectedMediaTarget, 0, {
    allowCrafting: false,
  });
  ownProtected.items.push({
    entryId: ownProtected.id,
    materialId: protectedTarget,
    required: 1,
  });
  const ownProtectedAllocation = allocatePlanMaterials(
    [ownProtected],
    new Map([
      [protectedSource, 3],
      [dust, 1],
    ]),
    protectedMaterials,
    new Map([
      [
        getCultivationEntryKey(ownProtected),
        [{ materialId: protectedTarget, count: 0, sourceLimits: [] }],
      ],
    ]),
  );
  const ownProtectedOptions = getConversionOptions(
    [ownProtected],
    ownProtectedAllocation,
    protectedMaterials,
  );
  assert.equal(ownProtectedOptions.length, 1);
  assert.equal(ownProtectedOptions[0]?.intent?.materialId, protectedTarget);

  // 普通合成按目标优先级消耗共享来源。
  const ordinarySource = 7021;
  const ordinaryTarget = 7022;
  const ordinaryTargetTwo = 7023;
  const ordinaryMaterials = [
    makeMaterial(ordinarySource, 1),
    makeMaterial(ordinaryTarget, 3, [makeRecipe("ordinary-target", [[ordinarySource, 3]])]),
    makeMaterial(ordinaryTargetTwo, 3, [makeRecipe("ordinary-target-two", [[ordinarySource, 3]])]),
  ];
  const ordinaryAllocation = allocatePlanMaterials(
    [
      makeEntry("ordinary-first", ordinaryTarget, 0),
      makeEntry("ordinary-second", ordinaryTargetTwo, 1),
    ],
    new Map([[ordinarySource, 3]]),
    ordinaryMaterials,
  );
  assert.equal(ordinaryAllocation.entries.get("ordinary-first")?.[0]?.craftable, 1);
  assert.equal(ordinaryAllocation.entries.get("ordinary-second")?.[0]?.craftable, 0);

  // 单目标预览也必须保护其他目标关闭自动合成时仍可使用的普通合成来源。
  const previewMaterials = [
    ...materials,
    makeMaterial(ordinaryTarget, 3, [makeRecipe("preview-ordinary", [[source, 3]])]),
  ];
  const previewInventory = new Map([
    [source, 3],
    [dust, 1],
  ]);
  assert.equal(
    buildConversionRecommendations([makeResult(target, 1)], previewInventory, previewMaterials)
      .length,
    1,
  );
  assert.deepEqual(
    buildConversionRecommendations([makeResult(target, 1)], previewInventory, previewMaterials, [
      makeResult(ordinaryTarget, 1),
    ]),
    [],
  );
  assert.equal(previewInventory.get(source), 3);

  // 两个角色目标要基于前一目标的余量重新组合经验书，而不是重复读取初始库存。
  const expLow = 104001;
  const expMedium = 104002;
  const firstAvatar = makeEntry("avatar-first", expLow, 0);
  const secondAvatar = makeEntry("avatar-second", expLow, 1);
  firstAvatar.type = "avatar";
  secondAvatar.type = "avatar";
  firstAvatar.currentState.level = 1;
  firstAvatar.targetState.level = 2;
  secondAvatar.currentState.level = 1;
  secondAvatar.targetState.level = 2;
  const experienceMaterials = [makeMaterial(expLow, 2), makeMaterial(expMedium, 3)];
  const experienceAllocation = allocatePlanMaterials(
    [firstAvatar, secondAvatar],
    new Map([
      [expLow, 1],
      [expMedium, 1],
    ]),
    experienceMaterials,
  );
  assert.equal(experienceAllocation.entries.get("avatar-first")?.[0]?.id, expLow);
  assert.equal(experienceAllocation.entries.get("avatar-first")?.[0]?.owned, 1);
  assert.equal(experienceAllocation.entries.get("avatar-second")?.[0]?.id, expMedium);
  assert.equal(experienceAllocation.entries.get("avatar-second")?.[0]?.owned, 1);

  // 推荐阶段按普通合成优先，且同一来源库存只能被推荐一次。
  const recommendationResults = [makeResult(ordinaryTarget, 1), makeResult(ordinaryTargetTwo, 1)];
  const recommendationMaterials = [
    makeMaterial(ordinarySource),
    makeMaterial(ordinaryTarget, 3, [
      makeRecipe("ordinary-target-media", [
        [ordinarySource, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(ordinaryTargetTwo, 3, [
      makeRecipe("ordinary-target-two-media", [
        [ordinarySource, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(dust, 1),
  ];
  const recommendationInventory = new Map([
    [ordinarySource, 1],
    [dust, 2],
  ]);
  const recommendationSnapshot = new Map(recommendationInventory);
  const recommendations = buildConversionRecommendations(
    recommendationResults,
    recommendationInventory,
    recommendationMaterials,
  );
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.count, 1);
  assert.equal(countCost(recommendations[0]?.costs ?? [], ordinarySource), 1);
  assert.deepEqual(recommendationInventory, recommendationSnapshot);

  // 无媒介或无来源时不推断供给；关闭计划转换仍保留只读推荐。
  assert.deepEqual(
    buildConversionRecommendations([makeResult(target, 1)], new Map([[source, 1]]), materials),
    [],
  );
  const closedConversion = allocatePlanMaterials(
    [makeEntry("closed-conversion", target, 0, { useDust: false })],
    new Map([
      [source, 1],
      [dust, 1],
    ]),
    materials,
  );
  assert.equal(closedConversion.entries.get("closed-conversion")?.[0]?.craftable, 0);
  assert.equal(closedConversion.recommendations[0]?.count, 1);
  assert.deepEqual(
    buildConversionRecommendations([makeResult(target, 1)], new Map([[dust, 1]]), materials),
    [],
  );

  // 转换准备应保护其他目标的普通来源，并返回目标普通合成后的剩余缺口。
  const preparation = prepareConversionRecommendations(
    [makeResult(target, 1)],
    previewInventory,
    previewMaterials,
    [makeResult(ordinaryTarget, 1)],
  );
  assert.equal(preparation.missing.get(target), 1);
  assert.equal(preparation.inventory.get(source), 0);
  assert.equal(preparation.inventory.get(dust), 1);

  // 编辑预览只能使用用户提供的非媒介来源；来源上限、媒介数量和目标缺口都应生效。
  const recursiveSource = 7051;
  const recursiveIntermediate = 7052;
  const recursiveTarget = 7053;
  const previewGraphMaterials = [
    makeMaterial(recursiveSource, 2),
    makeMaterial(recursiveIntermediate, 3, [
      makeRecipe("recursive-intermediate", [[recursiveSource, 3]]),
    ]),
    makeMaterial(recursiveTarget, 4, [
      makeRecipe("recursive-target", [
        [recursiveIntermediate, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(dust, 1),
  ];
  const previewSourceInventory = new Map([
    [recursiveSource, 6],
    [dust, 1],
  ]);
  const previewResult = makeResult(recursiveTarget, 2);
  const previewInventorySnapshot = new Map(previewSourceInventory);
  const previewSources = getConversionSourceMaterials(
    recursiveTarget,
    previewSourceInventory,
    previewGraphMaterials,
  );
  assert.deepEqual(
    previewSources.map((item) => item.id),
    [recursiveSource],
  );
  const limitedPreview = calculateConversionPreview(
    previewResult,
    previewSourceInventory,
    previewGraphMaterials,
    new Map([[recursiveSource, 4]]),
    2,
  );
  assert.equal(limitedPreview.count, 1);
  assert.equal(countCost(limitedPreview.costs, recursiveSource), 3);
  assert.equal(countCost(limitedPreview.costs, dust), 1);
  assert.equal(limitedPreview.costs.find((cost) => cost.id === recursiveSource)?.owned, 6);
  assert.deepEqual(previewSourceInventory, previewInventorySnapshot);
  assert.equal(
    getConversionSourceLimits(recursiveTarget, 2, previewGraphMaterials).get(recursiveSource),
    6,
  );
  assert.equal(
    calculateConversionPreview(
      previewResult,
      previewSourceInventory,
      previewGraphMaterials,
      new Map([[recursiveSource, 2]]),
      2,
    ).count,
    0,
  );

  // 普通合成即使有媒介库存，也不能伪装成媒介转换推荐。
  const ordinaryPreview = calculateConversionPreview(
    makeResult(ordinaryTarget, 1),
    new Map([
      [ordinarySource, 1],
      [dust, 1],
    ]),
    [
      makeMaterial(ordinarySource),
      makeMaterial(ordinaryTarget, 3, [makeRecipe("ordinary-only", [[ordinarySource, 1]])]),
      makeMaterial(dust, 1),
    ],
    new Map([[ordinarySource, 1]]),
    1,
  );
  assert.equal(ordinaryPreview.count, 0);
  assert.deepEqual(ordinaryPreview.costs, []);

  // 已完成目标只生成展示结果，不预留活动目标的直接库存。
  const completedAllocation = allocatePlanMaterials(
    [makeEntry("completed", source, 0, {}, "completed"), makeEntry("active", source, 1)],
    new Map([[source, 1]]),
    [makeMaterial(source)],
  );
  assert.equal(completedAllocation.entries.get("completed")?.[0]?.owned, 1);
  assert.equal(completedAllocation.entries.get("active")?.[0]?.owned, 1);
  assert.equal(completedAllocation.remainingInventory.get(source), 0);
  assert.equal(completedAllocation.materials.length, 1);

  // 媒介可递归用于低阶材料，再完成目标的普通升阶配方。
  const redShard = 7031;
  const blueShard = 7032;
  const redFragment = 7033;
  const recursiveMaterials = [
    makeMaterial(redShard, 2, [
      makeRecipe("red-shard-from-blue", [
        [blueShard, 1],
        [dust, 1],
      ]),
    ]),
    makeMaterial(blueShard, 2),
    makeMaterial(redFragment, 3, [makeRecipe("red-fragment-from-shards", [[redShard, 3]])]),
    makeMaterial(dust, 1),
  ];
  const recursiveAllocation = allocatePlanMaterials(
    [makeEntry("recursive", redFragment, 0, { useDust: true })],
    new Map([
      [redShard, 2],
      [blueShard, 1],
      [dust, 1],
    ]),
    recursiveMaterials,
  );
  const recursiveResult = recursiveAllocation.entries.get("recursive")?.[0];
  assert.equal(recursiveResult?.craftable, 1);
  assert.equal(countCost(recursiveResult?.craftingCosts ?? [], redShard), 2);
  assert.equal(countCost(recursiveResult?.craftingCosts ?? [], blueShard), 1);
  assert.equal(countCost(recursiveResult?.craftingCosts ?? [], dust), 1);

  // 真实周本配方仅使用其他目标预留后的余量，并受异梦溶媒数量限制。
  const realWeeklyTarget = makeEntry("real-weekly-target", 113007, 0);
  realWeeklyTarget.items[0].required = 2;
  const realWeeklyProtected = makeEntry("real-weekly-protected", 113006, 1);
  realWeeklyProtected.items[0].required = 3;
  const realWeeklyAllocation = allocatePlanMaterials(
    [realWeeklyTarget, realWeeklyProtected],
    new Map([
      [113006, 5],
      [solvent, 1],
    ]),
    wikiMaterials,
  );
  assert.equal(realWeeklyAllocation.entries.get(realWeeklyProtected.id)?.[0]?.owned, 3);
  assert.equal(realWeeklyAllocation.recommendations[0]?.count, 1);
  assert.equal(countCost(realWeeklyAllocation.recommendations[0]?.costs ?? [], 113006), 1);
  assert.equal(countCost(realWeeklyAllocation.recommendations[0]?.costs ?? [], solvent), 1);
  assert.equal(
    realWeeklyAllocation.recommendations[0]?.costs.find((cost) => cost.id === 113006)?.owned,
    2,
  );
  assert.equal(realWeeklyAllocation.entries.get(realWeeklyTarget.id)?.[0]?.craftable, 0);

  // 真实周本材料可在编辑预览中切换为同一周本的其他来源。
  const realWeeklyResult = makeResult(113006, 1);
  const realWeeklySourceInventory = new Map([
    [113007, 1],
    [solvent, 1],
  ]);
  assert.deepEqual(
    getConversionSourceMaterials(113006, realWeeklySourceInventory, wikiMaterials).map(
      (item) => item.id,
    ),
    [113007],
  );
  const realWeeklyPreview = calculateConversionPreview(
    realWeeklyResult,
    realWeeklySourceInventory,
    wikiMaterials,
    new Map([[113007, 1]]),
    1,
  );
  assert.equal(realWeeklyPreview.count, 1);
  assert.equal(countCost(realWeeklyPreview.costs, 113007), 1);
  assert.equal(countCost(realWeeklyPreview.costs, solvent), 1);

  // 使用真实元素石配方覆盖媒介递归耗尽后的推荐路径。
  const realFirst = makeEntry("real-red-first", 104112, 0, { allowCrafting: false });
  const realSecond = makeEntry("real-red-second", 104112, 1, { allowCrafting: false });
  realSecond.items[0].required = 4;
  const realAllocation = allocatePlanMaterials(
    [realFirst, realSecond],
    new Map([
      [104111, 2],
      [104112, 1],
      [104121, 4],
      [104122, 3],
      [dust, 6],
    ]),
    wikiMaterials,
  );
  const realResult = realAllocation.materials.find((material) => material.id === 104112);
  assert.equal(realResult?.required, 5);
  assert.equal(realResult?.owned, 1);
  assert.ok((realAllocation.recommendations[0]?.count ?? 0) > 0);
  assert.ok((realAllocation.recommendations[0]?.count ?? 0) <= 4);
  assert.ok(realAllocation.recommendations[0]?.costs.some((cost) => cost.id === dust));

  // 真实元素石支持从低阶同系材料递归提升后再执行媒介转换。
  const realGemSourceInventory = new Map([
    [104121, 3],
    [dust, 3],
  ]);
  assert.deepEqual(
    getConversionSourceMaterials(104112, realGemSourceInventory, wikiMaterials).map(
      (item) => item.id,
    ),
    [104121],
  );
  const realGemPreview = calculateConversionPreview(
    makeResult(104112, 1),
    realGemSourceInventory,
    wikiMaterials,
    new Map([[104121, 3]]),
    1,
  );
  assert.equal(realGemPreview.count, 1);
  assert.equal(countCost(realGemPreview.costs, 104121), 3);
  assert.equal(countCost(realGemPreview.costs, dust), 3);

  // 合并时要累计首个结果自身重复来源，并取来源库存的最大值。
  const merged = mergeCultivationResults([
    {
      ...makeResult(7041, 2),
      craftingCosts: [
        { id: source, name: "来源", type: "regression", star: 1, count: 2, owned: 2 },
        { id: source, name: "来源", type: "regression", star: 1, count: 1, owned: 5 },
      ],
    },
    {
      ...makeResult(7041, 1),
      craftingCosts: [
        { id: source, name: "来源", type: "regression", star: 1, count: 4, owned: 3 },
      ],
    },
  ]);
  assert.equal(merged[0]?.required, 3);
  assert.equal(merged[0] ? countCost(merged[0].craftingCosts, source) : 0, 7);
  assert.equal(merged[0]?.craftingCosts[0]?.owned, 5);
}

try {
  const utils = <PlanUtils>await server.ssrLoadModule("/src/utils/cultivationPlan.ts");
  const data = <
    {
      WikiMaterialData: Array<TGApp.App.Material.WikiItem>;
    }
  >await server.ssrLoadModule("/src/data/index.ts");
  await runChecks(utils, data.WikiMaterialData);
  console.log("cultivation allocation checks passed");
} finally {
  await server.close();
}
