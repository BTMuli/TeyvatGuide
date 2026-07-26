<!-- 养成计划-目标列表 -->
<template>
  <div class="ucpt-box">
    <div class="ucpt-header">
      <div>
        <span class="ucpt-title">{{ projectName || "养成目标" }}</span>
        <v-btn
          color="var(--tgc-od-red)"
          prepend-icon="mdi-plus"
          size="small"
          variant="tonal"
          @click="emits('add')"
        >
          添加目标
        </v-btn>
        <div aria-label="养成目标状态计数" class="ucpt-statuses">
          <span class="active">进行中 {{ activeCount }}</span>
          <span class="fulfilled">已满足 {{ fulfilledCount }}</span>
          <span class="completed">已完成 {{ completedCount }}</span>
        </div>
      </div>
    </div>

    <div v-if="entries.length === 0" class="ucpt-empty">
      <v-icon size="56">mdi-clipboard-text-outline</v-icon>
      <span>当前计划还没有养成目标</span>
      <v-btn color="var(--tgc-od-orange)" variant="tonal" @click="emits('add')">
        计算并添加第一个目标
      </v-btn>
    </div>

    <Swiper
      v-else
      :modules="swiperModules"
      :navigation="true"
      :slides-per-view="'auto'"
      :space-between="12"
      :watch-overflow="true"
      class="ucpt-swiper"
    >
      <SwiperSlide v-for="entry in sortedEntries" :key="entry.id" class="ucpt-slide">
        <UcPlanTargetCard
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
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script lang="ts" setup>
import "swiper/css";
import "swiper/css/navigation";

import UcPlanTargetCard from "@comp/userCalc/uc-plan-target-card.vue";
import {
  buildCultivationResults,
  getCalculateInventory,
  getServerDay,
  isMaterialAvailableToday,
} from "@utils/cultivationPlan.js";
import { A11y, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { computed } from "vue";

import { WikiMaterialData } from "@/data/index.js";

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
const swiperModules = [A11y, Navigation];

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
  [...props.entries].sort(compareEntries),
);

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

const activeCount = computed<number>(
  () =>
    props.entries.filter((entry) => entry.status === "active" && !isEntryFulfilled(entry)).length,
);
const fulfilledCount = computed<number>(
  () =>
    props.entries.filter((entry) => entry.status === "active" && isEntryFulfilled(entry)).length,
);
const completedCount = computed<number>(
  () => props.entries.filter((entry) => entry.status === "completed").length,
);

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

function compareEntries(
  a: TGApp.Sqlite.Cultivation.EntryWithItems,
  b: TGApp.Sqlite.Cultivation.EntryWithItems,
): number {
  const aRank = entrySortRank(a);
  const rankDiff = aRank - entrySortRank(b);
  if (rankDiff !== 0) return rankDiff;
  if (aRank === 0) {
    const availabilityDiff = Number(hasTodayMaterial(b)) - Number(hasTodayMaterial(a));
    if (availabilityDiff !== 0) return availabilityDiff;
  }
  return a.sortOrder - b.sortOrder;
}

function getPriorityEntries(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): Array<TGApp.Sqlite.Cultivation.EntryWithItems> {
  const rank = entrySortRank(entry);
  return props.entries
    .filter((item) => entrySortRank(item) === rank)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function entryPriority(entry: TGApp.Sqlite.Cultivation.EntryWithItems): number {
  return getPriorityEntries(entry).findIndex((item) => item.id === entry.id) + 1;
}

function canMoveEntry(entry: TGApp.Sqlite.Cultivation.EntryWithItems, offset: number): boolean {
  const entries = getPriorityEntries(entry);
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
  const entry = props.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const rank = entrySortRank(entry);
  const entries = getPriorityEntries(entry);
  const currentIndex = entries.findIndex((entry) => entry.id === entryId);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= entries.length) return;
  const [movedEntry] = entries.splice(currentIndex, 1);
  entries.splice(nextIndex, 0, movedEntry);
  let groupIndex = 0;
  emitOrder(
    [...props.entries]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => (entrySortRank(item) === rank ? (entries[groupIndex++] ?? item) : item)),
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
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
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

.ucpt-title {
  font-family: var(--font-title);
  font-size: 18px;
}

.ucpt-subtitle {
  color: var(--common-text-sub);
  font-size: 12px;
}

.ucpt-statuses {
  display: flex;
  align-items: center;
  font-size: 12px;
  gap: 8px;

  span {
    padding-left: 8px;
    border-left: 3px solid var(--common-shadow-2);
  }

  .active {
    border-left-color: var(--tgc-od-orange);
  }

  .fulfilled {
    border-left-color: var(--tgc-od-green);
  }

  .completed {
    color: var(--common-text-sub);
  }
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
}

.ucpt-swiper {
  --swiper-navigation-color: var(--tgc-od-orange);
  --swiper-navigation-size: 14px;

  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;

  :deep(.swiper-button-prev),
  :deep(.swiper-button-next) {
    z-index: 4;
    width: 32px;
    height: 32px;
    box-sizing: border-box;
    padding: 6px;
    border: 1px solid var(--common-shadow-2);
    border-radius: 999px;
    margin-top: -16px;
    background: color-mix(in srgb, var(--tgc-od-orange) 8%, var(--box-bg-1));
    box-shadow: 0 3px 10px var(--common-shadow-2);
    opacity: 0.9;
    transition:
      border-color 160ms ease,
      background-color 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease,
      transform 160ms ease;

    &:hover {
      border-color: var(--tgc-od-orange);
      background: color-mix(in srgb, var(--tgc-od-orange) 18%, var(--box-bg-1));
      box-shadow: 0 4px 14px var(--common-shadow-2);
      opacity: 1;
      transform: scale(1.06);
    }

    &:active {
      transform: scale(0.94);
    }

    &.swiper-button-disabled {
      opacity: 0.18;
    }
  }

  :deep(.swiper-button-prev) {
    left: 3px;
  }

  :deep(.swiper-button-next) {
    right: 3px;
  }
}

.ucpt-slide {
  width: min(420px, calc(100vw - 112px));
  height: 100%;
}

@media (width <= 600px) {
  .ucpt-header > div {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .ucpt-slide {
    width: calc(100vw - 96px);
  }
}
</style>
