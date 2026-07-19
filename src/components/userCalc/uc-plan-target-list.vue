<!-- 养成计划-目标列表 -->
<template>
  <div class="ucpt-box">
    <div class="ucpt-header">
      <div>
        <span class="ucpt-title">{{ projectName || "养成目标" }}</span>
        <span class="ucpt-subtitle"
          >UID {{ uid }} · {{ activeCount }} 个进行中 · {{ completedCount }} 个已完成</span
        >
      </div>
      <div class="ucpt-header-actions">
        <v-text-field
          v-model="search"
          :hide-details="true"
          clearable
          density="compact"
          label="搜索目标或材料"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          width="230"
        />
        <v-btn
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-plus"
          size="small"
          variant="flat"
          @click="emits('add')"
        >
          添加目标
        </v-btn>
      </div>
    </div>

    <div v-if="entries.length === 0" class="ucpt-empty">
      <v-icon size="56">mdi-clipboard-text-outline</v-icon>
      <span>当前计划还没有养成目标</span>
      <v-btn color="var(--tgc-od-orange)" variant="tonal" @click="emits('add')">
        计算并添加第一个目标
      </v-btn>
    </div>

    <div v-else-if="filteredEntries.length > 0" class="ucpt-grid">
      <UcPlanTargetCard
        v-for="entry in filteredEntries"
        :key="entry.id"
        :can-move-down="canMoveEntry(entry, 1)"
        :can-move-up="canMoveEntry(entry, -1)"
        :entry
        :fulfilled="isEntryFulfilled(entry)"
        :has-today-material="hasTodayMaterial(entry)"
        :materials="entryMaterialResults.get(entry.id) ?? []"
        :priority="entryPriority(entry)"
        :progress="entryProgress(entry)"
        @edit="emits('edit', $event)"
        @move="moveEntry"
        @remove="emits('remove', $event)"
        @status="emitStatus"
      />
    </div>
    <div v-else class="ucpt-empty compact">
      <v-icon size="40">mdi-magnify-close</v-icon>
      <span>没有符合搜索条件的目标</span>
    </div>
    <div class="ucpt-footer">养成计划 · Render by TeyvatGuide</div>
  </div>
</template>

<script lang="ts" setup>
import UcPlanTargetCard from "@comp/userCalc/uc-plan-target-card.vue";
import { computed, ref } from "vue";

import { WikiMaterialData } from "@/data/index.js";
import {
  buildCultivationResults,
  getCalculateInventory,
  getServerDay,
  isMaterialAvailableToday,
} from "@utils/cultivationPlan.js";

type UcPlanTargetListProps = {
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  inventory: ReadonlyMap<number, number>;
  projectName: string;
  timezone: number;
  uid: number;
};

type UcPlanTargetListEmits = {
  add: [];
  edit: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  remove: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  reorder: [entryIds: Array<string>];
  status: [
    entry: TGApp.Sqlite.Cultivation.EntryWithItems,
    status: TGApp.Sqlite.Cultivation.EntryStatus,
  ];
};

const props = defineProps<UcPlanTargetListProps>();
const emits = defineEmits<UcPlanTargetListEmits>();
const search = ref<string>("");

const activeCount = computed<number>(
  () => props.entries.filter((entry) => entry.status === "active").length,
);
const completedCount = computed<number>(
  () => props.entries.filter((entry) => entry.status === "completed").length,
);
const entryMaterialResults = computed<Map<string, Array<TGApp.App.UserCalc.ResultMaterial>>>(
  () =>
    new Map(
      props.entries.map((entry) => [
        entry.id,
        buildCultivationResults(
          entry.items.map((item) => ({ id: item.materialId, count: item.required })),
          getEntryInventory(entry),
          WikiMaterialData,
          entry.allowCrafting,
          entry.useDust,
          entry.useSolvent,
        ),
      ]),
    ),
);

function getEntryInventory(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): ReadonlyMap<number, number> {
  if (entry.calculationMode !== "api" || !entry.apiResult) return props.inventory;
  return getCalculateInventory(entry.apiResult.result);
}
const sortedEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() =>
  [...props.entries].sort((a, b) => entrySortRank(a) - entrySortRank(b)),
);
const filteredEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() => {
  const keyword = search.value.trim().toLocaleLowerCase();
  if (keyword.length === 0) return sortedEntries.value;
  return sortedEntries.value.filter((entry) => {
    const materialNames = entry.items.map((item) => materialName(item.materialId)).join(" ");
    return `${entry.name} ${entryTypeLabel(entry.type)} ${materialNames}`
      .toLocaleLowerCase()
      .includes(keyword);
  });
});

