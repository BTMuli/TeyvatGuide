<!-- 祈愿数据概览 -->
<template>
  <div class="gro-dv-container">
    <div class="gro-dv-header">
      <div class="gro-dvt-title">
        <span class="gro-dvt-name">{{ title }}</span>
        <div v-if="dataType !== 'new'" class="gro-dvt-pity">
          <GroResetCard :count="reset5count - 1" :gacha="dataType" compute="5" />
          <GroResetCard :count="reset4count - 1" :gacha="dataType" compute="4" />
        </div>
        <span class="gro-dvt-count">{{ dataVal.length }}</span>
      </div>
      <div class="gro-dvt-subtitle">
        <span v-show="dataVal.length === 0">暂无数据</span>
        <span v-show="dataVal.length !== 0" :title="dateRangeLabel">{{ dateRangeLabel }}</span>
      </div>
      <!-- 4星相关数据 -->
      <div :class="{ 'has-up': isUpPool }" class="gro-mid-list">
        <div class="gro-ml-title s4">★★★★</div>
        <div class="gro-ml-card" title="平均抽数">
          <span class="gro-ml-value">{{ star4avg }}</span>
          <span class="gro-ml-badge">均</span>
        </div>
        <div v-if="star4UpAvg !== ''" class="gro-ml-card" :title="`UP 平均 ${star4UpAvg}`">
          <span class="gro-ml-value">{{ star4UpAvg }}</span>
          <span class="gro-ml-badge">UP</span>
        </div>
        <div class="gro-ml-card" title="四星总数">
          <span class="gro-ml-value">{{ star4CalcList.length }}</span>
          <span class="gro-ml-badge">总</span>
        </div>
      </div>
      <!-- 5星相关数据 -->
      <div :class="{ 'has-up': star5UpAvg !== '' }" class="gro-mid-list">
        <div class="gro-ml-title s5">★★★★★</div>
        <div class="gro-ml-card" title="平均抽数">
          <span class="gro-ml-value">{{ star5avg }}</span>
          <span class="gro-ml-badge">均</span>
        </div>
        <div v-if="star5UpAvg !== ''" class="gro-ml-card" :title="`UP 平均 ${star5UpAvg}`">
          <span class="gro-ml-value">{{ star5UpAvg }}</span>
          <span class="gro-ml-badge">UP</span>
        </div>
        <div class="gro-ml-card" title="五星总数">
          <span class="gro-ml-value">{{ star5CalcList.length }}</span>
          <span class="gro-ml-badge">总</span>
        </div>
      </div>
      <!-- 进度条拼接 -->
      <div v-if="dataVal.length > 0" class="gro-mid-progress">
        <div v-if="pg3 !== '0'" :style="{ width: pg3 }" class="s3" />
        <div v-if="pg4 !== '0'" :style="{ width: pg4 }" class="s4" />
        <div v-if="pg5 !== '0'" :style="{ width: pg5 }" class="s5" />
      </div>
    </div>
    <!-- 这边放具体物品的列表 -->
    <div class="gro-bottom">
      <v-tabs v-model="tab" density="compact">
        <v-tab value="5">5☆</v-tab>
        <v-tab value="4">4☆</v-tab>
      </v-tabs>
      <div ref="groWindowRef" class="gro-bottom-window">
        <v-virtual-scroll
          v-if="activeRecords.length !== 0"
          :key="virtualScrollKey"
          :item-height="virtualItemHeight"
          :items="recordRows"
          class="gro-record-scroll"
          height="100%"
          item-key="key"
        >
          <template #default="{ item }">
            <div
              :class="{ 'gro-record-row--grid': gridMode }"
              :style="gridRowStyle"
              class="gro-record-row"
            >
              <GroDataLine
                v-for="record in item.records"
                :key="record.data.id"
                :count="record.count"
                :data="record.data"
                :gridMode
                :is-up="record.isUp"
              />
            </div>
          </template>
        </v-virtual-scroll>
        <div v-else class="gro-record-empty">暂无数据</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { chunkGachaRecords, getGachaRecordColumns } from "@utils/gacha/recordGrid.js";
import { matchGachaDisplayScope } from "@utils/gacha/version.js";
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

import GroDataLine, { type GroDataLineProps } from "./gro-data-line.vue";
import GroResetCard from "./gro-reset-card.vue";

import { AppGachaData } from "@/data/index.js";

/**
 * 祈愿数据概览参数
 * @since Beta v0.13.0
 */
