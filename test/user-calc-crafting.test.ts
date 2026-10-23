/**
 * 材料合成的事务回滚与计算器复用回归测试。
 * @since Beta v0.13.0
 */

import { calculateCraftingAllocation, createCraftingCalculator } from "@utils/game/userCalc.js";
import { describe, expect, it } from "vitest";

import { WikiMaterialData } from "@/data/index.js";

/**
 * 创建指定星级与配方的材料 Wiki 测试数据。
 * @since Beta v0.13.0
 * @param id - 材料 ID
 * @param star - 材料星级
 * @param convert - 材料可用的合成配方
 * @returns 材料 Wiki 测试数据
 */
function makeMaterial(
  id: number,
  star: number = 3,
  convert: Array<TGApp.App.Material.Convert> = [],
): TGApp.App.Material.WikiItem {
  return {
    id,
    name: `回归材料 ${id}`,
    description: "合成回归材料",
    type: "regression",
    cType: "regression",
    star,
    source: [],
    convert,
  };
}

/**
 * 创建指定来源材料与数量的合成配方。
 * @since Beta v0.13.0
 * @param id - 合成配方 ID
 * @param sources - 来源材料 ID 与需求数量
 * @returns 包含来源材料数量的合成配方
 */
function makeRecipe(
  id: string,
  sources: ReadonlyArray<readonly [number, number]>,
): TGApp.App.Material.Convert {
  return {
    id,
    source: sources.map(([sourceId, count]) => ({
      id: String(sourceId),
      name: `回归材料 ${sourceId}`,
      type: "regression",
      star: 1,
      count,
    })),
  };
}

/**
 * 创建备用、递归、循环及失败配方的回滚测试数据。
 * @since Beta v0.13.0
 * @returns 包含材料、库存与场景 ID 的回滚测试数据
 */
function createRollbackBundle(): {
  materials: Array<TGApp.App.Material.WikiItem>;
  inventory: Map<number, number>;
  ids: Record<
    | "fallback"
    | "fallbackFirstSource"
    | "fallbackMissingSource"
    | "fallbackSecondSource"
    | "recursive"
    | "recursiveSource"
    | "recursiveMissingSource"
    | "recursiveLeaf"
    | "recursiveAlternative"
    | "cycle"
    | "cycleSource"
    | "cycleAlternative"
    | "cycleLeaf"
    | "failed"
    | "failedNewSource"
    | "failedZeroSource"
    | "failedLeaf",
    number
  >;
} {
  const ids = {
    fallback: 900001,
    fallbackFirstSource: 900002,
    fallbackMissingSource: 900003,
    fallbackSecondSource: 900004,
    recursive: 900005,
    recursiveSource: 900006,
    recursiveMissingSource: 900007,
    recursiveLeaf: 900008,
    recursiveAlternative: 900009,
    cycle: 900010,
    cycleSource: 900011,
    cycleAlternative: 900012,
    cycleLeaf: 900013,
    failed: 900014,
    failedNewSource: 900015,
    failedZeroSource: 900016,
    failedLeaf: 900017,
  };
  const materials = [
    makeMaterial(ids.fallback, 5, [
      makeRecipe("fallback-first", [
        [ids.fallbackFirstSource, 1],
        [ids.fallbackMissingSource, 1],
      ]),
      makeRecipe("fallback-second", [[ids.fallbackSecondSource, 1]]),
    ]),
    makeMaterial(ids.fallbackFirstSource, 1),
    makeMaterial(ids.fallbackMissingSource, 1, [
      makeRecipe("fallback-missing-media", [
        [ids.fallbackSecondSource, 1],
        [104201, 1],
      ]),
    ]),
    makeMaterial(ids.fallbackSecondSource, 1),
    makeMaterial(ids.recursive, 5, [
      makeRecipe("recursive-first", [
        [ids.recursiveSource, 1],
        [ids.recursiveMissingSource, 1],
      ]),
      makeRecipe("recursive-second", [[ids.recursiveAlternative, 1]]),
    ]),
    makeMaterial(ids.recursiveSource, 2, [
      makeRecipe("recursive-source", [[ids.recursiveLeaf, 1]]),
    ]),
    makeMaterial(ids.recursiveMissingSource, 2, [makeRecipe("recursive-missing", [[900018, 1]])]),
    makeMaterial(ids.recursiveLeaf, 1),
    makeMaterial(ids.recursiveAlternative, 1),
    makeMaterial(ids.cycle, 5, [
      makeRecipe("cycle-first", [[ids.cycleSource, 1]]),
      makeRecipe("cycle-second", [[ids.cycleAlternative, 1]]),
    ]),
    makeMaterial(ids.cycleSource, 2, [makeRecipe("cycle-source", [[ids.cycle, 1]])]),
    makeMaterial(ids.cycleAlternative, 1),
    makeMaterial(ids.cycleLeaf, 1),
    makeMaterial(ids.failed, 5, [
      makeRecipe("failed-new", [[ids.failedNewSource, 1]]),
      makeRecipe("failed-zero", [[ids.failedZeroSource, 1]]),
    ]),
    makeMaterial(ids.failedNewSource, 2, [makeRecipe("failed-new-source", [[ids.failedLeaf, 1]])]),
    makeMaterial(ids.failedZeroSource, 2, [
      makeRecipe("failed-zero-source", [[ids.failedLeaf, 1]]),
    ]),
    makeMaterial(ids.failedLeaf, 1),
  ];
  const inventory = new Map<number, number>([
    [ids.fallbackFirstSource, 1],
    [ids.fallbackSecondSource, 1],
    [ids.recursiveLeaf, 1],
    [ids.recursiveAlternative, 1],
    [ids.cycleAlternative, 1],
    [ids.failedZeroSource, 0],
    [104201, 1],
  ]);
  return { materials, inventory, ids };
}

