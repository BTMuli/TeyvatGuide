<!-- 祈愿数据概览 -->
<template>
  <div class="gro-dv-container">
    <div class="gro-dvt-title">
      <span>{{ title }}</span>
      <span>{{ props.dataVal.length }}</span>
    </div>
    <div class="gro-dvt-subtitle">
      <span v-show="props.dataVal.length === 0">暂无数据</span>
      <span v-show="props.dataVal.length !== 0">{{ startDate }} ~ {{ endDate }}</span>
    </div>
    <!-- 4星相关数据 -->
    <div :class="{ 'has-up': isUpPool }" class="gro-mid-list">
      <div class="gro-ml-title s4">★★★★</div>
      <div class="gro-ml-card">
        <span>垫</span>
        <span>{{ reset4count - 1 }}</span>
      </div>
      <div class="gro-ml-card">
        <span>均</span>
        <span>{{ star4avg }}</span>
      </div>
      <div v-if="star4UpAvg !== ''" class="gro-ml-card">
        <span>UP</span>
        <span>{{ star4UpAvg }}</span>
      </div>
      <div class="gro-ml-card">
        <span>总</span>
        <span>{{ star4List.length }}</span>
      </div>
    </div>
    <!-- 5星相关数据 -->
    <div :class="{ 'has-up': star5UpAvg !== '' }" class="gro-mid-list">
      <div class="gro-ml-title s5">★★★★★</div>
      <div class="gro-ml-card">
        <span>垫</span>
        <span>{{ reset5count - 1 }}</span>
      </div>
      <div class="gro-ml-card">
        <span>均</span>
        <span>{{ star5avg }}</span>
      </div>
      <div v-if="star5UpAvg !== ''" class="gro-ml-card">
        <span>UP</span>
        <span>{{ star5UpAvg }}</span>
      </div>
      <div class="gro-ml-card">
        <span>总</span>
        <span>{{ star5List.length }}</span>
      </div>
    </div>
    <!-- 进度条拼接 -->
    <div v-if="props.dataVal.length > 0" class="gro-mid-progress">
      <div v-if="pg3 !== '0'" :style="{ width: pg3 }" :title="`3星占比:${pg3}`" class="s3" />
      <div v-if="pg4 !== '0'" :style="{ width: pg4 }" :title="`4星占比:${pg4}`" class="s4" />
      <div v-if="pg5 !== '0'" :style="{ width: pg5 }" :title="`5星占比:${pg5}`" class="s5" />
    </div>
    <!-- 这边放具体物品的列表 -->
    <div class="gro-bottom">
      <v-tabs v-model="tab" density="compact">
        <v-tab value="5">5☆</v-tab>
        <v-tab value="4">4☆</v-tab>
      </v-tabs>
      <v-window v-model="tab" class="gro-bottom-window">
        <v-window-item class="gro-b-window-item" value="5">
          <v-virtual-scroll :item-height="48" :items="star5List">
            <template #default="{ item }">
              <GroDataLine
                :key="item.data.id"
                :count="item.count"
                :data="item.data"
                :is-up="item.isUp"
              />
            </template>
          </v-virtual-scroll>
        </v-window-item>
        <v-window-item class="gro-b-window-item" value="4">
          <v-virtual-scroll :item-height="48" :items="star4List">
            <template #default="{ item }">
              <GroDataLine
                :key="item.data.id"
                :count="item.count"
                :data="item.data"
                :is-up="item.isUp"
              />
            </template>
          </v-virtual-scroll>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import GroDataLine, { type GroDataLineProps } from "./gro-data-line.vue";

import { AppGachaData } from "@/data/index.js";

type GachaDataViewProps = {
  dataType: "new" | "avatar" | "weapon" | "normal" | "mix";
  dataVal: Array<TGApp.Sqlite.GachaRecords.TableGacha>;
};

const props = defineProps<GachaDataViewProps>();

// data
const loading = ref<boolean>(true); // 是否加载完
const title = ref<string>(""); // 卡片标题
const startDate = ref<string>(""); // 最早的时间
const endDate = ref<string>(""); // 最晚的时间
const star5List = shallowRef<Array<GroDataLineProps>>([]); // 5星物品数据
const star4List = shallowRef<Array<GroDataLineProps>>([]); // 4星物品数据
const reset5count = ref<number>(1); // 5星垫抽数量
const reset4count = ref<number>(1); // 4星垫抽数量
const star3count = ref<number>(0); // 3星物品数量
const star5avg = ref<string>(""); // 5星平均抽数
const star5UpAvg = ref<string>(""); // 5星UP平均抽数
const star4avg = ref<string>(""); // 4星平均抽数
const star4UpAvg = ref<string>(""); // 4星UP平均抽数
const tab = ref<string>("5"); // tab
const pg3 = computed<string>(() => getPg("3"));
const pg4 = computed<string>(() => getPg("4"));
const pg5 = computed<string>(() => getPg("5"));
const isUpPool = computed<boolean>(() => props.dataType !== "new" && props.dataType !== "normal");

