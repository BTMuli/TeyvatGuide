<template>
  <TLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSubtitle" />
  <component :is="item" v-for="item in components" :key="item" :ref="setItemRef" />
</template>

<script lang="ts" setup>
// vue
import { markRaw, onMounted, onUnmounted, onUpdated, ref } from "vue";
import TLoading from "../components/main/t-loading.vue";
import TPool from "../components/main/t-pool.vue";
import TPosition from "../components/main/t-position.vue";
import TCalendar from "../components/main/t-calendar.vue";
// store
import { useHomeStore } from "../store/modules/home";
import { useAppStore } from "../store/modules/app";
// utils
import { getBuildTime } from "../utils/TGBuild";

// store
const appStore = useAppStore();
const homeStore = useHomeStore();

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载首页");
const loadingSubtitle = ref("");

// data
const components = ref([] as any[]);
const itemRefs = ref([] as any[]);

// 定时器
const timer = ref(null as any);

function readLoading (): void {
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
  // 获取当前环境
  const timeGet = getBuildTime();
  appStore.devEnv = timeGet.startsWith("dev");
  if (!appStore.devEnv && appStore.devMode) {
    appStore.devMode = false;
  }
  appStore.buildTime = getBuildTime();
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

function setItemRef (item: any) {
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
