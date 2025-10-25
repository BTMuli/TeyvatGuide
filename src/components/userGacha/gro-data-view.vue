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
    <div class="gro-mid-list">
      <div class="gro-ml-item">
        <span>4☆已垫</span>
        <span>{{ reset4count - 1 }}</span>
      </div>
      <div class="gro-ml-item">
        <span>5☆已垫</span>
        <span>{{ reset5count - 1 }}</span>
      </div>
      <div class="gro-ml-item">
        <span>5☆平均</span>
        <span>{{ star5avg }}</span>
      </div>
    </div>
    <div class="gro-mid-list">
      <div class="gro-ml-item">
        <span>5☆统计</span>
        <span>{{ getTitle("5") }}</span>
      </div>
      <div class="gro-ml-item">
        <span>4☆统计</span>
        <span>{{ getTitle("4") }}</span>
      </div>
    </div>
    <!-- 这边放具体物品的列表 -->
    <div class="gro-bottom">
      <v-tabs v-model="tab" density="compact">
        <v-tab value="5">5☆</v-tab>
        <v-tab value="4">4☆</v-tab>
      </v-tabs>
      <v-window v-model="tab" class="gro-bottom-window">
        <v-window-item value="5" class="gro-b-window-item">
          <v-virtual-scroll :items="star5List" :item-height="48">
            <template #default="{ item }">
              <GroDataLine :data="item.data" :count="item.count" />
            </template>
          </v-virtual-scroll>
        </v-window-item>
        <v-window-item value="4" class="gro-b-window-item">
          <v-virtual-scroll :items="star4List" :item-height="48">
            <template #default="{ item }">
              <GroDataLine :data="item.data" :count="item.count" />
            </template>
          </v-virtual-scroll>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from "vue";

import GroDataLine, { type GroDataLineProps } from "./gro-data-line.vue";

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
const tab = ref<string>("5"); // tab

onMounted(() => {
  loadData();
  loading.value = false;
});

function loadData(): void {
  title.value = getTitle("top");
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
        temp4Data.push({ data: item, count: reset4count.value });
        reset4count.value = 1;
      } else if (item.rank === "5") {
        reset4count.value++;
        temp5Data.push({ data: item, count: reset5count.value });
        reset5count.value = 1;
      }
    });
  star5List.value = temp5Data.reverse();
  star4List.value = temp4Data.reverse();
  star5avg.value = getStar5Avg();
}

// 获取标题
function getTitle(type: "top" | "5" | "4" | "3"): string {
  if (type === "top") {
    if (props.dataType === "new") return "新手祈愿";
    if (props.dataType === "avatar") return "角色祈愿";
    if (props.dataType === "weapon") return "武器祈愿";
    if (props.dataType === "normal") return "常驻祈愿";
    if (props.dataType === "mix") return "集录祈愿";
    return "";
  }
  if (props.dataVal.length === 0) return "暂无数据";
  if (type === "5") {
    // 5星物品统计 00.00%
    return `${star5List.value.length} [${((star5List.value.length * 100) / props.dataVal.length)
      .toFixed(2)
      .padStart(5, "0")}%]`;
  }
  if (type === "4") {
    // 4星物品统计
    return `${star4List.value.length} [${((star4List.value.length * 100) / props.dataVal.length)
      .toFixed(2)
      .padStart(5, "0")}%]`;
  }
  // 3星物品统计
  return `${star3count.value} [${((star3count.value * 100) / props.dataVal.length)
    .toFixed(2)
    .padStart(5, "0")}%]`;
}

// 获取5星平均抽数
function getStar5Avg(): string {
  const resetList = star5List.value.map((item) => item.count);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star5List.value.length).toFixed(2);
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
  padding-top: 4px;
  padding-bottom: 4px;
  border-top: 1px solid var(--common-shadow-4);
  color: var(--box-text-7);
}

.gro-ml-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 14px;
}

.gro-bottom {
  position: relative;
  display: flex;
  width: 100%;
  height: calc(100% - 150px);
  box-sizing: border-box;
  flex-direction: column;
  gap: 8px;
}

.gro-bottom-window {
  position: relative;
  height: calc(100vh - 428px);
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