describe("calculateCraftingAllocation", () => {
  it("首个配方失败后恢复已消耗来源，再尝试备用配方", () => {
    const { materials, inventory, ids } = createRollbackBundle();
    const snapshot = structuredClone({ materials, inventory });
    const result = calculateCraftingAllocation(
      [{ id: ids.fallback, count: 1 }],
      inventory,
      materials,
    );

    expect(result.materials.get(ids.fallback)).toStrictEqual({
      count: 1,
      consumed: [{ id: ids.fallbackSecondSource, count: 1 }],
    });
    expect(result.remainingInventory.get(ids.fallbackFirstSource)).toBe(1);
    expect(result.remainingInventory.get(ids.fallbackSecondSource)).toBe(0);
    expect(result.remainingInventory.has(ids.fallbackMissingSource)).toBe(false);
    expect({ materials, inventory }).toStrictEqual(snapshot);
  });

  it("递归合成的同级来源失败时回滚子配方消耗", () => {
    const { materials, inventory, ids } = createRollbackBundle();
    const result = calculateCraftingAllocation(
      [{ id: ids.recursive, count: 1 }],
      inventory,
      materials,
    );

    expect(result.materials.get(ids.recursive)).toStrictEqual({
      count: 1,
      consumed: [{ id: ids.recursiveAlternative, count: 1 }],
    });
    expect(result.remainingInventory.get(ids.recursiveLeaf)).toBe(1);
    expect(result.remainingInventory.get(ids.recursiveAlternative)).toBe(0);
    expect(result.remainingInventory.has(ids.recursiveMissingSource)).toBe(false);
  });

  it("循环配方失败后仍可使用非循环备用配方", () => {
    const { materials, inventory, ids } = createRollbackBundle();
    const result = calculateCraftingAllocation([{ id: ids.cycle, count: 1 }], inventory, materials);

    expect(result.materials.get(ids.cycle)).toStrictEqual({
      count: 1,
      consumed: [{ id: ids.cycleAlternative, count: 1 }],
    });
    expect(result.remainingInventory.get(ids.cycleAlternative)).toBe(0);
    expect(result.remainingInventory.has(ids.cycleSource)).toBe(false);
  });

  it("所有配方失败时移除临时库存键并保留原有零库存键", () => {
    const { materials, inventory, ids } = createRollbackBundle();
    const result = calculateCraftingAllocation(
      [{ id: ids.failed, count: 1 }],
      inventory,
      materials,
    );

    expect(result.materials.size).toBe(0);
    expect(result.remainingInventory.has(ids.failedNewSource)).toBe(false);
    expect(result.remainingInventory.has(ids.failedLeaf)).toBe(false);
    expect(result.remainingInventory.has(ids.failedZeroSource)).toBe(true);
    expect(result.remainingInventory.get(ids.failedZeroSource)).toBe(0);
    expect(Array.from(result.remainingInventory)).toStrictEqual([...inventory, [ids.failed, 0]]);
  });

  it("使用真实 Wiki 多级配方补足大批量突破材料", () => {
    const requirements = [
      { id: 112004, count: 120 },
      { id: 112007, count: 90 },
      { id: 112010, count: 90 },
      { id: 112013, count: 60 },
    ];
    const sources = <const>[
      [112002, 1_080],
      [112005, 810],
      [112008, 810],
      [112011, 540],
    ];
    const inventory = new Map(WikiMaterialData.map((material) => [material.id, 0]));
    for (const [id, count] of sources) inventory.set(id, count);
    const snapshot = structuredClone({ requirements, inventory });
    const result = calculateCraftingAllocation(requirements, inventory, WikiMaterialData);

    for (const [index, requirement] of requirements.entries()) {
      const [sourceId, count] = sources[index];
      expect(result.materials.get(requirement.id)).toStrictEqual({
        count: requirement.count,
        consumed: [{ id: sourceId, count }],
      });
      expect(result.remainingInventory.get(sourceId)).toBe(0);
    }
    expect({ requirements, inventory }).toStrictEqual(snapshot);
  });
});