function entryTypeLabel(type: TGApp.Sqlite.Cultivation.EntryType): string {
  return type === "avatar" ? "角色" : "武器";
}

function entryProgress(entry: TGApp.Sqlite.Cultivation.EntryWithItems): number {
  if (entry.status === "completed") return 100;
  if (entry.items.length === 0) return 100;
  const materialResultMap = new Map(
    (entryMaterialResults.value.get(entry.id) ?? []).map((material) => [material.id, material]),
  );
  const progress = entry.items.reduce((total, item) => {
    const material = materialResultMap.get(item.materialId);
    if (!material || material.required <= 0) return total;
    const available = material.owned + material.craftable;
    const ratio = Math.min(available / material.required, 1);
    return total + ratio;
  }, 0);
  return Math.min((progress / entry.items.length) * 100, 100);
}

function isEntryFulfilled(entry: TGApp.Sqlite.Cultivation.EntryWithItems): boolean {
  return entry.status === "completed" || entryProgress(entry) >= 100;
}

function entrySortRank(entry: TGApp.Sqlite.Cultivation.EntryWithItems): number {
  if (entry.status === "completed") return 2;
  return isEntryFulfilled(entry) ? 1 : 0;
}

function hasTodayMaterial(entry: TGApp.Sqlite.Cultivation.EntryWithItems): boolean {
  const serverDay = getServerDay(props.timezone);
  return entry.items.some((item) =>
    isMaterialAvailableToday(item.materialId, serverDay, WikiMaterialData),
  );
}

function materialName(materialId: number): string {
  return (
    WikiMaterialData.find((material) => material.id === materialId)?.name ?? `材料 ${materialId}`
  );
}

function entryPriority(entry: TGApp.Sqlite.Cultivation.EntryWithItems): number {
  return (
    sortedEntries.value
      .filter((item) => entrySortRank(item) === entrySortRank(entry))
      .findIndex((item) => item.id === entry.id) + 1
  );
}

function canMoveEntry(entry: TGApp.Sqlite.Cultivation.EntryWithItems, offset: number): boolean {
  const entries = sortedEntries.value.filter(
    (item) => entrySortRank(item) === entrySortRank(entry),
  );
  const currentIndex = entries.findIndex((item) => item.id === entry.id);
  const nextIndex = currentIndex + offset;
  return currentIndex >= 0 && nextIndex >= 0 && nextIndex < entries.length;
}

function emitOrder(entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>): void {
  emits(
    "reorder",
    entries.map((entry) => entry.id),
  );
}

function moveEntry(entryId: string, offset: number): void {
  const entry = sortedEntries.value.find((item) => item.id === entryId);
  if (!entry) return;
  const rank = entrySortRank(entry);
  const entries = sortedEntries.value.filter((item) => entrySortRank(item) === rank);
  const currentIndex = entries.findIndex((entry) => entry.id === entryId);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= entries.length) return;
  const [movedEntry] = entries.splice(currentIndex, 1);
  entries.splice(nextIndex, 0, movedEntry);
  let groupIndex = 0;
  emitOrder(
    sortedEntries.value.map((item) =>
      entrySortRank(item) === rank ? (entries[groupIndex++] ?? item) : item,
    ),
  );
}

function emitStatus(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  status: TGApp.Sqlite.Cultivation.EntryStatus,
): void {
  emits("status", entry, status);
}
</script>

<style lang="scss" scoped>
.ucpt-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ucpt-header,
.ucpt-header > div {
  display: flex;
  align-items: center;
}

.ucpt-header {
  justify-content: space-between;
  gap: 12px;
}

.ucpt-header > div {
  gap: 8px;
}

.ucpt-header-actions {
  justify-content: flex-end;
  color: var(--box-text-1);
}

.ucpt-title {
  font-family: var(--font-title);
  font-size: 18px;
}

.ucpt-subtitle {
  color: var(--common-text-sub);
  font-size: 12px;
}

.ucpt-empty {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 8px;
  color: var(--common-text-sub);
  gap: 12px;

  &.compact {
    min-height: 160px;
  }
}

.ucpt-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}

.ucpt-footer {
  position: relative;
  z-index: -1;
  color: var(--common-text-sub);
  font-size: 12px;
  text-align: right;
}

@media (width <= 600px) {
  .ucpt-grid {
    grid-template-columns: 1fr;
  }

  .ucpt-header > div {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .ucpt-header-actions {
    width: 100%;
    flex-direction: row;
    align-items: center;

    :deep(.v-input) {
      flex: 1;
    }
  }
}
</style>