type GachaDataViewProps = {
  dataType: "new" | "avatar" | "weapon" | "normal" | "mix";
  dataVal: Array<TGApp.Sqlite.Gacha.Gacha>;
  gridMode?: boolean;
  versionFilter?: string | null;
  periodStart?: string;
  periodEnd?: string;
};

const {
  dataType,
  dataVal,
  gridMode = false,
  versionFilter = null,
  periodStart = "",
  periodEnd = "",
} = defineProps<GachaDataViewProps>();

/**
 * 虚拟滚动中的祈愿记录行
 * @since Beta v0.13.0
 */
type GachaRecordRow = {
  key: string;
  records: Array<GroDataLineProps>;
};

const groWindowEl = useTemplateRef<HTMLElement>("groWindowRef");
let windowResizeObserver: ResizeObserver | null = null;

// data
const title = ref<string>(""); // 卡片标题
const startDate = ref<string>(""); // 最早的时间
const endDate = ref<string>(""); // 最晚的时间
const star5CalcList = shallowRef<Array<GroDataLineProps>>([]); // 5星全量（计算用）
const star4CalcList = shallowRef<Array<GroDataLineProps>>([]); // 4星全量（计算用）
const star5List = shallowRef<Array<GroDataLineProps>>([]); // 5星物品数据（展示）
const star4List = shallowRef<Array<GroDataLineProps>>([]); // 4星物品数据（展示）
const reset5count = ref<number>(1); // 5星垫抽数量
const reset4count = ref<number>(1); // 4星垫抽数量
const star3count = ref<number>(0); // 3星物品数量
const star5avg = ref<string>(""); // 5星平均抽数
const star5UpAvg = ref<string>(""); // 5星UP平均抽数
const star4avg = ref<string>(""); // 4星平均抽数
const star4UpAvg = ref<string>(""); // 4星UP平均抽数
const tab = ref<string>("5"); // tab
const recordWindowWidth = ref<number>(0);
const viewRevision = ref<number>(0);
const pg3 = computed<string>(() => getPg("3"));
const pg4 = computed<string>(() => getPg("4"));
const pg5 = computed<string>(() => getPg("5"));
const isUpPool = computed<boolean>(() => dataType !== "new" && dataType !== "normal");
const dateRangeLabel = computed<string>(() => `${startDate.value} ~ ${endDate.value}`);
const displayPeriod = computed(() => ({ start: periodStart, end: periodEnd }));

const activeRecords = computed<Array<GroDataLineProps>>(() =>
  tab.value === "5" ? star5List.value : star4List.value,
);
const recordColumns = computed<number>(() =>
  gridMode ? getGachaRecordColumns(recordWindowWidth.value) : 1,
);
const recordRows = computed<Array<GachaRecordRow>>(() => {
  const rows = chunkGachaRecords(activeRecords.value, recordColumns.value);
  return rows.map((records) => ({
    key: records[0].data.id,
    records,
  }));
});
const virtualItemHeight = computed<number>(() => (gridMode ? 104 : 56));
const virtualScrollKey = computed<string>(
  () =>
    `${dataType}-${tab.value}-${gridMode ? "grid" : "list"}-${recordColumns.value}-${viewRevision.value}`,
);
const gridRowStyle = computed<Record<string, string>>(() => ({
  "--gro-record-columns": String(recordColumns.value),
}));

function updateRecordWindowWidth(): void {
  const windowElement = groWindowEl.value;
  if (!windowElement) return;
  const virtualScrollElement = windowElement.querySelector<HTMLElement>(".gro-record-scroll");
  const viewportWidth = virtualScrollElement?.clientWidth ?? 0;
  recordWindowWidth.value = viewportWidth > 0 ? viewportWidth : windowElement.clientWidth;
}

onMounted(async () => {
  loadData();
  await nextTick();
  updateRecordWindowWidth();
  if (typeof ResizeObserver === "undefined" || !groWindowEl.value) return;
  windowResizeObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === 0) {
      recordWindowWidth.value = 0;
      return;
    }
    updateRecordWindowWidth();
  });
  windowResizeObserver.observe(groWindowEl.value);
});
onUnmounted(() => {
  windowResizeObserver?.disconnect();
  windowResizeObserver = null;
});
// 监听数据变化
watch(
  () => dataVal,
  () => {
    resetViewState();
    loadData();
  },
);
watch(
  () => <const>[versionFilter, periodStart, periodEnd],
  () => {
    applyDisplayFilter();
  },
);
watch([tab, () => gridMode, viewRevision], async () => {
  await nextTick();
  updateRecordWindowWidth();
});

