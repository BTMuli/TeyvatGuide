/**
 * 验证转换设置保存、目标保存与汇总重算之间的数据同步。
 * @since Beta v0.12.6
 */

import {
  allocatePlanMaterials,
  getConversionOptions,
  getCultivationEntryKey,
} from "@utils/cultivationPlan.js";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { afterEach, describe, expect, it } from "vitest";
import { computed, createSSRApp, nextTick } from "vue";

import useCultivationConversionStore from "@/store/modules/cultivationConversion.js";

type MemoryStorage = {
  data: Map<string, string>;
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
};

type ConversionFixture = {
  uid: number;
  projectId: string;
  sourceId: number;
  targetId: number;
  dustId: number;
  materials: Array<TGApp.App.Material.WikiItem>;
  previewEntry: TGApp.Sqlite.Cultivation.EntryWithItems;
  entryKey: string;
  intent: TGApp.App.UserCalc.ConversionIntent;
  inventory: Map<number, number>;
};

const createdPinia: Array<ReturnType<typeof createPinia>> = [];

function createMemoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    storage: {
      getItem: (key: string): string | null => data.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        data.set(key, value);
      },
    },
  };
}

function createStore(
  storage: MemoryStorage["storage"],
): ReturnType<typeof useCultivationConversionStore> {
  const pinia = createPinia();
  pinia.use(createPersistedState({ storage, debug: false }));
  createSSRApp({}).use(pinia);
  setActivePinia(pinia);
  createdPinia.push(pinia);
  return useCultivationConversionStore(pinia);
}

function createFixture(): ConversionFixture {
  const uid = 100000001;
  const projectId = "saved-project";
  const sourceId = 88001;
  const targetId = 88002;
  const dustId = 104201;
  const materials: Array<TGApp.App.Material.WikiItem> = [sourceId, targetId, dustId].map((id) => ({
    id,
    name: `材料 ${id}`,
    description: "转换状态回归",
    type: "regression",
    cType: "regression",
    star: 3,
    source: [],
    convert:
      id === targetId
        ? [
            {
              id: "conversion",
              source: [sourceId, dustId].map((source) => ({
                id: String(source),
                name: String(source),
                type: "regression",
                star: 3,
                count: 1,
              })),
            },
          ]
        : [],
  }));
  const previewEntry: TGApp.Sqlite.Cultivation.EntryWithItems = {
    id: "preview-avatar",
    projectId: "",
    type: "avatar",
    itemId: 10000001,
    instanceKey: "",
    name: "回归角色",
    icon: "",
    star: 5,
    currentState: { level: 1, promoteLevel: 0, ascended: false, talents: [] },
    targetState: { level: 20, promoteLevel: 0, ascended: false, talents: [] },
    status: "active",
    sortOrder: 0,
    calculationMode: "bag",
    allowCrafting: false,
    useDust: false,
    useSolvent: false,
    created: "",
    updated: "",
    items: [{ entryId: "preview-avatar", materialId: targetId, required: 2 }],
  };
  const entryKey = getCultivationEntryKey(previewEntry);
  const intent: TGApp.App.UserCalc.ConversionIntent = {
    materialId: targetId,
    count: 2,
    sourceLimits: [{ id: sourceId, count: 2 }],
  };
  const inventory = new Map([
    [sourceId, 3],
    [dustId, 3],
  ]);
  return {
    uid,
    projectId,
    sourceId,
    targetId,
    dustId,
    materials,
    previewEntry,
    entryKey,
    intent,
    inventory,
  };
}

function createSavedEntry(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  projectId: string,
): TGApp.Sqlite.Cultivation.EntryWithItems {
  return {
    ...entry,
    id: "saved-database-id",
    projectId,
    items: entry.items.map((item) => ({ ...item, entryId: "saved-database-id" })),
  };
}

afterEach(() => {
  for (const pinia of createdPinia) disposePinia(pinia);
  createdPinia.length = 0;
  setActivePinia(undefined);
});

