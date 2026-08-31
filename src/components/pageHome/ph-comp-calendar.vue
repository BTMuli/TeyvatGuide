<!-- 首页今日素材组件 -->
<template>
  <THomeCard append title="今日素材 & 养成计划">
    <template #title-append>
      <v-switch v-model="showCalendar" class="tc-mode-switch" />
      <v-icon :title="showCalendar ? `今日素材 ${dateNow}` : '养成计划'">
        {{ showCalendar ? "mdi-calendar-today" : "mdi-clipboard-text-outline" }}
      </v-icon>
    </template>
    <template #default>
      <div v-show="showCalendar">
        <div class="tc-top">
          <div class="tc-btn-list">
            <v-btn
              v-for="text of btnText"
              :key="text.week"
              :class="{ selected: text.week === btnNow, today: text.week === weekNow }"
              class="tc-btn"
              rounded
              @click="switchDay(text.week)"
            >
              {{ text.text }}
            </v-btn>
          </div>
          <div class="tc-page-actions">
            <v-btn-toggle
              v-model="selectedType"
              color="var(--tgc-od-orange)"
              density="compact"
              mandatory
              rounded="lg"
              variant="outlined"
            >
              <v-btn prepend-icon="mdi-account-outline" value="character">角色</v-btn>
              <v-btn prepend-icon="mdi-sword" value="weapon">武器</v-btn>
            </v-btn-toggle>
            <v-pagination v-model="page" :length :total-visible="5" class="tc-page" size="small" />
          </div>
        </div>
        <div ref="contentRef" class="tc-content">
          <TCalendarBirth />
          <div :style="gridStyle" class="calendar-grid">
            <div
              v-for="item in renderItems"
              :key="item.id"
              :class="{ planned: isCultivationTarget(item) }"
              class="tc-calendar-item"
              :title="item.name"
            >
              <TItemBox :model-value="getBoxData(item)" @click="selectItem(item)" />
            </div>
          </div>
        </div>
      </div>
      <PhCompCultivation
        v-show="!showCalendar"
        @success="handleCultivationSuccess"
        @data-loaded="handleCultivationData"
        @target-click="selectCultivationEntry"
      />
    </template>
  </THomeCard>
  <ToCalendar
    v-if="selectedItem"
    v-model="showItem"
    :entries="selectedCultivationEntries"
    :entry-materials="cultivationEntryMaterials"
    :item="selectedItem"
    :plan-entries="cultivationEntries"
    :project="cultivationProject"
    src="素材日历"
  >
    <template #left>
      <v-btn
        aria-label="上一个素材"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一个素材"
        variant="flat"
        @click="switchCalendarItem(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一个素材"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一个素材"
        variant="flat"
        @click="switchCalendarItem(true)"
      />
    </template>
  </ToCalendar>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import useHomeStore from "@store/home.js";
import fmtUtil from "@utils/fmtUtil.js";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import TCalendarBirth from "./ph-calendar-birth.vue";
import ToCalendar from "./ph-calendar-overlay.vue";
import THomeCard from "./ph-comp-card.vue";
import PhCompCultivation from "./ph-comp-cultivation.vue";

import { AppCalendarData, WikiMaterialData } from "@/data/index.js";

type BtnItem = { week: 1 | 2 | 3 | 4 | 5 | 6 | 7; text: string };
type TCalendarEmits = { success: [] };
type CultivationNavigationItem = {
  entry: TGApp.Sqlite.Cultivation.EntryWithItems;
  item: TGApp.App.Calendar.Item;
};
const btnText: Array<BtnItem> = [
  { week: 7, text: "周日" },
  { week: 1, text: "周一" },
  { week: 2, text: "周二" },
  { week: 3, text: "周三" },
  { week: 4, text: "周四" },
  { week: 5, text: "周五" },
  { week: 6, text: "周六" },
];
const emits = defineEmits<TCalendarEmits>();
const ITEM_SIZE = 100;
const GAP_SIZE = 8;

const contentRef = useTemplateRef<HTMLDivElement>("contentRef");
const weekNow = ref<number>(0);
const btnNow = ref<number>(0);
const dateNow = ref<string>("");
const page = ref<number>(1);
const { showCalendar } = storeToRefs(useHomeStore());
const showItem = ref<boolean>(false);
const selectedType = ref<"character" | "weapon">("character");
const cultivationProject = shallowRef<TGApp.Sqlite.Cultivation.Project>();
const cultivationEntries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
const cultivationDisplayEntries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
const cultivationEntryMaterials = shallowRef<
  ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>
>(new Map());
const selectedCultivationEntries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
const gridCols = ref<number>(8);
let resizeObserver: ResizeObserver | null = null;
let calendarReady = false;
let cultivationReady = false;
let successEmitted = false;

