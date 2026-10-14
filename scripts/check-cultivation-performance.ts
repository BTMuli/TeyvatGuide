/**
 * 养成计划材料计算性能与等价性基准。
 * @since Beta v0.12.5
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { Plugin } from "vite";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const benchmarkIterations = 3;
const baselinePlanModuleId = "/src/utils/cultivationPlan.ts";
const baselineUserCalcModuleId = "/src/utils/userCalc.ts";

type PlanUtils = typeof import("../src/utils/cultivationPlan.js");
type UserCalc = typeof import("../src/utils/userCalc.js");
type CraftingAllocation = ReturnType<UserCalc["calculateCraftingAllocation"]>;
type CraftingCalculator = ReturnType<UserCalc["createCraftingCalculator"]>;

type PlanInputs = {
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  inventory: Map<number, number>;
  materials: Array<TGApp.App.Material.WikiItem>;
  intents: ReadonlyMap<string, ReadonlyArray<TGApp.App.UserCalc.ConversionIntent>>;
  snapshot?: unknown;
};

type PlanResult = {
  allocation: ReturnType<PlanUtils["allocatePlanMaterials"]>;
  options: ReturnType<PlanUtils["getConversionOptions"]>;
};

type PlanScenario = {
  name: string;
  iterations?: number;
  create: () => PlanInputs;
};

type CraftInputs = {
  requirements: Array<{ id: number; count: number }>;
  inventory: Map<number, number>;
  materials: Array<TGApp.App.Material.WikiItem>;
  useDust: boolean;
  useSolvent: boolean;
  snapshot?: unknown;
};

type CraftScenario = {
  name: string;
  iterations?: number;
  create: () => CraftInputs;
  verify?: (result: CraftingAllocation) => void;
};

type Measurement<T> = {
  result: T;
  averageMs: number;
};

type BaselineSources = {
  cultivationPlan: string;
  userCalc: string;
};

type RollbackBundle = {
  materials: Array<TGApp.App.Material.WikiItem>;
  inventory: Map<number, number>;
  ids: {
    fallback: number;
    fallbackFirstSource: number;
    fallbackMissingSource: number;
    fallbackSecondSource: number;
    recursive: number;
    recursiveSource: number;
    recursiveMissingSource: number;
    recursiveLeaf: number;
    recursiveAlternative: number;
    cycle: number;
    cycleSource: number;
    cycleAlternative: number;
    cycleLeaf: number;
    failed: number;
    failedNewSource: number;
    failedZeroSource: number;
    failedLeaf: number;
  };
};

function makeMaterial(
  id: number,
  star = 3,
  convert: Array<TGApp.App.Material.Convert> = [],
): TGApp.App.Material.WikiItem {
  return {
    id,
    name: `基准材料 ${id}`,
    description: "养成性能基准材料",
    type: "性能基准",
    cType: "性能基准",
    star,
    source: [],
    convert,
  };
}

function makeRecipe(
  id: string,
  sources: ReadonlyArray<readonly [number, number]>,
): TGApp.App.Material.Convert {
  return {
    id,
    source: sources.map(([sourceId, count]) => ({
      id: String(sourceId),
      name: `基准材料 ${sourceId}`,
      type: "性能基准",
      star: 1,
      count,
    })),
  };
}

function makeEntry(
  id: string,
  items: ReadonlyArray<readonly [number, number]>,
  sortOrder: number,
  options: Partial<TGApp.Sqlite.Cultivation.CraftingOptions> = {},
  status: TGApp.Sqlite.Cultivation.EntryStatus = "active",
): TGApp.Sqlite.Cultivation.EntryWithItems {
  return {
    id,
    projectId: "cultivation-performance",
    type: "weapon",
    itemId: 100000 + sortOrder,
    instanceKey: id,
    name: `性能目标 ${id}`,
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
    items: items.map(([materialId, required]) => ({ entryId: id, materialId, required })),
  };
}

function getEntryKey(
  entry: Pick<TGApp.Sqlite.Cultivation.Entry, "type" | "itemId" | "instanceKey">,
): string {
  return JSON.stringify([entry.type, entry.itemId, entry.instanceKey]);
}

function makeCompleteInventory(
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): Map<number, number> {
  return new Map(materials.map((material) => <const>[material.id, 0]));
}

function setInventoryValues(
  inventory: Map<number, number>,
  values: ReadonlyArray<readonly [number, number]>,
): Map<number, number> {
  for (const [id, count] of values) inventory.set(id, count);
  return inventory;
}

function runPlanScenario(utils: PlanUtils, input: PlanInputs): PlanResult {
  const allocation = utils.allocatePlanMaterials(
    input.entries,
    input.inventory,
    input.materials,
    input.intents,
  );
  const options = utils.getConversionOptions(input.entries, allocation, input.materials);
  return { allocation, options };
}

function runCraftScenario(userCalc: UserCalc, input: CraftInputs): CraftingAllocation {
  return userCalc.calculateCraftingAllocation(
    input.requirements,
    input.inventory,
    input.materials,
    input.useDust,
    input.useSolvent,
  );
}

function runPreparedCraftScenario(
  calculator: CraftingCalculator,
  input: CraftInputs,
): CraftingAllocation {
  return calculator(input.requirements, input.inventory, input.useDust, input.useSolvent);
}

function createCraftingCalculator(
  userCalc: UserCalc,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
): CraftingCalculator {
  if (!userCalc.createCraftingCalculator) {
    throw new Error("Current userCalc module does not export createCraftingCalculator");
  }
  return userCalc.createCraftingCalculator(materials);
}

function preparePlanInput(scenario: PlanScenario): PlanInputs {
  const input = scenario.create();
  input.snapshot = structuredClone({
    entries: input.entries,
    inventory: input.inventory,
    intents: input.intents,
  });
  return input;
}

function prepareCraftInput(scenario: CraftScenario): CraftInputs {
  const input = scenario.create();
  input.snapshot = structuredClone({
    requirements: input.requirements,
    inventory: input.inventory,
    materials: input.materials,
  });
  return input;
}

function assertPlanInputUnchanged(scenario: PlanScenario, input: PlanInputs): void {
  assert.deepStrictEqual(
    { entries: input.entries, inventory: input.inventory, intents: input.intents },
    input.snapshot,
    `${scenario.name} mutated its input`,
  );
}

function assertCraftInputUnchanged(scenario: CraftScenario, input: CraftInputs): void {
  assert.deepStrictEqual(
    { requirements: input.requirements, inventory: input.inventory, materials: input.materials },
    input.snapshot,
    `${scenario.name} mutated its input`,
  );
}

function measure<T>(run: () => T, iterations: number): Measurement<T> {
  if (iterations > 1) run();
  const start = performance.now();
  let result = run();
  for (let index = 1; index < iterations; index++) result = run();
  return {
    result,
    averageMs: (performance.now() - start) / iterations,
  };
}

function formatTiming(current: Measurement<unknown>, baseline?: Measurement<unknown>): string {
  const currentText = `${current.averageMs.toFixed(2)} ms/run`;
  if (!baseline) return currentText;
  const baselineText = `${baseline.averageMs.toFixed(2)} ms/run`;
  const speedup = baseline.averageMs / Math.max(current.averageMs, Number.EPSILON);
  return `${currentText}, baseline ${baselineText}, relative ${speedup.toFixed(2)}x`;
}

function compareResults<T>(name: string, current: Measurement<T>, baseline: Measurement<T>): void {
  try {
    assert.deepStrictEqual(current.result, baseline.result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${name} differs from the baseline: ${message}`, { cause: error });
  }
}

function assertOrderedMapEqual<K, V>(
  name: string,
  current: ReadonlyMap<K, V>,
  baseline: ReadonlyMap<K, V>,
): void {
  assert.deepStrictEqual(
    Array.from(current.entries()),
    Array.from(baseline.entries()),
    `${name} entries differ`,
  );
}

function comparePlanResults(
  name: string,
  current: Measurement<PlanResult>,
  baseline: Measurement<PlanResult>,
): void {
  compareResults(name, current, baseline);
  assertOrderedMapEqual(
    `${name}/remainingInventory`,
    current.result.allocation.remainingInventory,
    baseline.result.allocation.remainingInventory,
  );
  assertOrderedMapEqual(
    `${name}/conversionInventory`,
    current.result.allocation.conversionInventory,
    baseline.result.allocation.conversionInventory,
  );
}

function compareCraftingAllocations(
  name: string,
  current: CraftingAllocation,
  baseline: CraftingAllocation,
): void {
  assert.deepStrictEqual(current, baseline, `${name} differs`);
  assertOrderedMapEqual(`${name}/materials`, current.materials, baseline.materials);
  assertOrderedMapEqual(
    `${name}/remainingInventory`,
    current.remainingInventory,
    baseline.remainingInventory,
  );
}

function compareCraftingResults(
  name: string,
  current: Measurement<CraftingAllocation>,
  baseline: Measurement<CraftingAllocation>,
): void {
  compareCraftingAllocations(name, current.result, baseline.result);
}

function planSummary(result: PlanResult): string {
  const missing = result.allocation.materials.reduce(
    (total, material) => total + material.missing,
    0,
  );
  return `${result.allocation.materials.length} materials, ${result.options.length} conversion options, ${missing} missing units`;
}

function craftSummary(result: ReturnType<UserCalc["calculateCraftingAllocation"]>): string {
  let crafted = 0;
  for (const allocation of result.materials.values()) crafted += allocation.count;
  return `${result.materials.size} targets, ${crafted} crafted units`;
}

function createWikiScenarios(
  wikiMaterials: Array<TGApp.App.Material.WikiItem>,
): Array<PlanScenario> {
  const completeInventory = (): Map<number, number> =>
    setInventoryValues(makeCompleteInventory(wikiMaterials), [
      [113060, 5],
      [113061, 0],
      [113062, 2],
      [113021, 4],
      [104111, 9],
      [104112, 1],
      [104121, 6],
      [104122, 6],
      [104201, 12],
      [112002, 160],
      [112005, 30],
      [112008, 30],
      [112011, 24],
      [202, 1_000_000],
    ]);

  const multiTarget = (): PlanInputs => {
    const entries = [
      makeEntry("wiki-silk-manual", [[113061, 6]], 0, {
        allowCrafting: true,
        useSolvent: true,
      }),
      makeEntry("wiki-gem-media", [[104112, 8]], 1, {
        allowCrafting: true,
        useDust: true,
      }),
      makeEntry("wiki-ordinary", [[112004, 24]], 2, { allowCrafting: true }),
      makeEntry("wiki-disabled", [[112007, 3]], 3, { allowCrafting: false }),
    ];
    const manualKey = getEntryKey(entries[0]);
    const intents = new Map<string, Array<TGApp.App.UserCalc.ConversionIntent>>([
      [
        manualKey,
        [
          {
            materialId: 113061,
            count: 3,
            sourceLimits: [{ id: 113060, count: 3 }],
          },
        ],
      ],
    ]);
    return {
      entries,
      inventory: completeInventory(),
      materials: wikiMaterials,
      intents,
    };
  };

  const manyTargets = (): PlanInputs => {
    const entries = Array.from({ length: 36 }, (_, index) => {
      const kind = index % 4;
      if (kind === 0) {
        return makeEntry(`wiki-many-silk-${index}`, [[113061, 2]], index, {
          allowCrafting: true,
          useSolvent: true,
        });
      }
      if (kind === 1) {
        return makeEntry(`wiki-many-gem-${index}`, [[104112, 2]], index, {
          allowCrafting: true,
          useDust: true,
        });
      }
      if (kind === 2) return makeEntry(`wiki-many-ordinary-${index}`, [[112004, 2]], index);
      return makeEntry(`wiki-many-disabled-${index}`, [[112007, 1]], index, {
        allowCrafting: false,
      });
    });
    const intents = new Map<string, Array<TGApp.App.UserCalc.ConversionIntent>>();
    for (const entry of entries.filter((_, index) => index % 4 === 0 && index < 8)) {
      intents.set(getEntryKey(entry), [
        {
          materialId: 113061,
          count: 1,
          sourceLimits: [{ id: 113060, count: 1 }],
        },
      ]);
    }
    const inventory = completeInventory();
    setInventoryValues(inventory, [
      [113060, 8],
      [113021, 4],
      [104111, 12],
      [104122, 12],
      [104201, 18],
      [112002, 36],
    ]);
    return { entries, inventory, materials: wikiMaterials, intents };
  };

  const ordinary = (): PlanInputs => {
    const entries = [
      makeEntry("ordinary-slime", [[112004, 120]], 0),
      makeEntry("ordinary-mask", [[112007, 90]], 1),
      makeEntry("ordinary-scroll", [[112010, 90]], 2),
      makeEntry("ordinary-arrow", [[112013, 60]], 3),
    ];
    return {
      entries,
      inventory: setInventoryValues(makeCompleteInventory(wikiMaterials), [
        [112002, 1_080],
        [112005, 810],
        [112008, 810],
        [112011, 540],
      ]),
      materials: wikiMaterials,
      intents: new Map(),
    };
  };

  const cyclicMedia = (): PlanInputs => {
    const entries = [
      makeEntry("cycle-silk", [[113061, 4]], 0, {
        allowCrafting: true,
        useSolvent: true,
      }),
      makeEntry("cycle-lamp", [[113060, 2]], 1, {
        allowCrafting: true,
        useSolvent: true,
      }),
    ];
    return {
      entries,
      inventory: setInventoryValues(makeCompleteInventory(wikiMaterials), [
        [113060, 1],
        [113061, 0],
        [113062, 0],
        [113021, 1],
      ]),
      materials: wikiMaterials,
      intents: new Map(),
    };
  };

  return [
    {
      name: "wiki-multi-target-complete-inventory",
      iterations: benchmarkIterations,
      create: multiTarget,
    },
    {
      name: "wiki-many-targets-complete-inventory",
      iterations: benchmarkIterations,
      create: manyTargets,
    },
    { name: "wiki-large-ordinary-ascension", iterations: benchmarkIterations, create: ordinary },
    {
      name: "wiki-cyclic-media-insufficient",
      iterations: benchmarkIterations,
      create: cyclicMedia,
    },
  ];
}

function createRollbackBundle(): RollbackBundle {
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

function createRollbackScenarios(bundle: RollbackBundle): {
  plan: PlanScenario;
  craft: Array<CraftScenario>;
} {
  const plan: PlanScenario = {
    name: "synthetic-crafting-rollback-and-cycle",
    create: () => ({
      entries: [
        makeEntry("rollback-fallback", [[bundle.ids.fallback, 1]], 0),
        makeEntry("rollback-recursive", [[bundle.ids.recursive, 1]], 1),
        makeEntry("rollback-cycle", [[bundle.ids.cycle, 1]], 2),
        makeEntry("rollback-failed", [[bundle.ids.failed, 1]], 3),
      ],
      inventory: new Map(bundle.inventory),
      materials: bundle.materials,
      intents: new Map(),
    }),
  };
  const makeCraft = (
    name: string,
    target: number,
    verify: (result: ReturnType<UserCalc["calculateCraftingAllocation"]>) => void,
  ): CraftScenario => ({
    name,
    create: () => ({
      requirements: [{ id: target, count: 1 }],
      inventory: new Map(bundle.inventory),
      materials: bundle.materials,
      useDust: false,
      useSolvent: false,
    }),
    verify,
  });
  return {
    plan,
    craft: [
      makeCraft("craft-fallback-after-partial-source", bundle.ids.fallback, (result) => {
        assert.equal(result.materials.get(bundle.ids.fallback)?.count, 1);
        assert.equal(result.remainingInventory.get(bundle.ids.fallbackFirstSource), 1);
        assert.equal(result.remainingInventory.get(bundle.ids.fallbackSecondSource), 0);
        assert.equal(result.remainingInventory.has(bundle.ids.fallbackMissingSource), false);
      }),
      makeCraft("craft-recursive-sibling-rollback", bundle.ids.recursive, (result) => {
        assert.equal(result.materials.get(bundle.ids.recursive)?.count, 1);
        assert.equal(result.remainingInventory.get(bundle.ids.recursiveLeaf), 1);
        assert.equal(result.remainingInventory.get(bundle.ids.recursiveAlternative), 0);
        assert.equal(result.remainingInventory.has(bundle.ids.recursiveMissingSource), false);
      }),
      makeCraft("craft-cycle-alternative", bundle.ids.cycle, (result) => {
        assert.equal(result.materials.get(bundle.ids.cycle)?.count, 1);
        assert.equal(result.remainingInventory.get(bundle.ids.cycleAlternative), 0);
        assert.equal(result.remainingInventory.has(bundle.ids.cycleSource), false);
      }),
      makeCraft("craft-failed-inventory-rollback", bundle.ids.failed, (result) => {
        assert.equal(result.materials.has(bundle.ids.failed), false);
        assert.equal(result.remainingInventory.has(bundle.ids.failedNewSource), false);
        assert.equal(result.remainingInventory.has(bundle.ids.failedLeaf), false);
        assert.equal(result.remainingInventory.has(bundle.ids.failedZeroSource), true);
        assert.equal(result.remainingInventory.get(bundle.ids.failedZeroSource), 0);
      }),
    ],
  };
}

function createRandomGraphScenario(): {
  plan: PlanScenario;
  craft: CraftScenario;
} {
  const baseId = 920000;
  const nodeCount = 14;
  let state = 0x9e3779b9;
  const nextRandom = (): number => {
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    return (state ^ (state >>> 16)) >>> 0;
  };
  const materials = Array.from({ length: nodeCount }, (_, index) => {
    const sourceA = baseId + ((index + 3) % nodeCount);
    const sourceB = baseId + ((index * 5 + 1) % nodeCount);
    const recipes = [
      makeRecipe(
        `random-${index}-a`,
        index % 3 === 0
          ? [
              [sourceA, 1],
              [104201, 1],
            ]
          : index % 3 === 1
            ? [
                [sourceA, 1],
                [sourceB, 1],
              ]
            : [[sourceA, 1]],
      ),
    ];
    if (index % 4 === 0) recipes.push(makeRecipe(`random-${index}-b`, [[sourceB, 1]]));
    return makeMaterial(baseId + index, (index % 4) + 1, recipes);
  });
  const graphMaterials = [...materials, makeMaterial(104201, 1), makeMaterial(113021, 1)];
  const inventory = new Map<number, number>([
    [104201, 6],
    [113021, 4],
  ]);
  for (let index = 0; index < nodeCount; index++) {
    inventory.set(baseId + index, nextRandom() % 3);
  }
  const plan: PlanScenario = {
    name: "deterministic-random-small-recipe-graph",
    create: () => ({
      entries: [
        makeEntry("random-target-a", [[baseId, 4]], 0, {
          useDust: true,
          useSolvent: true,
        }),
        makeEntry("random-target-b", [[baseId + 5, 3]], 1, {
          useDust: true,
          useSolvent: true,
        }),
        makeEntry("random-target-c", [[baseId + 8, 2]], 2, {
          useDust: true,
          useSolvent: true,
        }),
      ],
      inventory: new Map(inventory),
      materials: graphMaterials,
      intents: new Map(),
    }),
  };
  const craft: CraftScenario = {
    name: "craft-deterministic-random-small-recipe-graph",
    create: () => ({
      requirements: [
        { id: baseId, count: 4 },
        { id: baseId + 5, count: 3 },
        { id: baseId + 8, count: 2 },
      ],
      inventory: new Map(inventory),
      materials: graphMaterials,
      useDust: true,
      useSolvent: true,
    }),
  };
  return { plan, craft };
}

function createLargeCraftScenario(
  wikiMaterials: Array<TGApp.App.Material.WikiItem>,
): CraftScenario {
  return {
    name: "craft-large-ordinary-ascension",
    iterations: benchmarkIterations,
    create: () => ({
      requirements: [
        { id: 112004, count: 120 },
        { id: 112007, count: 90 },
        { id: 112010, count: 90 },
        { id: 112013, count: 60 },
      ],
      inventory: setInventoryValues(makeCompleteInventory(wikiMaterials), [
        [112002, 1_080],
        [112005, 810],
        [112008, 810],
        [112011, 540],
      ]),
      materials: wikiMaterials,
      useDust: false,
      useSolvent: false,
    }),
    verify: (result) => {
      const expectedCrafted = <const>[
        [112004, 120],
        [112007, 90],
        [112010, 90],
        [112013, 60],
      ];
      for (const [id, count] of expectedCrafted) {
        assert.equal(result.materials.get(id)?.count, count);
      }
    },
  };
}

function makeCraftScenario(
  bundle: RollbackBundle,
  name: string,
  requirements: Array<{ id: number; count: number }>,
  inventory: ReadonlyArray<readonly [number, number]>,
  useDust = false,
  useSolvent = false,
  verify?: (result: CraftingAllocation) => void,
): CraftScenario {
  return {
    name,
    create: () => ({
      requirements,
      inventory: new Map(inventory),
      materials: bundle.materials,
      useDust,
      useSolvent,
    }),
    verify,
  };
}

function createEarlyExitCraftScenarios(bundle: RollbackBundle): Array<CraftScenario> {
  const zero = <const>[[bundle.ids.failedZeroSource, 0]];
  const expectRemaining =
    (entries: ReadonlyArray<readonly [number, number]>): ((result: CraftingAllocation) => void) =>
    (result) => {
      assert.equal(result.materials.size, 0);
      assert.deepStrictEqual(Array.from(result.remainingInventory.entries()), entries);
    };
  const unknownId = 900021;
  type EarlyCraftCase = readonly [
    name: string,
    requirements: Array<{ id: number; count: number }>,
    inventory: ReadonlyArray<readonly [number, number]>,
    remaining: ReadonlyArray<readonly [number, number]>,
  ];
  const cases: Array<EarlyCraftCase> = [
    ["craft-early-empty-requirements", [], zero, zero],
    [
      "craft-early-directly-satisfied",
      [{ id: bundle.ids.fallbackSecondSource, count: 1 }],
      [
        [bundle.ids.failedZeroSource, 0],
        [bundle.ids.fallbackSecondSource, 2],
      ],
      [
        [bundle.ids.failedZeroSource, 0],
        [bundle.ids.fallbackSecondSource, 1],
      ],
    ],
    [
      "craft-early-unknown-material",
      [{ id: unknownId, count: 2 }],
      zero,
      [
        [bundle.ids.failedZeroSource, 0],
        [unknownId, 0],
      ],
    ],
    [
      "craft-early-no-recipe",
      [{ id: bundle.ids.cycleLeaf, count: 1 }],
      zero,
      [
        [bundle.ids.failedZeroSource, 0],
        [bundle.ids.cycleLeaf, 0],
      ],
    ],
    [
      "craft-early-disabled-media-recipe",
      [{ id: bundle.ids.fallbackMissingSource, count: 1 }],
      [
        [104201, 1],
        [bundle.ids.fallbackSecondSource, 1],
      ],
      [
        [104201, 1],
        [bundle.ids.fallbackSecondSource, 1],
        [bundle.ids.fallbackMissingSource, 0],
      ],
    ],
  ];
  return cases.map(([name, requirements, inventory, remaining]) =>
    makeCraftScenario(
      bundle,
      name,
      requirements,
      inventory,
      false,
      false,
      expectRemaining(remaining),
    ),
  );
}

function createManySmallCraftBatch() {
  const randomGraph = createRandomGraphScenario();
  const template = randomGraph.craft.create();
  const inputs = Array.from({ length: 48 }, (_, index) => {
    const requirement = template.requirements[index % template.requirements.length];
    return {
      requirements: [{ id: requirement.id, count: (index % 3) + 1 }],
      inventory: new Map(template.inventory),
      materials: template.materials,
      useDust: index % 2 === 0,
      useSolvent: index % 3 === 0,
    };
  });
  return {
    name: "craft-many-small-allocations",
    iterations: benchmarkIterations,
    materials: template.materials,
    inputs,
  };
}

function assertFactoryScenario(
  userCalc: UserCalc,
  calculator: CraftingCalculator,
  scenario: CraftScenario,
): CraftingAllocation {
  const input = prepareCraftInput(scenario);
  const prepared = runPreparedCraftScenario(calculator, input);
  compareCraftingAllocations(
    `factory/${scenario.name}`,
    prepared,
    runCraftScenario(userCalc, input),
  );
  assertCraftInputUnchanged(scenario, input);
  scenario.verify?.(prepared);
  return prepared;
}

function assertCraftingCalculatorContract(
  userCalc: UserCalc,
  bundle: RollbackBundle,
  earlyExitScenarios: ReadonlyArray<CraftScenario>,
): void {
  const calculator = createCraftingCalculator(userCalc, bundle.materials);
  for (const scenario of earlyExitScenarios) {
    assertFactoryScenario(userCalc, calculator, scenario);
  }

  const firstScenario = makeCraftScenario(
    bundle,
    "factory-isolated-first-call",
    [{ id: bundle.ids.fallback, count: 1 }],
    [
      [bundle.ids.fallbackFirstSource, 1],
      [bundle.ids.fallbackSecondSource, 1],
    ],
  );
  const secondScenario = makeCraftScenario(
    bundle,
    "factory-isolated-second-call",
    [{ id: bundle.ids.fallbackMissingSource, count: 1 }],
    [
      [104201, 1],
      [bundle.ids.fallbackSecondSource, 1],
    ],
    true,
  );
  const first = assertFactoryScenario(userCalc, calculator, firstScenario);
  const firstSnapshot = structuredClone(first);
  assertFactoryScenario(userCalc, calculator, secondScenario);
  assert.deepStrictEqual(first, firstSnapshot, "a later factory call mutated the first result");

  const mutableMaterials = structuredClone(bundle.materials);
  const mutableTarget = mutableMaterials.find(
    (material) => material.id === bundle.ids.fallbackFirstSource,
  );
  if (!mutableTarget) throw new Error("Mutable factory fixture target is missing");
  const mutableCalculator = createCraftingCalculator(userCalc, mutableMaterials);
  const mutableInput: CraftInputs = {
    requirements: [{ id: bundle.ids.fallbackFirstSource, count: 1 }],
    inventory: new Map([[bundle.ids.fallbackSecondSource, 1]]),
    materials: mutableMaterials,
    useDust: false,
    useSolvent: false,
  };
  const beforeMutation = runPreparedCraftScenario(mutableCalculator, mutableInput);
  assert.equal(beforeMutation.materials.size, 0);
  mutableTarget.convert.push(
    makeRecipe("mutable-fallback-source", [[bundle.ids.fallbackSecondSource, 1]]),
  );
  const refreshedCalculator = createCraftingCalculator(userCalc, mutableMaterials);
  const afterMutation = runPreparedCraftScenario(refreshedCalculator, mutableInput);
  assert.equal(afterMutation.materials.get(bundle.ids.fallbackFirstSource)?.count, 1);
  compareCraftingAllocations(
    "factory/recreated-after-material-mutation",
    afterMutation,
    runCraftScenario(userCalc, mutableInput),
  );
}

async function loadBaselineSources(baselineDir: string): Promise<BaselineSources> {
  const [userCalc, cultivationPlan] = await Promise.all([
    readFile(resolve(baselineDir, "userCalc.ts"), "utf8"),
    readFile(resolve(baselineDir, "cultivationPlan.ts"), "utf8"),
  ]);
  return { cultivationPlan, userCalc };
}

function parseBaselineDir(): string | undefined {
  const inline = process.argv.find((argument) => argument.startsWith("--baseline-dir="));
  if (inline) {
    const value = inline.slice("--baseline-dir=".length);
    if (value.length === 0) throw new Error("--baseline-dir requires a directory path");
    return resolve(value);
  }
  const index = process.argv.indexOf("--baseline-dir");
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error("--baseline-dir requires a directory path");
  return resolve(value);
}

function createBaselinePlugin(sources: BaselineSources): Plugin {
  return {
    name: "tg-cultivation-baseline-modules",
    enforce: "pre",
    resolveId(source) {
      if (source === "virtual:tg-cultivation-baseline-plan") return baselinePlanModuleId;
      if (source === baselinePlanModuleId) return baselinePlanModuleId;
      if (source === baselineUserCalcModuleId) return baselineUserCalcModuleId;
      if (source === "@utils/userCalc.js") return baselineUserCalcModuleId;
      return undefined;
    },
    load(id) {
      if (id === baselinePlanModuleId) return sources.cultivationPlan;
      if (id === baselineUserCalcModuleId) return sources.userCalc;
      return undefined;
    },
  };
}

async function createModuleServer(plugins: Array<Plugin> = [], includeUtilityAlias = true) {
  const aliases: Array<{ find: string | RegExp; replacement: string }> = [
    { find: /^@\//, replacement: `${resolve(root, "src")}/` },
  ];
  if (includeUtilityAlias) {
    aliases.unshift({ find: "@utils", replacement: resolve(root, "src/utils") });
  }
  return createServer({
    root,
    configFile: false,
    plugins,
    resolve: {
      alias: aliases,
    },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
}

async function main(): Promise<void> {
  const baselineDir = parseBaselineDir();
  const baselineSources = baselineDir ? await loadBaselineSources(baselineDir) : undefined;
  const currentServer = await createModuleServer();
  const baselineServer = baselineSources
    ? await createModuleServer([createBaselinePlugin(baselineSources)], false)
    : undefined;
  try {
    const currentUtils = <PlanUtils>(
      await currentServer.ssrLoadModule("/src/utils/cultivationPlan.ts")
    );
    const currentUserCalc = <UserCalc>await currentServer.ssrLoadModule("/src/utils/userCalc.ts");
    const data = <{ WikiMaterialData: Array<TGApp.App.Material.WikiItem> }>(
      await currentServer.ssrLoadModule("/src/data/index.ts")
    );
    const baselineUtils = baselineServer
      ? <PlanUtils>await baselineServer.ssrLoadModule("virtual:tg-cultivation-baseline-plan")
      : undefined;
    const baselineUserCalc = baselineServer
      ? <UserCalc>await baselineServer.ssrLoadModule(baselineUserCalcModuleId)
      : undefined;

    const rollback = createRollbackBundle();
    const rollbackScenarios = createRollbackScenarios(rollback);
    const randomGraph = createRandomGraphScenario();
    const planScenarios = [
      ...createWikiScenarios(data.WikiMaterialData),
      rollbackScenarios.plan,
      randomGraph.plan,
    ];
    const earlyExitScenarios = createEarlyExitCraftScenarios(rollback);
    const craftScenarios = [
      createLargeCraftScenario(data.WikiMaterialData),
      ...earlyExitScenarios,
      ...rollbackScenarios.craft,
      randomGraph.craft,
    ];

    assertCraftingCalculatorContract(currentUserCalc, rollback, earlyExitScenarios);

    for (const scenario of planScenarios) {
      const iterations = scenario.iterations ?? benchmarkIterations;
      const currentInput = preparePlanInput(scenario);
      const current = measure(() => runPlanScenario(currentUtils, currentInput), iterations);
      assertPlanInputUnchanged(scenario, currentInput);
      const baselineInput = baselineUtils ? preparePlanInput(scenario) : undefined;
      const baseline =
        baselineUtils && baselineInput
          ? measure(() => runPlanScenario(baselineUtils, baselineInput), iterations)
          : undefined;
      if (baselineInput) assertPlanInputUnchanged(scenario, baselineInput);
      if (baseline) comparePlanResults(`plan/${scenario.name}`, current, baseline);
      console.log(
        `[plan] ${scenario.name}: ${formatTiming(current, baseline)} (${planSummary(current.result)})`,
      );
    }

    for (const scenario of craftScenarios) {
      const iterations = scenario.iterations ?? benchmarkIterations;
      const currentInput = prepareCraftInput(scenario);
      const current = measure(() => runCraftScenario(currentUserCalc, currentInput), iterations);
      assertCraftInputUnchanged(scenario, currentInput);
      scenario.verify?.(current.result);
      const baselineInput = baselineUserCalc ? prepareCraftInput(scenario) : undefined;
      const baseline =
        baselineUserCalc && baselineInput
          ? measure(() => runCraftScenario(baselineUserCalc, baselineInput), iterations)
          : undefined;
      if (baseline !== undefined) {
        if (baselineInput === undefined) throw new Error("Baseline input was not prepared");
        assertCraftInputUnchanged(scenario, baselineInput);
        scenario.verify?.(baseline.result);
        compareCraftingResults(`craft/${scenario.name}`, current, baseline);
      }
      console.log(
        `[craft] ${scenario.name}: ${formatTiming(current, baseline)} (${craftSummary(current.result)})`,
      );
    }

    const batch = createManySmallCraftBatch();
    const calculator = createCraftingCalculator(currentUserCalc, batch.materials);
    const standardBatch = measure(
      () => batch.inputs.map((input) => runCraftScenario(currentUserCalc, input)),
      batch.iterations,
    );
    const preparedBatch = measure(
      () => batch.inputs.map((input) => runPreparedCraftScenario(calculator, input)),
      batch.iterations,
    );
    for (const [index, prepared] of preparedBatch.result.entries()) {
      compareCraftingAllocations(
        `craft/${batch.name}/${index}`,
        prepared,
        standardBatch.result[index],
      );
    }
    console.log(
      `[craft] ${batch.name}: prepared ${formatTiming(preparedBatch)}, wrapper ${formatTiming(standardBatch)} (${batch.inputs.length} allocations)`,
    );
    console.log(
      baselineDir
        ? `cultivation performance and baseline equivalence checks passed (${baselineDir})`
        : "cultivation performance checks passed",
    );
  } finally {
    await baselineServer?.close();
    await currentServer.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
}