function resetViewState(): void {
  star5CalcList.value = [];
  star4CalcList.value = [];
  star5List.value = [];
  star4List.value = [];
  reset5count.value = 1;
  reset4count.value = 1;
  star3count.value = 1;
  startDate.value = "";
  endDate.value = "";
  star5avg.value = "";
  star5UpAvg.value = "";
  star4avg.value = "";
  star4UpAvg.value = "";
  tab.value = "5";
}

function loadData(): void {
  title.value = getTitle();
  const tempData = [...dataVal];
  const temp5Data: Array<GroDataLineProps> = [];
  const temp4Data: Array<GroDataLineProps> = [];
  // 按照 id 升序
  tempData
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((item) => {
      // 处理时间
      if (startDate.value === "" || item.time < startDate.value) startDate.value = item.time;
      if (endDate.value === "" || item.time > endDate.value) endDate.value = item.time;
      // 处理物品星级
      if (item.rank === "3") {
        reset4count.value++;
        reset5count.value++;
        star3count.value++;
      } else if (item.rank === "4") {
        reset5count.value++;
        temp4Data.push({ data: item, count: reset4count.value, isUp: checkIsUp(item) });
        reset4count.value = 1;
      } else if (item.rank === "5") {
        reset4count.value++;
        temp5Data.push({ data: item, count: reset5count.value, isUp: checkIsUp(item) });
        reset5count.value = 1;
      }
    });
  star5CalcList.value = temp5Data.reverse();
  star4CalcList.value = temp4Data.reverse();
  star5avg.value = getStar5Avg();
  star5UpAvg.value = getStar5UpAvg();
  star4avg.value = getStar4Avg();
  star4UpAvg.value = getStar4UpAvg();
  applyDisplayFilter();
}

function applyDisplayFilter(): void {
  star5List.value = star5CalcList.value.filter((item) =>
    matchGachaDisplayScope(item.data, versionFilter, displayPeriod.value),
  );
  star4List.value = star4CalcList.value.filter((item) =>
    matchGachaDisplayScope(item.data, versionFilter, displayPeriod.value),
  );
  viewRevision.value++;
}

// 获取标题
function getTitle(): string {
  if (dataType === "new") return "新手祈愿";
  if (dataType === "avatar") return "角色祈愿";
  if (dataType === "weapon") return "武器祈愿";
  if (dataType === "normal") return "常驻祈愿";
  if (dataType === "mix") return "集录祈愿";
  return "";
}

// 获取5星平均抽数
function getStar5Avg(): string {
  const resetList = star5CalcList.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star5CalcList.value.length).toFixed(2);
}

/**
 * 判断是否是Up物品
 * @param {TGApp.Sqlite.Gacha.Gacha} item 原始数据
 * @returns {boolean|undefined}
 */
function checkIsUp(item: TGApp.Sqlite.Gacha.Gacha): boolean | undefined {
  // 新手池和常驻池不存在UP概念
  if (item.gachaType === "100" || item.gachaType === "200") return undefined;
  const itemTime = new Date(fmtUtil.toTimeStr(item.time)).getTime();
  const itemIdNum = Number(item.itemId);
  const strictPool: Array<string> = [gameEnum.gachaType.WeaponUp, gameEnum.gachaType.MixUp];
  const avatarUpPool: Array<string> = [gameEnum.gachaType.AvatarUp, gameEnum.gachaType.AvatarUp2];
  const poolsFind = AppGachaData.filter((pool) => {
    // 对于武器池&集录池，严格要求 gachaType 对应，角色池放宽以修复特殊情况下的异常
    if (pool.type.toString() !== item.gachaType) {
      if (strictPool.includes(item.gachaType.toString())) return false;
      if (!avatarUpPool.includes(pool.type.toString())) return false;
    }
    const startTime = new Date(pool.from).getTime();
    const endTime = new Date(pool.to).getTime();
    return itemTime >= startTime && itemTime <= endTime;
  });
  if (poolsFind.length === 0) return undefined;
  if (item.rank === "5") {
    return poolsFind.some((pool) => pool.up5List.includes(itemIdNum));
  }
  if (item.rank === "4") {
    return poolsFind.some((pool) => pool.up4List.includes(itemIdNum));
  }
  return undefined;
}

