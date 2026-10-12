/**
 * 养成计划材料转换意图状态。
 * @since Beta v0.12.6
 */

import { defineStore } from "pinia";
import { ref } from "vue";

const CONVERSION_MEDIA_IDS = new Set<number>([104201, 113021]);
const PERSISTENCE_VERSION = 1;

type PersistedSourceLimit = {
  id: number;
  count: number;
};

type PersistedIntent = {
  materialId: number;
  count: number;
  sourceLimits: Array<PersistedSourceLimit>;
};

type PersistedEntryIntents = Record<string, Array<PersistedIntent>>;
type PersistedProjectIntents = Record<string, PersistedEntryIntents>;
type PersistedUidIntents = Record<string, PersistedProjectIntents>;

type PersistedEnvelope = {
  version: 1;
  intents: PersistedUidIntents;
};

function createRecord<T>(): Record<string, T> {
  return <Record<string, T>>Object.create(null);
}

function createEmptyEnvelope(): PersistedEnvelope {
  return {
    version: PERSISTENCE_VERSION,
    intents: createRecord<PersistedProjectIntents>(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0
  );
}

function normalizeSourceLimits(value: unknown): Array<PersistedSourceLimit> | undefined {
  if (!Array.isArray(value)) return undefined;
  const sourceLimits: Array<PersistedSourceLimit> = [];
  for (const sourceLimit of value) {
    if (!isRecord(sourceLimit)) continue;
    const id = sourceLimit["id"];
    const count = sourceLimit["count"];
    if (!isPositiveInteger(id) || !isNonNegativeInteger(count) || CONVERSION_MEDIA_IDS.has(id))
      continue;
    const existing = sourceLimits.findIndex((item) => item.id === id);
    const normalized = { id, count };
    if (existing === -1) sourceLimits.push(normalized);
    else sourceLimits[existing] = normalized;
  }
  return sourceLimits;
}

function normalizeIntent(value: unknown): PersistedIntent | undefined {
  if (!isRecord(value)) return undefined;
  const materialId = value["materialId"];
  const count = value["count"];
  const sourceLimits = normalizeSourceLimits(value["sourceLimits"]);
  if (!isPositiveInteger(materialId) || !isNonNegativeInteger(count) || sourceLimits === undefined)
    return undefined;
  return { materialId, count, sourceLimits };
}

function normalizeIntentArray(value: unknown): Array<PersistedIntent> {
  if (!Array.isArray(value)) return [];
  const intents: Array<PersistedIntent> = [];
  for (const item of value) {
    const intent = normalizeIntent(item);
    if (intent === undefined) continue;
    const existing = intents.findIndex((current) => current.materialId === intent.materialId);
    if (existing === -1) intents.push(intent);
    else intents[existing] = intent;
  }
  return intents;
}

function normalizePersistedState(value: unknown): PersistedEnvelope {
  if (!isRecord(value) || value["version"] !== PERSISTENCE_VERSION) {
    return createEmptyEnvelope();
  }
  const rawIntents = value["intents"];
  if (!isRecord(rawIntents)) return createEmptyEnvelope();

  const intents = createRecord<PersistedProjectIntents>();
  for (const [uidKey, rawProjects] of Object.entries(rawIntents)) {
    const uid = Number(uidKey);
    if (!isPositiveInteger(uid) || !isRecord(rawProjects)) continue;
    const projects = createRecord<PersistedEntryIntents>();
    for (const [projectId, rawEntries] of Object.entries(rawProjects)) {
      if (!isRecord(rawEntries)) continue;
      const entries = createRecord<Array<PersistedIntent>>();
      for (const [entryKey, rawEntryIntents] of Object.entries(rawEntries)) {
        const entryIntents = normalizeIntentArray(rawEntryIntents);
        if (entryIntents.length > 0) entries[entryKey] = entryIntents;
      }
      if (Object.keys(entries).length > 0) projects[projectId] = entries;
    }
    if (Object.keys(projects).length > 0) intents[String(uid)] = projects;
  }
  return { version: PERSISTENCE_VERSION, intents };
}

function cloneIntent(
  intent: TGApp.App.UserCalc.ConversionIntent,
): TGApp.App.UserCalc.ConversionIntent {
  return {
    materialId: intent.materialId,
    count: intent.count,
    sourceLimits: intent.sourceLimits.map((sourceLimit) => ({ ...sourceLimit })),
  };
}

function cloneIntents(
  intents: ReadonlyArray<TGApp.App.UserCalc.ConversionIntent>,
): Array<TGApp.App.UserCalc.ConversionIntent> {
  return intents.map((intent) => cloneIntent(intent));
}

function mergeIntents(
  existing: ReadonlyArray<PersistedIntent> | undefined,
  moved: ReadonlyArray<PersistedIntent>,
): Array<PersistedIntent> {
  const merged = cloneIntents(existing ?? []);
  for (const intent of moved) {
    const existingIndex = merged.findIndex((current) => current.materialId === intent.materialId);
    const cloned = cloneIntent(intent);
    if (existingIndex === -1) merged.push(cloned);
    else merged[existingIndex] = cloned;
  }
  return merged;
}

function isValidUid(uid: number): boolean {
  return isPositiveInteger(uid);
}

/**
 * 持久化养成计划中的材料转换手动意图。
 * @since Beta v0.12.6
 */
const useCultivationConversionStore = defineStore(
  "cultivationConversion",
  () => {
    const persisted = ref<PersistedEnvelope | null>(null);

    function ensurePersisted(): PersistedEnvelope {
      if (persisted.value === null || persisted.value.version !== PERSISTENCE_VERSION) {
        persisted.value = createEmptyEnvelope();
      }
      return persisted.value;
    }

    /**
     * 获取指定用户和项目的转换意图。
     * @since Beta v0.12.6
     * @param uid - 游戏用户 UID
     * @param projectId - 养成计划 ID，可为空
     * @returns 按养成目标键分组的转换意图
     */
    function getIntents(
      uid: number,
      projectId: string,
    ): Map<string, Array<TGApp.App.UserCalc.ConversionIntent>> {
      if (!isValidUid(uid) || typeof projectId !== "string") return new Map();
      const state = ensurePersisted();
      const projects = state.intents[String(uid)];
      const entries = projects?.[projectId];
      if (entries === undefined) return new Map();
      const result = new Map<string, Array<TGApp.App.UserCalc.ConversionIntent>>();
      for (const [entryKey, intents] of Object.entries(entries)) {
        result.set(entryKey, cloneIntents(intents));
      }
      return result;
    }

    /**
     * 写入指定目标的材料转换意图。
     * @since Beta v0.12.6
     * @param uid - 游戏用户 UID
     * @param projectId - 养成计划 ID，可为空
     * @param entryKey - 养成目标稳定键
     * @param intent - 材料转换意图
     */
    function setIntent(
      uid: number,
      projectId: string,
      entryKey: string,
      intent: TGApp.App.UserCalc.ConversionIntent,
    ): void {
      if (!isValidUid(uid) || typeof projectId !== "string" || typeof entryKey !== "string") return;
      const normalized = normalizeIntent(intent);
      if (normalized === undefined) return;
      const state = ensurePersisted();
      const uidKey = String(uid);
      const projects = state.intents[uidKey] ?? (state.intents[uidKey] = createRecord());
      const entries = projects[projectId] ?? (projects[projectId] = createRecord());
      const current = entries[entryKey] ?? [];
      const next = cloneIntents(current);
      const existing = next.findIndex((item) => item.materialId === normalized.materialId);
      const cloned = cloneIntent(normalized);
      if (existing === -1) next.push(cloned);
      else next[existing] = cloned;
      entries[entryKey] = next;
    }

    /**
     * 移除指定目标中的一个材料转换意图。
     * @since Beta v0.12.6
     * @param uid - 游戏用户 UID
     * @param projectId - 养成计划 ID，可为空
     * @param entryKey - 养成目标稳定键
     * @param materialId - 转换目标材料 ID
     */
    function removeIntent(
      uid: number,
      projectId: string,
      entryKey: string,
      materialId: number,
    ): void {
      if (
        !isValidUid(uid) ||
        typeof projectId !== "string" ||
        typeof entryKey !== "string" ||
        !isPositiveInteger(materialId)
      ) {
        return;
      }
      const state = ensurePersisted();
      const uidKey = String(uid);
      const projects = state.intents[uidKey];
      const entries = projects?.[projectId];
      const current = entries?.[entryKey];
      if (entries === undefined || current === undefined) return;
      const next = current
        .filter((intent) => intent.materialId !== materialId)
        .map((intent) => cloneIntent(intent));
      if (next.length === current.length) return;
      if (next.length > 0) entries[entryKey] = next;
      else delete entries[entryKey];
      if (Object.keys(entries).length === 0) delete projects[projectId];
      if (Object.keys(projects).length === 0) delete state.intents[uidKey];
    }

    /**
     * 清除指定目标的全部材料转换意图。
     * @since Beta v0.12.6
     * @param uid - 游戏用户 UID
     * @param projectId - 养成计划 ID，可为空
     * @param entryKey - 养成目标稳定键
     */
    function clearEntry(uid: number, projectId: string, entryKey: string): void {
      if (!isValidUid(uid) || typeof projectId !== "string" || typeof entryKey !== "string") return;
      const state = ensurePersisted();
      const uidKey = String(uid);
      const projects = state.intents[uidKey];
      const entries = projects?.[projectId];
      if (entries === undefined || !Object.prototype.hasOwnProperty.call(entries, entryKey)) return;
      delete entries[entryKey];
      if (Object.keys(entries).length === 0) delete projects[projectId];
      if (Object.keys(projects).length === 0) delete state.intents[uidKey];
    }

    /**
     * 清除指定项目的全部材料转换意图。
     * @since Beta v0.12.6
     * @param uid - 游戏用户 UID
     * @param projectId - 养成计划 ID，可为空
     */
    function clearProject(uid: number, projectId: string): void {
      if (!isValidUid(uid) || typeof projectId !== "string") return;
      const state = ensurePersisted();
      const uidKey = String(uid);
      const projects = state.intents[uidKey];
      if (projects === undefined || !Object.prototype.hasOwnProperty.call(projects, projectId))
        return;
      delete projects[projectId];
      if (Object.keys(projects).length === 0) delete state.intents[uidKey];
    }

    /**
     * 将指定目标从一个项目移动到另一个项目。
     * @since Beta v0.12.6
     * @param uid - 游戏用户 UID
     * @param fromProjectId - 源项目 ID，可为空
     * @param toProjectId - 目标项目 ID，可为空
     * @param entryKeys - 要移动的养成目标稳定键
     */
    function moveEntries(
      uid: number,
      fromProjectId: string,
      toProjectId: string,
      entryKeys: ReadonlyArray<string>,
    ): void {
      if (
        !isValidUid(uid) ||
        typeof fromProjectId !== "string" ||
        typeof toProjectId !== "string" ||
        fromProjectId === toProjectId ||
        !Array.isArray(entryKeys)
      ) {
        return;
      }
      const state = ensurePersisted();
      const uidKey = String(uid);
      const projects = state.intents[uidKey];
      const sourceEntries = projects?.[fromProjectId];
      if (sourceEntries === undefined) return;
      let destinationEntries: PersistedEntryIntents | undefined;
      let moved = false;
      for (const entryKey of entryKeys) {
        if (typeof entryKey !== "string") continue;
        const sourceIntents = sourceEntries[entryKey];
        if (sourceIntents === undefined) continue;
        destinationEntries ??= projects[toProjectId] ?? (projects[toProjectId] = createRecord());
        destinationEntries[entryKey] = mergeIntents(destinationEntries[entryKey], sourceIntents);
        delete sourceEntries[entryKey];
        moved = true;
      }
      if (!moved) return;
      if (Object.keys(sourceEntries).length === 0) delete projects[fromProjectId];
      if (Object.keys(projects).length === 0) delete state.intents[uidKey];
    }

    return {
      persisted,
      getIntents,
      setIntent,
      removeIntent,
      clearEntry,
      clearProject,
      moveEntries,
    };
  },
  {
    persist: {
      key: "cultivationConversions",
      afterHydrate: ({ store }) => {
        store.persisted = normalizePersistedState(store.persisted);
        store.$persist();
      },
    },
  },
);

export default useCultivationConversionStore;
