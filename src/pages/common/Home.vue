<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSubtitle" />
  <div class="home-container">
    <div class="home-select">
      <v-select
        variant="outlined"
        v-model="showHome"
        :items="homeStore.getShowItems()"
        hide-details
        :multiple="true"
        :chips="true"
      />
      <v-btn class="select-btn" @click="submitHome">确定</v-btn>
    </div>
    <component :is="item" v-for="item in components" :key="item" :ref="setItemRef" />
  </div>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, onUpdated, ref } from "vue";

import showSnackbar from "../../components/func/snackbar";
import TCalendar from "../../components/home/t-calendar.vue";
import TPool from "../../components/home/t-pool.vue";
import TPosition from "../../components/home/t-position.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import { useAppStore } from "../../store/modules/app";
import { useHomeStore } from "../../store/modules/home";
import TGLogger from "../../utils/TGLogger";

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
const showHome = ref<string[]>(homeStore.getShowValue());

// 定时器
const timer = ref<any>(null);

function setItemRef(item: any): void {
  if (itemRefs.value.includes(item)) return;
  itemRefs.value.push(item);
}

function readLoading(): void {
  if (!loading.value) return;
  let loadingMap = itemRefs.value.map((item) => {
    return item.loading ? item.name : null;
  });
  loadingSubtitle.value = "正在加载 " + loadingMap.filter((item) => item)?.join("、");
  if (loadingMap.every((item) => !item)) {
    loading.value = false;
  }
}

onMounted(async () => {
  loadingTitle.value = "正在加载首页";
  const isProdEnv = import.meta.env.MODE === "production";
  // 获取当前环境
  if (isProdEnv && appStore.devMode) {
    appStore.devMode = false;
  }
  await Promise.allSettled(
    showHome.value.map((item) => {
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
  const items = showHome.value.join("、");
  await TGLogger.Info(`[Home][onMounted] 打开首页，当前显示：${items}`);
});

async function submitHome(): Promise<void> {
  // 获取已选
  const show = showHome.value;
  if (show.length < 1) {
    showSnackbar({
      color: "error",
      text: "请至少选择一个!",
    });
    return;
  }
  homeStore.setShowValue(show);
  showSnackbar({
    color: "success",
    text: "设置成功!",
  });
  await TGLogger.Info("[Home][submitHome] 首页设置成功，当前显示：" + show.join("、"));
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// 监听定时器
onUpdated(async () => {
  if (!loading.value && timer.value !== null) {
    clearInterval(timer.value);
    timer.value = null;
  }
});

onUnmounted(() => {
  itemRefs.value = [];
  components.value = [];
  clearInterval(timer.value);
  timer.value = null;
});
</script>
<style lang="css" scoped>
.home-select {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.select-btn {
  width: 100px;
  height: 40px;
  border-radius: 10px;
  margin-top: 8px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.home-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
