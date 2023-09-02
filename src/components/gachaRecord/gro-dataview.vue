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
        <span>{{ reset4count }}</span>
      </div>
      <div class="gro-ml-item">
        <span>5☆已垫</span>
        <span>{{ reset5count }}</span>
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
      <v-tabs v-model="tab">
        <v-tab value="5">5☆</v-tab>
        <v-tab value="4">4☆</v-tab>
      </v-tabs>
      <v-window v-model="tab">
        <v-window-item value="5" class="gro-b-window-item">
          <div v-for="(item, index) in star5List" :key="index" class="gro-bwi-item">
            <div class="gro-bwi-icon">
              <img :src="item.icon" alt="icon" />
            </div>
            <div class="gro-bwi-data" :title="item.time">
              <span>{{ item.name }}</span>
              <span>{{ item.gachaCount }}</span>
            </div>
          </div>
        </v-window-item>
        <v-window-item value="4" class="gro-b-window-item">
          <div v-for="(item, index) in star4List" :key="index" class="gro-bwi-item">
            <div class="gro-bwi-icon">
              <img :src="item.icon" alt="icon" />
            </div>
            <div class="gro-bwi-data" :title="item.time">
              <span>{{ item.name }}</span>
              <span>{{ item.gachaCount }}</span>
            </div>
          </div>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref, watch } from "vue";

interface GachaDataViewProps {
  dataType: "new" | "avatar" | "weapon" | "normal";
  dataVal: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaDataViewProps>();

// 单个祈愿物品
interface renderGachaItem extends TGApp.Sqlite.GachaRecords.SingleTable {
  // 第几抽出的
  gachaCount: number;
  // 图标
  icon: string;
}

// data
const loading = ref<boolean>(true); // 是否加载完
const title = ref<string>(""); // 卡片标题
const startDate = ref<string>(""); // 最早的时间
const endDate = ref<string>(""); // 最晚的时间
const star5List = ref<renderGachaItem[]>([]); // 5星物品数据
const star4List = ref<renderGachaItem[]>([]); // 4星物品数据
const reset5count = ref<number>(0); // 5星垫抽数量
const reset4count = ref<number>(0); // 4星垫抽数量
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
  // 按照 id 升序
  tempData
    .sort((a, b) => Number(a.id) - Number(b.id))
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
        star4List.value.push({
          ...item,
          gachaCount: reset4count.value,
          icon: getIcon(item.itemId, item.type),
        });
        reset4count.value = 0;
      } else if (item.rank === "5") {
        reset4count.value++;
        star5List.value.push({
          ...item,
          gachaCount: reset5count.value,
          icon: getIcon(item.itemId, item.type),
        });
        reset5count.value = 0;
      }
    });
  star5avg.value = getStar5Avg();
  // 两个列表反序
  star5List.value.reverse();
  star4List.value.reverse();
}

// 获取标题
function getTitle(type: "top" | "5" | "4" | "3"): string {
  if (type === "top") {
    if (props.dataType === "new") return "新手祈愿";
    if (props.dataType === "avatar") return "角色祈愿";
    if (props.dataType === "weapon") return "武器祈愿";
    if (props.dataType === "normal") return "常驻祈愿";
    return "";
  } else if (props.dataVal.length === 0) {
    return "暂无数据";
  } else if (type === "5") {
    // 5星物品统计 00.00%
    return `${star5List.value.length} [${((star5List.value.length * 100) / props.dataVal.length)
      .toFixed(2)
      .padStart(5, "0")}%]`;
  } else if (type === "4") {
    // 4星物品统计
    return `${star4List.value.length} [${((star4List.value.length * 100) / props.dataVal.length)
      .toFixed(2)
      .padStart(5, "0")}%]`;
  } else {
    // 3星物品统计
    return `${star3count.value} [${((star3count.value * 100) / props.dataVal.length)
      .toFixed(2)
      .padStart(5, "0")}%]`;
  }
}

// 获取5星平均抽数
function getStar5Avg(): string {
  const resetList = star5List.value.map((item) => item.gachaCount);
  if (resetList.length === 0) return "0";
  const total = resetList.reduce((a, b) => a + b);
  return (total / star5List.value.length).toFixed(2);
}

// 获取物品图标
function getIcon(itemId: string, type: string): string {
  if (type === "角色") {
    return "/WIKI/character/icon/" + itemId + ".webp";
  } else {
    return "/WIKI/weapon/icon/" + itemId + ".webp";
  }
}

// 监听数据变化
watch(
  () => props.dataVal,
  () => {
    star5List.value = [];
    star4List.value = [];
    reset5count.value = 0;
    reset4count.value = 0;
    star3count.value = 0;
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
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-2);
}

.gro-dvt-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.gro-dvt-subtitle {
  width: 100%;
  font-family: var(--font-text);
  font-size: 12px;
  opacity: 0.6;
}

.gro-mid-list {
  padding-top: 5px;
  padding-bottom: 5px;
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
  width: 100%;
}

.gro-b-window-item {
  display: flex;
  max-height: calc(100vh - 420px);
  flex-direction: column;
  margin-top: 10px;
  gap: 5px;
  overflow-y: auto;
}

.gro-bwi-item {
  display: flex;
  width: 100%;
  height: 30px;
  gap: 10px;
}

.gro-bwi-icon {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
}

.gro-bwi-icon img {
  width: 100%;
  height: 100%;
}

.gro-bwi-data {
  display: flex;
  width: calc(100% - 50px);
  height: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-radius: 5px;
  background: var(--box-bg-3);
}
</style>
