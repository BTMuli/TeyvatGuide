<!-- 颂愿数据概览 -->
<template>
  <div ref="gbrDvBoxRef" class="gbr-dv-container">
    <div ref="headerRef" class="gbr-dv-header">
      <div class="gbr-dvt-title">
      <span>{{ title }}</span>
      <span>{{ props.dataVal.length }}</span>
    </div>
    <div class="gbr-dvt-subtitle">
      <span v-show="props.dataVal.length === 0">暂无数据</span>
      <span v-show="props.dataVal.length !== 0">{{ startDate }} ~ {{ endDate }}</span>
    </div>
    <!-- 3星相关数据 -->
    <div class="gbr-mid-list">
      <div class="gbr-ml-title s3">★★★</div>
      <div class="gbr-ml-card">
        <span>已垫</span>
        <span>{{ reset3count - 1 }}</span>
      </div>
      <div class="gbr-ml-card">
        <span>平均</span>
        <span>{{ star3avg }}</span>
      </div>
      <div class="gbr-ml-card">
        <span>统计</span>
        <span>{{ star3List.length }}</span>
      </div>
    </div>
    <!-- 4星相关数据 -->
    <div class="gbr-mid-list">
      <div class="gbr-ml-title s4">★★★★</div>
      <div class="gbr-ml-card">
        <span>已垫</span>
        <span>{{ reset4count - 1 }}</span>
      </div>
      <div class="gbr-ml-card">
        <span>平均</span>
        <span>{{ star4avg }}</span>
      </div>
      <div class="gbr-ml-card">
        <span>统计</span>
        <span>{{ star4List.length }}</span>
      </div>
    </div>
    <!-- 5星相关数据 -->
    <div v-if="!isNormalPool" class="gbr-mid-list">
      <div class="gbr-ml-title s5">★★★★★</div>
      <div class="gbr-ml-card">
        <span>已垫</span>
        <span>{{ reset5count - 1 }}</span>
      </div>
      <div class="gbr-ml-card">
        <span>平均</span>
        <span>{{ star5avg }}</span>
      </div>
      <div class="gbr-ml-card">
        <span>统计</span>
        <span>{{ star5List.length }}</span>
      </div>
    </div>
    <!-- 进度条拼接 -->
    <div v-if="props.dataVal.length > 0" class="gbr-mid-progress">
      <div v-if="pg2 !== '0'" :style="{ width: pg2 }" :title="`2星占比:${pg2}`" class="s2" />
      <div v-if="pg3 !== '0'" :style="{ width: pg3 }" :title="`3星占比:${pg3}`" class="s3" />
      <div v-if="pg4 !== '0'" :style="{ width: pg4 }" :title="`4星占比:${pg4}`" class="s4" />
      <div v-if="pg5 !== '0'" :style="{ width: pg5 }" :title="`5星占比:${pg5}`" class="s5" />
    </div>
    </div>
    <!-- 这边放具体物品的列表 -->
    <div class="gbr-bottom">
      <v-tabs v-model="tab" density="compact">
        <v-tab v-if="!isNormalPool" value="5">5☆</v-tab>
        <v-tab value="4">4☆</v-tab>
        <v-tab value="3">3☆</v-tab>
      </v-tabs>
      <v-window v-model="tab" class="gbr-bottom-window">
        <v-window-item class="gbr-b-window-item" value="5">
          <v-virtual-scroll :item-height="48" :items="star5List">
            <template #default="{ item }">
              <GbrDataLine :count="item.count" :data="item.data" />
            </template>
          </v-virtual-scroll>
        </v-window-item>
        <v-window-item class="gbr-b-window-item" value="4">
          <v-virtual-scroll :item-height="48" :items="star4List">
            <template #default="{ item }">
              <GbrDataLine :count="item.count" :data="item.data" />
            </template>
          </v-virtual-scroll>
        </v-window-item>
        <v-window-item class="gbr-b-window-item" value="3">
          <v-virtual-scroll :item-height="48" :items="star3List">
            <template #default="{ item }">
              <GbrDataLine :count="item.count" :data="item.data" />
            </template>
          </v-virtual-scroll>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getCurrentWindow } from "@tauri-apps/api/window";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import GbrDataLine, { type GbrDataLineProps } from "./gbr-data-line.vue";

type GachaDataViewProps = {
  dataType: "normal" | "boy" | "girl";
  dataVal: Array<TGApp.Sqlite.GachaRecords.TableGachaB>;
};

const props = defineProps<GachaDataViewProps>();
const curWin = getCurrentWindow();
const isNormalPool = computed<boolean>(() => props.dataType === "normal");

