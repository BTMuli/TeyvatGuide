<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSubtitle" />
  <div class="home-container">
    <component :is="item" v-for="item in components" :key="item" :ref="setItemRef" />
  </div>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, onUpdated, ref } from "vue";

import TCalendar from "../../components/home/t-calendar.vue";
import TPool from "../../components/home/t-pool.vue";
import TPosition from "../../components/home/t-position.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import { useAppStore } from "../../store/modules/app";
import { useHomeStore } from "../../store/modules/home";

// store
const appStore = useAppStore();
const homeStore = useHomeStore();

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载首页");
const loadingSubtitle = ref<string>("");

// data
const components = ref<any[]>([]);
const itemRefs = ref<any[]>([]);

// 定时器
const timer = ref<any>(null);

function readLoading(): void {
  if (!loading.value) return;
  const loadingMap = itemRefs.value.map((item) => {
    return item.loading ? item.name : null;
  });
  loadingSubtitle.value = "正在加载 " + loadingMap.filter((item) => item)?.join("、");
  if (loadingMap.every((item) => !item)) {
    loading.value = false;
  }
}

onMounted(async () => {
  loadingTitle.value = "正在加载首页";
  loading.value = true;
  const isProdEnv = import.meta.env.MODE === "production";
  // 获取当前环境
  if (isProdEnv && appStore.devMode) {
    appStore.devMode = false;
  }
  const showItems = homeStore.getShowValue();
  await Promise.allSettled(
    showItems.map((item) => {
      switch (item) {
        case "限时祈愿":
          return components.value.push(markRaw(TPool));
        case "近期活动":
          return components.value.push(markRaw(TPosition));
        case "素材日历":
          return components.value.push(markRaw(TCalendar));
        default:
          return null;
      }
    }),
  );
  timer.value = setInterval(readLoading, 100);
});

function setItemRef(item: any): void {
  if (itemRefs.value.includes(item)) return;
  itemRefs.value.push(item);
}

// 监听定时器
onUpdated(() => {
  if (!loading.value) clearInterval(timer.value);
});

onUnmounted(() => {
  itemRefs.value = [];
});
</script>
<style lang="css" scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