const cultivationTargetKeys = computed<Set<string>>(
  () =>
    new Set(
      cultivationEntries.value
        .filter((entry) => entry.status === "active")
        .map((entry) => `${entry.type}:${entry.itemId}`),
    ),
);
const calendarTotal = computed<Array<TGApp.App.Calendar.Item>>(() =>
  AppCalendarData.filter(
    (i) => i.dropDays.includes(btnNow.value) && i.itemType === selectedType.value,
  ).sort((a, b) => Number(isCultivationTarget(b)) - Number(isCultivationTarget(a))),
);
const visible = computed<number>(() => gridCols.value * 2);
const length = computed<number>(() => Math.ceil(calendarTotal.value.length / visible.value) || 1);
const renderItems = computed<Array<TGApp.App.Calendar.Item>>(() => {
  const currentPage = Math.min(page.value, length.value);
  return calendarTotal.value.slice((currentPage - 1) * visible.value, currentPage * visible.value);
});
const selectedItem = shallowRef<TGApp.App.Calendar.Item>();
const selectedCultivationEntry = shallowRef<TGApp.Sqlite.Cultivation.EntryWithItems>();
const gridStyle = computed<Record<string, string>>(() => ({
  gridTemplateColumns: `repeat(${gridCols.value}, ${ITEM_SIZE}px)`,
}));
const activeCultivationItems = computed<Array<CultivationNavigationItem>>(() =>
  cultivationDisplayEntries.value
    .filter((entry) => entry.status === "active")
    .map((entry) => {
      const item = getCalendarItem(entry);
      return item ? { entry, item } : undefined;
    })
    .filter((item): item is CultivationNavigationItem => item !== undefined),
);
const switchItems = computed<Array<TGApp.App.Calendar.Item>>(() => {
  if (selectedCultivationEntry.value !== undefined) {
    return activeCultivationItems.value.map(({ item }) => item);
  }
  const current = selectedItem.value;
  if (current === undefined) return calendarTotal.value;
  if (calendarTotal.value.some((item) => item.id === current.id)) return calendarTotal.value;
  return AppCalendarData.filter((item) => item.itemType === current.itemType);
});

watch(visible, () => {
  page.value = 1;
});
watch(selectedType, () => {
  page.value = 1;
});