describe("createCraftingCalculator", () => {
  /**
   * 合成计算提前返回的回归测试用例。
   * @since Beta v0.13.0
   */
  type EarlyExitCase = {
    name: string;
    requirements: Array<{ id: number; count: number }>;
    inventory: Array<[number, number]>;
    remaining: Array<[number, number]>;
  };

  const cases: Array<EarlyExitCase> = [
    {
      name: "空需求保持库存及顺序",
      requirements: [],
      inventory: [[900016, 0]],
      remaining: [[900016, 0]],
    },
    {
      name: "直接满足需求时预留库存",
      requirements: [{ id: 900004, count: 1 }],
      inventory: [
        [900016, 0],
        [900004, 2],
      ],
      remaining: [
        [900016, 0],
        [900004, 1],
      ],
    },
    {
      name: "未知材料保留需求的零库存键",
      requirements: [{ id: 900021, count: 2 }],
      inventory: [[900016, 0]],
      remaining: [
        [900016, 0],
        [900021, 0],
      ],
    },
    {
      name: "无配方材料保留需求的零库存键",
      requirements: [{ id: 900013, count: 1 }],
      inventory: [[900016, 0]],
      remaining: [
        [900016, 0],
        [900013, 0],
      ],
    },
    {
      name: "未启用媒介时保持来源库存",
      requirements: [{ id: 900003, count: 1 }],
      inventory: [
        [104201, 1],
        [900004, 1],
      ],
      remaining: [
        [104201, 1],
        [900004, 1],
        [900003, 0],
      ],
    },
  ];

  it.each(cases)("$name", ({ requirements, inventory: values, remaining }) => {
    const { materials } = createRollbackBundle();
    const inventory = new Map(values);
    const snapshot = structuredClone({ requirements, inventory, materials });
    const calculator = createCraftingCalculator(materials);
    const result = calculator(requirements, inventory);

    expect(result.materials.size).toBe(0);
    expect(Array.from(result.remainingInventory)).toStrictEqual(remaining);
    expect({ requirements, inventory, materials }).toStrictEqual(snapshot);
  });

  it("复用计算器时每次独立处理库存与媒介开关，并保持历史结果不变", () => {
    const { materials, ids } = createRollbackBundle();
    const calculator = createCraftingCalculator(materials);
    const firstInventory = new Map([
      [ids.fallbackFirstSource, 1],
      [ids.fallbackSecondSource, 1],
    ]);
    const first = calculator([{ id: ids.fallback, count: 1 }], firstInventory);
    const firstSnapshot = structuredClone(first);
    const requirements = [{ id: ids.fallbackMissingSource, count: 1 }];
    const inventory = new Map([
      [104201, 1],
      [ids.fallbackSecondSource, 1],
    ]);
    const inventorySnapshot = new Map(inventory);
    const disabled = calculator(requirements, inventory);
    const enabled = calculator(requirements, inventory, true);
    const disabledAgain = calculator(requirements, inventory);

    expect(first.materials.get(ids.fallback)?.count).toBe(1);
    expect(disabled.materials.size).toBe(0);
    expect(enabled.materials.get(ids.fallbackMissingSource)).toStrictEqual({
      count: 1,
      consumed: [
        { id: 104201, count: 1 },
        { id: ids.fallbackSecondSource, count: 1 },
      ],
    });
    expect(enabled.remainingInventory.get(104201)).toBe(0);
    expect(enabled.remainingInventory.get(ids.fallbackSecondSource)).toBe(0);
    expect(disabledAgain).toStrictEqual(disabled);
    expect(first).toStrictEqual(firstSnapshot);
    expect(inventory).toStrictEqual(inventorySnapshot);
    expect(Array.from(firstInventory)).toStrictEqual([
      [ids.fallbackFirstSource, 1],
      [ids.fallbackSecondSource, 1],
    ]);
  });

  it("材料配方变化后重新创建计算器即可使用新配方", () => {
    const { materials, ids } = createRollbackBundle();
    const target = materials.find((material) => material.id === ids.fallbackFirstSource);
    expect(target).toBeDefined();
    if (!target) throw new Error("缺少可变配方测试材料");
    const requirements = [{ id: ids.fallbackFirstSource, count: 1 }];
    const inventory = new Map([[ids.fallbackSecondSource, 1]]);
    const original = createCraftingCalculator(materials)(requirements, inventory);

    expect(original.materials.size).toBe(0);
    target.convert.push(makeRecipe("mutable-fallback-source", [[ids.fallbackSecondSource, 1]]));
    const refreshed = createCraftingCalculator(materials)(requirements, inventory);

    expect(refreshed.materials.get(ids.fallbackFirstSource)).toStrictEqual({
      count: 1,
      consumed: [{ id: ids.fallbackSecondSource, count: 1 }],
    });
    expect(original.materials.size).toBe(0);
    expect(inventory.get(ids.fallbackSecondSource)).toBe(1);
  });
});