// Template refs for dynamic height calculation
const gbrDvBoxEl = useTemplateRef<HTMLElement>("gbrDvBoxRef");
const headerEl = useTemplateRef<HTMLElement>("headerRef");

// Dynamic heights
const bottomHeight = ref<string>("auto");
const windowHeight = ref<string>("auto");

// data
const loading = ref<boolean>(true); // 是否加载完
const title = ref<string>(""); // 卡片标题
const startDate = ref<string>(""); // 最早的时间
const endDate = ref<string>(""); // 最晚的时间
const star5List = shallowRef<Array<GbrDataLineProps>>([]); // 5星物品数据
const star4List = shallowRef<Array<GbrDataLineProps>>([]); // 4星物品数据
const star3List = shallowRef<Array<GbrDataLineProps>>([]); // 3星物品数据
const reset5count = ref<number>(1); // 5星垫抽数量
const reset4count = ref<number>(1); // 4星垫抽数量
const reset3count = ref<number>(1); // 3星垫抽数量
const star2count = ref<number>(0); // 2星物品数量
const star5avg = ref<string>(""); // 5星平均抽数
const star4avg = ref<string>(""); // 4星平均抽数
const star3avg = ref<string>(""); // 3星平均抽数
const tab = ref<string>(isNormalPool.value ? "4" : "5"); // tab
const pg2 = computed<string>(() => getPg("2"));
const pg3 = computed<string>(() => getPg("3"));
const pg4 = computed<string>(() => getPg("4"));
const pg5 = computed<string>(() => getPg("5"));

// Calculate dynamic heights
function calculateHeights(): void {
  if (!gbrDvBoxEl.value || !headerEl.value) return;
  const containerHeight = gbrDvBoxEl.value.clientHeight;
  const headerHeight = headerEl.value.clientHeight;
  const padding = 20; // 8px padding top + 8px padding bottom + 4px magic
  const tabsHeight = 36; // v-tabs compact height
  const gap = 8; // gap between tabs and window
  const bottomHeightPx = containerHeight - headerHeight - padding;
  const windowHeightPx = bottomHeightPx - tabsHeight - gap;
  bottomHeight.value = `${bottomHeightPx}px`;
  windowHeight.value = `${windowHeightPx}px`;
}

onMounted(async () => {
  loadData();
  loading.value = false;
  await nextTick();
  calculateHeights();
});

watch(
  () => [props.dataVal, props.dataType],
  async () => {
    await nextTick();
    calculateHeights();
  },
);

curWin.onResized(async () => {
  await nextTick();
  calculateHeights();
});

function loadData(): void {
  title.value = getTitle();
  const tempData = props.dataVal;
  const temp5Data: Array<GbrDataLineProps> = [];
  const temp4Data: Array<GbrDataLineProps> = [];
  const temp3Data: Array<GbrDataLineProps> = [];
  
  // Create a map to store pity counts for each item by ID
  const pityMap = new Map<string, { count5: number; count4: number; count3: number }>();
  let currentReset5 = 1;
  let currentReset4 = 1;
  let currentReset3 = 1;
  
  // First pass: calculate pity counts using all pool data
  tempData
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((item) => {
      if (item.rank === "2") {
        currentReset3++;
        currentReset4++;
        currentReset5++;
      } else if (item.rank === "3") {
        currentReset4++;
        currentReset5++;
        pityMap.set(item.id, {
          count3: currentReset3,
          count4: currentReset4,
          count5: currentReset5,
        });
        currentReset3 = 1;
      } else if (item.rank === "4") {
        currentReset5++;
        pityMap.set(item.id, {
          count3: currentReset3,
          count4: currentReset4,
          count5: currentReset5,
        });
        currentReset4 = 1;
      } else if (item.rank === "5") {
        currentReset4++;
        pityMap.set(item.id, {
          count3: currentReset3,
          count4: currentReset4,
          count5: currentReset5,
        });
        currentReset5 = 1;
      }
    });
  
  // Store current reset counts for display
  reset5count.value = currentReset5;
  reset4count.value = currentReset4;
  reset3count.value = currentReset3;
  
  // Helper function to check if item should be displayed based on dataType
  function shouldDisplay(item: TGApp.Sqlite.GachaRecords.TableGachaB): boolean {
    if (props.dataType === "normal") return true;
    if (props.dataType === "boy") {
      return item.opGachaType === "20011" || item.opGachaType === "20012";
    }
    if (props.dataType === "girl") {
      return item.opGachaType === "20021" || item.opGachaType === "20022";
    }
    return false;
  }
  
  // Second pass: build display data, filtering by dataType for event pools
  tempData
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((item) => {
      // Only process items that should be displayed for this view
      if (!shouldDisplay(item)) return;
      
      // 处理时间
      if (startDate.value === "" || item.time < startDate.value) startDate.value = item.time;
      if (endDate.value === "" || item.time > endDate.value) endDate.value = item.time;
      
      const pityCounts = pityMap.get(item.id);
      if (item.rank === "2") {
        star2count.value++;
      } else if (item.rank === "3" && pityCounts) {
        temp3Data.push({ data: item, count: pityCounts.count3 });
      } else if (item.rank === "4" && pityCounts) {
        temp4Data.push({ data: item, count: pityCounts.count4 });
      } else if (item.rank === "5" && pityCounts) {
        temp5Data.push({ data: item, count: pityCounts.count5 });
      }
    });
  star5List.value = temp5Data.reverse();
  star4List.value = temp4Data.reverse();
  star3List.value = temp3Data.reverse();
  star5avg.value = getStar5Avg();
  star4avg.value = getStar4Avg();
  star3avg.value = getStar3Avg();
}

