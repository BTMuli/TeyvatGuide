<!-- 养成计划-目标列表 -->
<template>
  <div class="ucpt-box">
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
      :prevent-clicks="false"
      :prevent-clicks-propagation="false"
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
          @material="openMaterial"
          @move="moveEntry"
          @remove="emits('remove', $event)"
          @status="emitStatus"
        />
      </SwiperSlide>
    </Swiper>
  </div>
  <PboMaterial
    v-if="currentMaterial"
    v-model="materialOverlayVisible"
    :data="currentMaterial"
    :uid
    topOffset="132px"
  >
    <template #left>
      <v-btn
        :disabled="currentMaterialIndex === 0"
        aria-label="上一个养成材料"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一个养成材料"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        :disabled="currentMaterialIndex === planMaterials.length - 1"
        aria-label="下一个养成材料"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一个养成材料"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </PboMaterial>
</template>

<script lang="ts" setup>
import "swiper/css";
import "swiper/css/navigation";

import PboMaterial from "@comp/pageBag/pbo-material.vue";
import UcPlanTargetCard from "@comp/userCalc/uc-plan-target-card.vue";
import { getServerDay, isMaterialAvailableToday } from "@utils/cultivationPlan.js";
import { A11y, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { computed, nextTick, ref, shallowRef } from "vue";

import { WikiMaterialData } from "@/data/index.js";
import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type UcPlanTargetListProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  entryMaterials: ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>;
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  inventory: ReadonlyMap<number, number>;
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
const materialOverlayVisible = ref<boolean>(false);
const currentMaterial = shallowRef<MaterialInfo>();
const currentMaterialIndex = ref<number>(0);

const entryMaterialResults = computed<
  ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>
>(() => props.entryMaterials);

const sortedEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() =>
  [...props.entries].sort(compareEntries),
);
const planMaterials = computed<Array<MaterialInfo>>(() => {
  const materialIds = new Set<number>();
  for (const entry of sortedEntries.value) {
    for (const item of entry.items) materialIds.add(item.materialId);
  }
  return Array.from(materialIds)
    .map((materialId) => {
      const info = WikiMaterialData.find((material) => material.id === materialId);
      if (info === undefined) return undefined;
      return { info, tb: getBagMaterial(materialId) };
    })
    .filter((material): material is MaterialInfo => material !== undefined);
});

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
  const materialResultMap = new Map(
    (entryMaterialResults.value.get(entry.id) ?? []).map((material) => [material.id, material]),
  );
  return entry.items.some((item) => {
    const material = materialResultMap.get(item.materialId);
    return (
      material !== undefined &&
      material.missing > 0 &&
      isMaterialAvailableToday(item.materialId, serverDay, WikiMaterialData)
    );
  });
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
  return comparePersistentEntries(a, b);
}

function comparePersistentEntries(
  a: TGApp.Sqlite.Cultivation.EntryWithItems,
  b: TGApp.Sqlite.Cultivation.EntryWithItems,
): number {
  const sortOrderDiff = a.sortOrder - b.sortOrder;
  if (sortOrderDiff !== 0) return sortOrderDiff;
  const createdDiff = a.created.localeCompare(b.created);
  if (createdDiff !== 0) return createdDiff;
  return a.id.localeCompare(b.id);
}

function getActiveEntries(): Array<TGApp.Sqlite.Cultivation.EntryWithItems> {
  return props.entries.filter((entry) => entry.status === "active").sort(comparePersistentEntries);
}

function entryPriority(entry: TGApp.Sqlite.Cultivation.EntryWithItems): number {
  if (entry.status !== "active") return 0;
  return getActiveEntries().findIndex((item) => item.id === entry.id) + 1;
}

function canMoveEntry(entry: TGApp.Sqlite.Cultivation.EntryWithItems, offset: number): boolean {
  if (entry.status !== "active") return false;
  const entries = getActiveEntries();
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
  if (!entry || entry.status !== "active") return;
  const entries = getActiveEntries();
  const currentIndex = entries.findIndex((entry) => entry.id === entryId);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= entries.length) return;
  const [movedEntry] = entries.splice(currentIndex, 1);
  entries.splice(nextIndex, 0, movedEntry);
  let activeIndex = 0;
  emitOrder(
    [...props.entries]
      .sort(comparePersistentEntries)
      .map((item) => (item.status === "active" ? (entries[activeIndex++] ?? item) : item)),
  );
}

function emitStatus(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  status: TGApp.Sqlite.Cultivation.EntryStatus,
): void {
  emits("status", entry, status);
}

function getBagMaterial(materialId: number): TGApp.Sqlite.UserBag.MaterialTable {
  return (
    props.bagMaterials.get(materialId) ?? {
      count: props.inventory.get(materialId) ?? 0,
      id: materialId,
      records: [],
      uid: props.uid,
      updated: "",
    }
  );
}

async function openMaterial(materialId: number): Promise<void> {
  const index = planMaterials.value.findIndex((material) => material.info.id === materialId);
  if (index < 0) return;
  materialOverlayVisible.value = false;
  currentMaterialIndex.value = index;
  currentMaterial.value = planMaterials.value[index];
  await nextTick();
  if (currentMaterial.value?.info.id === materialId) materialOverlayVisible.value = true;
}

function switchMaterial(isNext: boolean): void {
  const nextIndex = currentMaterialIndex.value + (isNext ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= planMaterials.value.length) return;
  currentMaterialIndex.value = nextIndex;
  currentMaterial.value = planMaterials.value[nextIndex];
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

  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;

  :deep(.swiper-button-prev),
  :deep(.swiper-button-next) {
    z-index: 4;
    width: 40px;
    height: 40px;
    box-sizing: border-box;
    padding: 10px;
    border: 1px solid var(--common-shadow-2);
    border-radius: 8px;
    margin-top: -20px;
    background: var(--box-bg-1);
    box-shadow: 0 0 4px var(--common-shadow-4);
    color: var(--box-text-2);
    opacity: 1;

    &:hover {
      border-color: var(--common-shadow-2);
      background: var(--box-bg-2);
      transform: scale(1.06);
    }

    &:active {
      transform: scale(0.94);
    }

    &.swiper-button-disabled {
      opacity: 0.38;
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

.card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

@media (width <= 600px) {
  .ucpt-slide {
    width: calc(100vw - 96px);
  }
}
</style>
