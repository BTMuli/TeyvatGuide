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
            <v-pagination
              v-model="page"
              :length="length"
              :total-visible="5"
              class="tc-page"
              size="small"
            />
          </div>
        </div>
        <div ref="contentRef" class="tc-content">
          <TCalendarBirth />
          <div class="calendar-grid" :style="gridStyle">
            <div
              v-for="item in renderItems"
              :key="item.id"
              :class="{ planned: isCultivationTarget(item) }"
              class="tc-calendar-item"
            >
              <TItemBox :model-value="getBoxData(item)" @click="selectItem(item)" />
            </div>
          </div>
        </div>
      </div>
      <PhCompCultivation
        v-show="!showCalendar"
        @entries-loaded="handleCultivationEntries"
        @success="handleCultivationSuccess"
      />
    </template>
  </THomeCard>
  <ToCalendar v-model="showItem" :item="selectedItem" />
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { timestampToDate } from "@utils/toolFunc.js";
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

import TCalendarBirth from "./ph-calendar-birth.vue";
import ToCalendar from "./ph-calendar-overlay.vue";
import THomeCard from "./ph-comp-card.vue";
import PhCompCultivation from "./ph-comp-cultivation.vue";

import { AppCalendarData } from "@/data/index.js";

type BtnItem = { week: 1 | 2 | 3 | 4 | 5 | 6 | 7; text: string };
type TCalendarEmits = (e: "success") => void;
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

const contentRef = ref<HTMLDivElement | null>(null);
const weekNow = ref<number>(0);
const btnNow = ref<number>(0);
const dateNow = ref<string>("");
const page = ref<number>(1);
const showItem = ref<boolean>(false);
const showCalendar = ref<boolean>(true);
const selectedType = ref<"character" | "weapon">("character");
const cultivationEntries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
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
const selectedItem = shallowRef<TGApp.App.Calendar.Item>(renderItems.value[0]);
const gridStyle = computed<Record<string, string>>(() => ({
  gridTemplateColumns: `repeat(${gridCols.value}, ${ITEM_SIZE}px)`,
}));

watch(visible, () => {
  page.value = 1;
});
watch(selectedType, () => {
  page.value = 1;
});

onMounted(() => {
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const week = btnText.find((item) => item.week === dayNow) ?? { text: "周日", week: 7 };
  dateNow.value = `${timestampToDate(new Date().getTime()).split(" ")[0]} ${week.text}`;
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

function selectItem(item: TGApp.App.Calendar.Item): void {
  selectedItem.value = item;
  showItem.value = true;
}

function handleCultivationSuccess(): void {
  cultivationReady = true;
  emitSuccessWhenReady();
}

function handleCultivationEntries(entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>): void {
  cultivationEntries.value = entries;
}

function isCultivationTarget(item: TGApp.App.Calendar.Item): boolean {
  const entryType = item.itemType === "character" ? "avatar" : "weapon";
  return cultivationTargetKeys.value.has(`${entryType}:${item.id}`);
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
  border-radius: 6px;

  &.planned {
    box-shadow: 0 0 8px color-mix(in srgb, var(--tgc-od-orange) 45%, transparent);
    outline: 2px solid var(--tgc-od-orange);
  }
}
</style>