// 获取标题
function getTitle(): string {
  if (props.dataType === "normal") return "常驻颂愿";
  if (props.dataType === "boy") return "活动颂愿（男）";
  if (props.dataType === "girl") return "活动颂愿（女）";
  return "";
}

// 获取占比
function getPg(star: "5" | "4" | "3" | "2"): string {
  let progress: number;
  if (star === "5") {
    progress = (star5List.value.length * 100) / props.dataVal.length;
  } else if (star === "4") {
    progress = (star4List.value.length * 100) / props.dataVal.length;
  } else if (star === "3") {
    progress = (star3List.value.length * 100) / props.dataVal.length;
  } else {
    progress = (star2count.value * 100) / props.dataVal.length;
  }
  if (progress === 0) return "0";
  return `${progress.toFixed(2)}%`;
}

// 获取5星平均抽数
function getStar5Avg(): string {
  const resetList = star5List.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star5List.value.length).toFixed(2);
}

// 获取4星平均抽数
function getStar4Avg(): string {
  const resetList = star4List.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star4List.value.length).toFixed(2);
}

// 获取3星平均抽数
function getStar3Avg(): string {
  const resetList = star3List.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star3List.value.length).toFixed(2);
}

// 监听数据变化
watch(
  () => props.dataVal,
  async () => {
    star5List.value = [];
    star4List.value = [];
    reset5count.value = 1;
    reset4count.value = 1;
    star2count.value = 0;
    startDate.value = "";
    endDate.value = "";
    star5avg.value = "";
    star4avg.value = "";
    star3avg.value = "";
    tab.value = isNormalPool.value ? "4" : "5";
    loadData();
    await nextTick();
    calculateHeights();
  },
);
</script>
<style lang="css" scoped>
.gbr-dv-container {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
}

.gbr-dv-header {
  position: relative;
}

.gbr-dvt-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.gbr-dvt-subtitle {
  width: 100%;
  font-family: var(--font-text);
  font-size: 12px;
  opacity: 0.6;
}

.gbr-mid-list {
  display: grid;
  margin-top: 8px;
  margin-bottom: 8px;
  color: var(--box-text-7);
  column-gap: 12px;
  font-size: 14px;
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.gbr-ml-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);

  &.s3 {
    color: var(--tgc-od-blue);
  }

  &.s4 {
    color: var(--tgc-od-purple);
  }

  &.s5 {
    color: var(--tgc-od-orange);
  }
}

.gbr-ml-card {
  position: relative;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 0 8px;
  border-radius: 4px;
  background: var(--app-page-bg);
  column-gap: 4px;
}

.gbr-mid-progress {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 8px;
  align-items: center;
  justify-content: flex-start;
  border-radius: 4px;
  background: var(--box-bg-2);

  div {
    position: relative;
    height: 100%;
  }

  .s2 {
    background: var(--tgc-od-green);
  }

  .s3 {
    background: var(--tgc-od-blue);
  }

  .s4 {
    background: var(--tgc-od-purple);
  }

  .s5 {
    background: var(--tgc-od-orange);
  }
}

.gbr-bottom {
  position: relative;
  display: flex;
  width: 100%;
  height: v-bind(bottomHeight); /* stylelint-disable-line value-keyword-case */
  box-sizing: border-box;
  flex-direction: column;
  gap: 8px;
}

.gbr-bottom-window {
  position: relative;
  height: v-bind(windowHeight); /* stylelint-disable-line value-keyword-case */
  overflow-y: auto;
}

.gbr-b-window-item {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;
}

/* stylelint-disable selector-class-pattern */

:deep(.v-virtual-scroll__item + .v-virtual-scroll__item) {
  margin-top: 8px;
}

/* stylelint-enable selector-class-pattern */
</style>
