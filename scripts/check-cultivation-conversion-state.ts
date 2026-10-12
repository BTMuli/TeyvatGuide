/**
 * 验证转换设置保存、目标保存与汇总重算之间的数据同步。
 * @since Beta v0.12.6
 */

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPinia, setActivePinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { createServer } from "vite";
import { computed, createSSRApp, nextTick } from "vue";

type PlanUtils = typeof import("../src/utils/cultivationPlan.js");
type ConversionStoreModule = typeof import("../src/store/modules/cultivationConversion.js");

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

try {
  const utils = <PlanUtils>await server.ssrLoadModule("/src/utils/cultivationPlan.ts");
  const { default: useConversionStore } = <ConversionStoreModule>(
    await server.ssrLoadModule("/src/store/modules/cultivationConversion.ts")
  );
  const storageData = new Map<string, string>();
  const storage = {
    getItem: (key: string): string | null => storageData.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storageData.set(key, value);
    },
  };
  const makeStore = (): ReturnType<typeof useConversionStore> => {
    const pinia = createPinia();
    pinia.use(createPersistedState({ storage, debug: true }));
    createSSRApp({}).use(pinia);
    setActivePinia(pinia);
    return useConversionStore(pinia);
  };
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
  const entryKey = utils.getCultivationEntryKey(previewEntry);
  const intent: TGApp.App.UserCalc.ConversionIntent = {
    materialId: targetId,
    count: 2,
    sourceLimits: [{ id: sourceId, count: 2 }],
  };
  const inventory = new Map([
    [sourceId, 3],
    [dustId, 3],
  ]);
  const store = makeStore();
  const editorAllocation = computed(() =>
    utils.allocatePlanMaterials([previewEntry], inventory, materials, store.getIntents(uid, "")),
  );
  assert.equal(editorAllocation.value.materials[0]?.craftable, 0);
  store.setIntent(uid, "", entryKey, intent);
  assert.equal(editorAllocation.value.materials[0]?.craftable, 2);
  assert.equal(editorAllocation.value.materials[0]?.missing, 0);
  assert.equal(editorAllocation.value.materials[0]?.progress, 100);
  assert.equal(
    editorAllocation.value.materials[0]?.craftingCosts.find((cost) => cost.id === sourceId)?.count,
    2,
  );
  assert.equal(
    utils.getConversionOptions(
      [previewEntry],
      editorAllocation.value,
      materials,
      new Set([previewEntry.id]),
    ).length,
    1,
  );

  // 返回的副本、其他账号、其他计划及武器实例不能改动当前目标的设置。
  const cloned = store.getIntents(uid, "");
  const clonedIntent = cloned.get(entryKey)?.[0];
  assert.ok(clonedIntent);
  clonedIntent.count = 99;
  clonedIntent.sourceLimits[0].count = 99;
  assert.equal(store.getIntents(uid, "").get(entryKey)?.[0]?.count, 2);
  assert.equal(store.getIntents(uid + 1, "").size, 0);
  assert.equal(store.getIntents(uid, "unrelated-project").size, 0);
  assert.notEqual(
    utils.getCultivationEntryKey({ type: "weapon", itemId: 1, instanceKey: "guid-a" }),
    utils.getCultivationEntryKey({ type: "weapon", itemId: 1, instanceKey: "guid-b" }),
  );

  // 保存新目标会改变数据库 ID；稳定键使编辑器、总计划和首页得到相同结果。
  store.moveEntries(uid, "", projectId, [entryKey]);
  const savedEntry = {
    ...previewEntry,
    id: "saved-database-id",
    projectId,
    items: previewEntry.items.map((item) => ({ ...item, entryId: "saved-database-id" })),
  };
  assert.equal(store.getIntents(uid, "").size, 0);
  assert.equal(utils.getCultivationEntryKey(savedEntry), entryKey);
  const summaryAllocation = computed(() =>
    utils.allocatePlanMaterials(
      [savedEntry],
      inventory,
      materials,
      store.getIntents(uid, projectId),
    ),
  );
  assert.equal(summaryAllocation.value.entries.get(savedEntry.id)?.[0]?.craftable, 2);
  assert.equal(summaryAllocation.value.materials[0]?.craftable, 2);
  assert.equal(
    summaryAllocation.value.materials[0]?.craftingCosts.find((cost) => cost.id === dustId)?.count,
    2,
  );

  // 真实持久化插件写入 JSON，重新创建状态后仍能重算采用结果。
  await nextTick();
  store.$persist();
  const persistedJson = storageData.get("cultivationConversions");
  assert.ok(persistedJson);
  assert.ok(!persistedJson.includes("craftingCosts"));
  const reloaded = makeStore();
  assert.deepEqual(reloaded.getIntents(uid, projectId).get(entryKey), [intent]);
  const reloadedAllocation = utils.allocatePlanMaterials(
    [savedEntry],
    inventory,
    materials,
    reloaded.getIntents(uid, projectId),
  );
  assert.equal(reloadedAllocation.materials[0]?.craftable, 2);

  // 再次修改不累计旧消耗；显式关闭保留设置，恢复自动则清除设置。
  reloaded.setIntent(uid, projectId, entryKey, { ...intent, count: 1 });
  const modified = utils.allocatePlanMaterials(
    [savedEntry],
    inventory,
    materials,
    reloaded.getIntents(uid, projectId),
  );
  assert.equal(modified.materials[0]?.craftable, 1);
  assert.equal(modified.remainingInventory.get(sourceId), 2);
  reloaded.setIntent(uid, projectId, entryKey, { ...intent, count: 0 });
  assert.equal(reloaded.getIntents(uid, projectId).get(entryKey)?.[0]?.count, 0);
  reloaded.removeIntent(uid, projectId, entryKey, targetId);
  assert.equal(reloaded.getIntents(uid, projectId).size, 0);

  // 不兼容或畸形持久化数据不会进入分配器。
  storageData.set(
    "cultivationConversions",
    JSON.stringify({ persisted: { version: 999, intents: {} } }),
  );
  const unsupported = makeStore();
  assert.equal(unsupported.getIntents(uid, projectId).size, 0);
  storageData.set(
    "cultivationConversions",
    JSON.stringify({
      persisted: {
        version: 1,
        intents: {
          [uid]: {
            [projectId]: {
              [entryKey]: [
                { ...intent, count: -1 },
                {
                  ...intent,
                  materialId: targetId + 1,
                  sourceLimits: [
                    { id: dustId, count: 2 },
                    { id: sourceId, count: 1 },
                  ],
                },
              ],
            },
          },
        },
      },
    }),
  );
  const sanitized = makeStore();
  const sanitizedIntents = sanitized.getIntents(uid, projectId).get(entryKey);
  assert.equal(sanitizedIntents?.length, 1);
  assert.deepEqual(sanitizedIntents?.[0]?.sourceLimits, [{ id: sourceId, count: 1 }]);
  sanitized.clearEntry(uid, projectId, entryKey);
  assert.equal(sanitized.getIntents(uid, projectId).size, 0);
  sanitized.setIntent(uid, projectId, entryKey, intent);
  sanitized.clearProject(uid, projectId);
  assert.equal(sanitized.getIntents(uid, projectId).size, 0);
  assert.deepEqual(
    inventory,
    new Map([
      [sourceId, 3],
      [dustId, 3],
    ]),
  );
  console.log("cultivation conversion state checks passed");
} finally {
  await server.close();
}