onMounted(() => {
  loadData();
  loading.value = false;
});

function loadData(): void {
  title.value = getTitle();
  const tempData = props.dataVal;
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
  star5List.value = temp5Data.reverse();
  star4List.value = temp4Data.reverse();
  star5avg.value = getStar5Avg();
  star5UpAvg.value = getStar5UpAvg();
  star4avg.value = getStar4Avg();
  star4UpAvg.value = getStar4UpAvg();
}

// 获取标题
function getTitle(): string {
  if (props.dataType === "new") return "新手祈愿";
  if (props.dataType === "avatar") return "角色祈愿";
  if (props.dataType === "weapon") return "武器祈愿";
  if (props.dataType === "normal") return "常驻祈愿";
  if (props.dataType === "mix") return "集录祈愿";
  return "";
}

// 获取5星平均抽数
function getStar5Avg(): string {
  const resetList = star5List.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star5List.value.length).toFixed(2);
}

/**
 * 判断是否是Up物品
 * @param {TGApp.Sqlite.GachaRecords.TableGacha} item 原始数据
 * @returns {boolean|undefined}
 */
function checkIsUp(item: TGApp.Sqlite.GachaRecords.TableGacha): boolean | undefined {
  // 新手池和常驻池不存在UP概念
  if (item.gachaType === "100" || item.gachaType === "200") return undefined;
  const itemTime = new Date(item.time).getTime();
  const itemIdNum = Number(item.itemId);
  const poolsFind = AppGachaData.filter((pool) => {
    if (pool.type.toLocaleString() !== item.gachaType) return false;
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
  if (props.dataType === "new" || props.dataType === "normal") return "";
  const upList = star5List.value.filter((item) => item.isUp);
  if (upList.length === 0) return "0";
  const total = upList.reduce((a, b) => a + b.count, 0);
  return (total / upList.length).toFixed(2);
}

// 获取4星平均抽数
function getStar4Avg(): string {
  const resetList = star4List.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star4List.value.length).toFixed(2);
}

// 获取4星UP平均抽数
function getStar4UpAvg(): string {
  // 新手池和常驻池不显示UP平均
  if (props.dataType === "new" || props.dataType === "normal") return "";
  const upList = star4List.value.filter((item) => item.isUp);
  if (upList.length === 0) return "0";
  const total = upList.reduce((a, b) => a + b.count, 0);
  return (total / upList.length).toFixed(2);
}

// 获取占比
function getPg(star: "5" | "4" | "3"): string {
  let progress: number;
  if (star === "5") {
    progress = (star5List.value.length * 100) / props.dataVal.length;
  } else if (star === "4") {
    progress = (star4List.value.length * 100) / props.dataVal.length;
  } else {
    progress = (star3count.value * 100) / props.dataVal.length;
  }
  if (progress === 0) return "0";
  return `${progress.toFixed(2)}%`;
}

// 监听数据变化
watch(
  () => props.dataVal,
  () => {
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
    loadData();
  },
);
</script>
<style lang="css" scoped>
.gro-dv-container {
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
}

.gro-dvt-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.gro-dvt-subtitle {
  width: 100%;
  font-family: var(--font-text);
  font-size: 12px;
  opacity: 0.6;
}

.gro-mid-list {
  display: grid;
  margin-top: 4px;
  margin-bottom: 4px;
  color: var(--box-text-7);
  column-gap: 4px;
  font-size: 14px;
  grid-template-columns: 1fr 1fr 1fr 1fr;

  &.has-up {
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  }
}

.gro-ml-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);

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
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 0 8px;
  border-radius: 4px;
  background: var(--app-page-bg);
  column-gap: 4px;
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
  height: calc(100% - 120px);
  box-sizing: border-box;
  flex-direction: column;
  gap: 8px;
}

.gro-bottom-window {
  position: relative;
  height: calc(100vh - 380px);
  overflow-y: auto;
}

.gro-b-window-item {
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