// 获取5星UP平均抽数
function getStar5UpAvg(): string {
  // 新手池和常驻池不显示UP平均
  if (dataType === "new" || dataType === "normal") return "";
  const upList = star5CalcList.value.filter((item) => item.isUp === true);
  if (upList.length === 0) return "0";
  const total = star5CalcList.value.reduce((a, b) => a + b.count, 0);
  return (total / upList.length).toFixed(2);
}

// 获取4星平均抽数
function getStar4Avg(): string {
  const resetList = star4CalcList.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star4CalcList.value.length).toFixed(2);
}

// 获取4星UP平均抽数
function getStar4UpAvg(): string {
  // 新手池和常驻池不显示UP平均
  if (dataType === "new" || dataType === "normal") return "";
  const upList = star4CalcList.value.filter((item) => item.isUp === true);
  if (upList.length === 0) return "0";
  const total = star4CalcList.value.reduce((a, b) => a + b.count, 0);
  return (total / upList.length).toFixed(2);
}

// 获取占比
function getPg(star: "5" | "4" | "3"): string {
  let progress: number;
  // 开根号
  const sq5 = Math.sqrt(star5CalcList.value.length);
  const sq4 = Math.sqrt(star4CalcList.value.length);
  const sq3 = Math.sqrt(star3count.value);
  const total = sq5 + sq4 + sq3;
  if (star === "5") {
    progress = (sq5 * 100) / total;
  } else if (star === "4") {
    progress = (sq4 * 100) / total;
  } else {
    progress = (sq3 * 100) / total;
  }
  if (progress === 0) return "0";
  return `${progress.toFixed(2)}%`;
}
</script>
<style lang="scss" scoped>
.gro-dv-container {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
}

.gro-dv-header {
  position: relative;
  flex: 0 0 auto;
}

.gro-dvt-title {
  display: flex;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;

  .gro-dvt-name {
    flex-shrink: 0;
  }

  .gro-dvt-pity {
    display: grid;
    min-width: 0;
    flex: 1 1 auto;
    column-gap: 4px;
    grid-template-columns: 5fr 3fr;
  }

  .gro-dvt-count {
    flex-shrink: 0;
    margin-left: auto;
  }
}

.gro-dvt-subtitle {
  overflow: hidden;
  width: 100%;
  min-width: 0;
  font-family: var(--font-text);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gro-mid-list {
  display: grid;
  min-width: 0;
  margin-top: 4px;
  color: var(--box-text-7);
  column-gap: 4px;
  font-size: 12px;
  grid-template-columns: auto repeat(2, minmax(0, 1fr));

  &.has-up {
    grid-template-columns: auto repeat(3, minmax(0, 1fr));
  }
}

.gro-ml-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  font-family: var(--font-title);
  font-size: 11px;
  font-weight: normal;
  letter-spacing: 1px;
  white-space: nowrap;

  &.s4 {
    color: var(--tgc-od-purple);
  }

  &.s5 {
    color: var(--tgc-od-orange);
  }
}

.gro-ml-card {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--app-page-bg);

  &.reset {
    cursor: pointer;
  }
}

.gro-ml-value {
  overflow: hidden;
  max-width: 100%;
  color: var(--box-text-7);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gro-ml-badge {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 0;
  padding: 0 3px;
  border-radius: 4px 0;
  border-top: 1px solid var(--common-shadow-1);
  border-left: 1px solid var(--common-shadow-1);
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-size: 9px;
  line-height: 12px;
  pointer-events: none;
}

.gro-mid-progress {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 8px;
  align-items: center;
  justify-content: flex-start;
  border-radius: 4px;
  margin-top: 4px;
  background: var(--box-bg-2);

  div {
    position: relative;
    height: 100%;
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

.gro-bottom {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
}

.gro-bottom-window {
  position: relative;
  overflow: hidden;
  min-height: 0;
  flex: 1 1 auto;
}

.gro-bottom :deep(.v-tabs) {
  flex: 0 0 auto;
}

.gro-record-scroll {
  width: 100%;
  height: 100%;
  scrollbar-gutter: stable;
}

.gro-record-row {
  display: grid;
  width: 100%;
  height: 56px;
  box-sizing: border-box;
  padding-bottom: 8px;
  grid-template-columns: minmax(0, 1fr);
}

.gro-record-row--grid {
  height: 104px;
  column-gap: 8px;
  grid-template-columns: repeat(var(--gro-record-columns), minmax(0, 1fr));
}

.gro-record-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 14px;
  line-height: 20px;
}
</style>