describe("养成计划材料转换状态", () => {
  it("写入转换意图后响应式重算编辑器分配", () => {
    const fixture = createFixture();
    const inventorySnapshot = new Map(fixture.inventory);
    const { storage } = createMemoryStorage();
    const store = createStore(storage);
    const editorAllocation = computed(() =>
      allocatePlanMaterials(
        [fixture.previewEntry],
        fixture.inventory,
        fixture.materials,
        store.getIntents(fixture.uid, ""),
      ),
    );

    expect(editorAllocation.value.materials[0]?.craftable).toBe(0);
    store.setIntent(fixture.uid, "", fixture.entryKey, fixture.intent);
    expect(editorAllocation.value.materials[0]?.craftable).toBe(2);
    expect(editorAllocation.value.materials[0]?.missing).toBe(0);
    expect(editorAllocation.value.materials[0]?.progress).toBe(100);
    expect(
      editorAllocation.value.materials[0]?.craftingCosts.find(
        (cost) => cost.id === fixture.sourceId,
      )?.count,
    ).toBe(2);
    expect(
      getConversionOptions(
        [fixture.previewEntry],
        editorAllocation.value,
        fixture.materials,
        new Set([fixture.previewEntry.id]),
      ),
    ).toHaveLength(1);
    expect(fixture.inventory).toStrictEqual(inventorySnapshot);
  });

  it("隔离用户和项目并保护返回意图副本，稳定键区分武器实例", () => {
    const fixture = createFixture();
    const { storage } = createMemoryStorage();
    const store = createStore(storage);
    store.setIntent(fixture.uid, "", fixture.entryKey, fixture.intent);

    const cloned = store.getIntents(fixture.uid, "");
    const clonedIntent = cloned.get(fixture.entryKey)?.[0];
    expect(clonedIntent).toBeDefined();
    if (clonedIntent === undefined) return;
    clonedIntent.count = 99;
    clonedIntent.sourceLimits[0].count = 99;

    expect(store.getIntents(fixture.uid, "").get(fixture.entryKey)).toStrictEqual([fixture.intent]);
    expect(store.getIntents(fixture.uid + 1, "").size).toBe(0);
    expect(store.getIntents(fixture.uid, "unrelated-project").size).toBe(0);
    expect(getCultivationEntryKey({ type: "weapon", itemId: 1, instanceKey: "guid-a" })).not.toBe(
      getCultivationEntryKey({ type: "weapon", itemId: 1, instanceKey: "guid-b" }),
    );
  });

  it("移动保存目标后通过稳定键保持编辑器和计划汇总一致", () => {
    const fixture = createFixture();
    const { storage } = createMemoryStorage();
    const store = createStore(storage);
    store.setIntent(fixture.uid, "", fixture.entryKey, fixture.intent);
    store.moveEntries(fixture.uid, "", fixture.projectId, [fixture.entryKey]);

    const savedEntry = createSavedEntry(fixture.previewEntry, fixture.projectId);
    expect(store.getIntents(fixture.uid, "").size).toBe(0);
    expect(getCultivationEntryKey(savedEntry)).toBe(fixture.entryKey);

    const summaryAllocation = computed(() =>
      allocatePlanMaterials(
        [savedEntry],
        fixture.inventory,
        fixture.materials,
        store.getIntents(fixture.uid, fixture.projectId),
      ),
    );
    expect(summaryAllocation.value.entries.get(savedEntry.id)?.[0]?.craftable).toBe(2);
    expect(summaryAllocation.value.materials[0]?.craftable).toBe(2);
    expect(
      summaryAllocation.value.materials[0]?.craftingCosts.find((cost) => cost.id === fixture.dustId)
        ?.count,
    ).toBe(2);
  });

  it("通过真实持久化插件写入并重新加载转换意图", async () => {
    const fixture = createFixture();
    const memory = createMemoryStorage();
    const store = createStore(memory.storage);
    store.setIntent(fixture.uid, fixture.projectId, fixture.entryKey, fixture.intent);
    await nextTick();
    store.$persist();

    const persistedJson = memory.data.get("cultivationConversions");
    expect(persistedJson).toBeDefined();
    expect(persistedJson ?? "").not.toContain("craftingCosts");
    const reloaded = createStore(memory.storage);
    expect(reloaded.getIntents(fixture.uid, fixture.projectId).get(fixture.entryKey)).toStrictEqual(
      [fixture.intent],
    );

    const savedEntry = createSavedEntry(fixture.previewEntry, fixture.projectId);
    const reloadedAllocation = allocatePlanMaterials(
      [savedEntry],
      fixture.inventory,
      fixture.materials,
      reloaded.getIntents(fixture.uid, fixture.projectId),
    );
    expect(reloadedAllocation.materials[0]?.craftable).toBe(2);
  });

  it("修改数量不累计旧消耗，支持显式禁用和清理", () => {
    const fixture = createFixture();
    const { storage } = createMemoryStorage();
    const store = createStore(storage);
    const savedEntry = createSavedEntry(fixture.previewEntry, fixture.projectId);
    store.setIntent(fixture.uid, fixture.projectId, fixture.entryKey, fixture.intent);

    const modified = allocatePlanMaterials(
      [savedEntry],
      fixture.inventory,
      fixture.materials,
      store.getIntents(fixture.uid, fixture.projectId),
    );
    expect(modified.materials[0]?.craftable).toBe(2);
    store.setIntent(fixture.uid, fixture.projectId, fixture.entryKey, {
      ...fixture.intent,
      count: 1,
    });
    const reduced = allocatePlanMaterials(
      [savedEntry],
      fixture.inventory,
      fixture.materials,
      store.getIntents(fixture.uid, fixture.projectId),
    );
    expect(reduced.materials[0]?.craftable).toBe(1);
    expect(reduced.remainingInventory.get(fixture.sourceId)).toBe(2);

    store.setIntent(fixture.uid, fixture.projectId, fixture.entryKey, {
      ...fixture.intent,
      count: 0,
    });
    expect(store.getIntents(fixture.uid, fixture.projectId).get(fixture.entryKey)?.[0]?.count).toBe(
      0,
    );
    store.removeIntent(fixture.uid, fixture.projectId, fixture.entryKey, fixture.targetId);
    expect(store.getIntents(fixture.uid, fixture.projectId).size).toBe(0);

    store.setIntent(fixture.uid, fixture.projectId, fixture.entryKey, fixture.intent);
    store.clearEntry(fixture.uid, fixture.projectId, fixture.entryKey);
    expect(store.getIntents(fixture.uid, fixture.projectId).size).toBe(0);
    store.setIntent(fixture.uid, fixture.projectId, fixture.entryKey, fixture.intent);
    store.clearProject(fixture.uid, fixture.projectId);
    expect(store.getIntents(fixture.uid, fixture.projectId).size).toBe(0);
  });

  it("清理不兼容和畸形持久化数据", () => {
    const fixture = createFixture();
    const memory = createMemoryStorage();
    memory.data.set(
      "cultivationConversions",
      JSON.stringify({ persisted: { version: 999, intents: {} } }),
    );
    const unsupported = createStore(memory.storage);
    expect(unsupported.getIntents(fixture.uid, fixture.projectId).size).toBe(0);

    memory.data.set(
      "cultivationConversions",
      JSON.stringify({
        persisted: {
          version: 1,
          intents: {
            [fixture.uid]: {
              [fixture.projectId]: {
                [fixture.entryKey]: [
                  { ...fixture.intent, count: -1 },
                  {
                    ...fixture.intent,
                    materialId: fixture.targetId + 1,
                    sourceLimits: [
                      { id: fixture.dustId, count: 2 },
                      { id: fixture.sourceId, count: 1 },
                    ],
                  },
                ],
              },
            },
          },
        },
      }),
    );
    const sanitized = createStore(memory.storage);
    const sanitizedIntents = sanitized
      .getIntents(fixture.uid, fixture.projectId)
      .get(fixture.entryKey);
    expect(sanitizedIntents).toHaveLength(1);
    expect(sanitizedIntents?.[0]?.sourceLimits).toStrictEqual([{ id: fixture.sourceId, count: 1 }]);
  });
});