onMounted(() => {
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const week = btnText.find((item) => item.week === dayNow) ?? { text: "周日", week: 7 };
  dateNow.value = `${fmtUtil.dateTime(new Date().getTime()).split(" ")[0]} ${week.text}`;
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  calendarReady = true;
  emitSuccessWhenReady();

  if (contentRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const gridWidth = (width * 2) / 3;
        const cols = Math.floor((gridWidth + GAP_SIZE) / (ITEM_SIZE + GAP_SIZE));
        gridCols.value = Math.max(2, cols);
      }
    });
    resizeObserver.observe(contentRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

function switchDay(day: number): void {
  btnNow.value = day;
  page.value = 1;
}

function switchCalendarItem(isNext: boolean): void {
  const current = selectedItem.value;
  if (current === undefined) return;
  const selectedEntry = selectedCultivationEntry.value;
  const cultivationNavigation = selectedEntry !== undefined;
  const currentIndex = cultivationNavigation
    ? activeCultivationItems.value.findIndex(({ entry }) => entry.id === selectedEntry.id)
    : switchItems.value.findIndex((item) => item.id === current.id);
  if (currentIndex === -1) return;
  const nextIndex = currentIndex + (isNext ? 1 : -1);
  if (nextIndex < 0) {
    showSnackbar.warn("已经是第一个了");
    return;
  }
  if (nextIndex >= switchItems.value.length) {
    showSnackbar.warn("已经是最后一个了");
    return;
  }
  const nextCultivation = cultivationNavigation
    ? activeCultivationItems.value[nextIndex]
    : undefined;
  const nextItem = nextCultivation?.item ?? switchItems.value[nextIndex];
  if (nextItem === undefined) return;
  const entries = nextCultivation ? [nextCultivation.entry] : getCultivationEntries(nextItem);
  selectedItem.value = nextItem;
  selectedCultivationEntries.value = entries;
  selectedCultivationEntry.value = nextCultivation?.entry;
  syncCalendarPage(nextItem);
}

function syncCalendarPage(item: TGApp.App.Calendar.Item): void {
  const itemIndex = calendarTotal.value.findIndex((calendarItem) => calendarItem.id === item.id);
  if (itemIndex === -1) return;
  page.value = Math.min(Math.max(1, Math.floor(itemIndex / visible.value) + 1), length.value);
}

async function selectItem(item: TGApp.App.Calendar.Item): Promise<void> {
  const entries = isCultivationTarget(item) ? getCultivationEntries(item) : [];
  await openCalendarItem(item, entries);
}

async function selectCultivationEntry(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): Promise<void> {
  const itemType = entry.type === "avatar" ? "character" : "weapon";
  const item =
    AppCalendarData.find(
      (calendarItem) => calendarItem.itemType === itemType && calendarItem.id === entry.itemId,
    ) ?? getCalendarItem(entry);
  if (!item) return;
  await openCalendarItem(item, [entry], entry);
}

async function openCalendarItem(
  item: TGApp.App.Calendar.Item,
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>,
  cultivationEntry?: TGApp.Sqlite.Cultivation.EntryWithItems,
): Promise<void> {
  selectedItem.value = item;
  selectedCultivationEntries.value = entries;
  selectedCultivationEntry.value = cultivationEntry;
  await nextTick();
  showItem.value = true;
}

function handleCultivationSuccess(): void {
  cultivationReady = true;
  emitSuccessWhenReady();
}

function handleCultivationData(
  project: TGApp.Sqlite.Cultivation.Project | undefined,
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>,
  displayEntries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>,
  entryMaterials: ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>,
): void {
  cultivationProject.value = project;
  cultivationEntries.value = entries;
  cultivationDisplayEntries.value = displayEntries;
  cultivationEntryMaterials.value = entryMaterials;
}

function isCultivationTarget(item: TGApp.App.Calendar.Item): boolean {
  const entryType = item.itemType === "character" ? "avatar" : "weapon";
  return cultivationTargetKeys.value.has(`${entryType}:${item.id}`);
}

function getCultivationEntries(
  item: TGApp.App.Calendar.Item,
): Array<TGApp.Sqlite.Cultivation.EntryWithItems> {
  const entryType = item.itemType === "character" ? "avatar" : "weapon";
  return cultivationEntries.value.filter(
    (entry) => entry.status === "active" && entry.type === entryType && entry.itemId === item.id,
  );
}

function getCalendarItem(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): TGApp.App.Calendar.Item | undefined {
  const itemType = entry.type === "avatar" ? "character" : "weapon";
  const item = AppCalendarData.find(
    (calendarItem) => calendarItem.itemType === itemType && calendarItem.id === entry.itemId,
  );
  if (item) return item;
  if (entry.type !== "avatar") return undefined;
  if (entry.itemId !== 10000005 && entry.itemId !== 10000007) return undefined;
  const element = /[·](.+)$/.exec(entry.name)?.[1];
  const materials = entry.items
    .map((itemEntry) => WikiMaterialData.find((material) => material.id === itemEntry.materialId))
    .filter((material): material is TGApp.App.Material.WikiItem => material !== undefined)
    .map((material) => ({ id: material.id, name: material.name, star: material.star }));
  return {
    id: entry.itemId,
    contentId: 0,
    dropDays: [],
    name: entry.name,
    itemType,
    star: entry.star,
    weapon: "单手剑",
    element,
    materials,
    source: { index: 0, area: "", name: "养成计划" },
  };
}

function emitSuccessWhenReady(): void {
  if (successEmitted || !calendarReady || !cultivationReady) return;
  successEmitted = true;
  emits("success");
}

function getBoxData(item: TGApp.App.Calendar.Item): TItemBoxData {
  return {
    bg: `/icon/bg/${item.star}-Star.webp`,
    icon: `/WIKI/${item.itemType}/${item.id}.webp`,
    size: "100px",
    height: "100px",
    display: "inner",
    clickable: true,
    lt: item.element
      ? `/icon/element/${item.element}元素.webp`
      : `/icon/weapon/${item.weapon}.webp`,
    ltSize: "20px",
    innerHeight: 25,
    innerIcon: item.element ? `/icon/weapon/${item.weapon}.webp` : undefined,
    innerText: item.name,
    innerBlur: "4px",
    rt: isCultivationTarget(item) ? "⭐" : undefined,
    rtSize: isCultivationTarget(item) ? "20px" : undefined,
  };
}
</script>
<style lang="css" scoped>
.tc-top {
  display: grid;
  align-items: center;
  margin-bottom: 8px;
  font-family: var(--font-title);
  font-size: 20px;
  gap: 8px;
  grid-template-columns: 1fr 2fr;
}

.tc-page-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  :deep(.v-btn-group) {
    color: var(--common-text-title);
  }
}

.tc-mode-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.tc-btn-list {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tc-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);

  &.today {
    border: 1px solid var(--tgc-yellow-1);
  }

  &.selected {
    background-color: var(--tgc-yellow-1);
    color: var(--box-text-4);
  }

  &.today:not(.selected) {
    background-color: transparent;
    color: var(--tgc-yellow-1);
  }
}

.tc-content {
  position: relative;
  display: flex;
  height: 208px;
  align-items: center;
  justify-content: space-between;
  column-gap: 8px;
}

.calendar-grid {
  display: grid;
  height: 100%;
  flex: 1;
  gap: 8px;
  place-items: flex-start flex-start;
}

.tc-calendar-item {
  border-radius: 4px;

  &.planned {
    box-shadow: 0 0 8px var(--common-shadow-2);
    outline: 2px solid var(--tgc-od-orange);
  }
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
</style>
