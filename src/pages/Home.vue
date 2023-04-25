<template>
  <TLoading v-if="loading" :title="loadingTitle" :subtitle="loadingSubtitle" />
  <component :is="item" v-for="item in components" v-show="!loading" :key="item" :ref="setItemRef" />
</template>

<script lang="ts" setup>
// vue
import { ref, markRaw, onMounted, onUnmounted, onUpdated } from "vue";
import TLoading from "../components/t-loading.vue";
import TPool from "../components/t-pool.vue";
import TPosition from "../components/t-position.vue";
import TCalendar from "../components/t-calendar.vue";
// store
import { useHomeStore } from "../store/modules/home";
// utils
import TGSqlite from "../utils/TGSqlite";

// store
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
  loadingTitle.value = "正在检测数据完整性";
  const isOK = await TGSqlite.check();
  if (!isOK) {
    loadingTitle.value = "正在修复数据";
    await TGSqlite.reset();
  }
  loadingTitle.value = "正在加载首页";
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
