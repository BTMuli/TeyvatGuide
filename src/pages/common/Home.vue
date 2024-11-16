<template>
  <div class="home-container">
    <div class="home-top">
      <div class="home-tools" v-if="appStore.isLogin">
        <v-select
          v-model="curGid"
          class="home-tool-select"
          :items="gameSelectList"
          item-title="title"
          item-value="gid"
          :hide-details="true"
          variant="outlined"
          label="分区"
        />
        <TGameNav :model-value="Number(curGid)" />
      </div>
      <div class="home-select">
        <v-select
          variant="outlined"
          v-model="showHome"
          :items="homeStore.getShowItems()"
          :hide-details="true"
          :multiple="true"
          :chips="true"
          label="首页组件显示"
        />
        <v-btn class="select-btn" @click="submitHome" :rounded="true">确定</v-btn>
      </div>
    </div>
    <component :is="item" v-for="item in components" :key="item" @success="loadEnd(item)" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, shallowRef, toRaw } from "vue";

import showLoading from "../../components/func/loading.js";
import showSnackbar from "../../components/func/snackbar.js";
import TCalendar from "../../components/home/t-calendar.vue";
import TPool from "../../components/home/t-pool.vue";
import TPosition from "../../components/home/t-position.vue";
import TGameNav from "../../components/main/t-gamenav.vue";
import { useAppStore } from "../../store/modules/app.js";
import { useHomeStore } from "../../store/modules/home.js";
import TGLogger from "../../utils/TGLogger.js";
import TGConstant from "../../web/constant/TGConstant.js";

// store
const appStore = useAppStore();
const homeStore = useHomeStore();

// data
const endNum = ref<number>(0);
const components = shallowRef<any[]>([]);
const showHome = ref<string[]>(homeStore.getShowValue());
const loadComp = ref<string[]>(toRaw(showHome.value));

const gameSelectList = TGConstant.BBS.CHANNELS;
const curGid = ref<string>(gameSelectList[0].gid);

onMounted(async () => {
  showLoading.start("正在加载首页...");
  // @ts-expect-error-next-line
  const isProdEnv = import.meta.env.MODE === "production";
  // 获取当前环境
  if (isProdEnv && appStore.devMode) {
    appStore.devMode = false;
  }
  const temp = [];
  for (const item of showHome.value) {
    switch (item) {
      case "限时祈愿":
        temp.push(TPool);
        break;
      case "近期活动":
        temp.push(TPosition);
        break;
      case "素材日历":
        temp.push(TCalendar);
        break;
      default:
        break;
    }
  }
  const items = showHome.value.join("、");
  showLoading.update("正在加载首页...", `正在加载：${items}`);
  components.value = temp;
  await TGLogger.Info(`[Home][onMounted] 打开首页，当前显示：${items}`);
});

async function submitHome(): Promise<void> {
  const show = showHome.value;
  if (show.length < 1) {
    showSnackbar.warn("请至少选择一个!");
    return;
  }
  homeStore.setShowValue(show);
  showSnackbar.success("设置成功!");
  await TGLogger.Info("[Home][submitHome] 首页设置成功，当前显示：" + show.join("、"));
  setTimeout(() => window.location.reload(), 1000);
}

function getName(name: string): string {
  switch (name) {
    case "t-pool":
      return "限时祈愿";
    case "t-position":
      return "近期活动";
    case "t-calendar":
      return "素材日历";
    default:
      return "";
  }
}

// 组件加载完成
async function loadEnd(item: any): Promise<void> {
  await TGLogger.Info(`[Home][loadEnd] ${item.__name} 加载完成`);
  loadComp.value = loadComp.value.filter((v) => v !== getName(item.__name));
  endNum.value++;
  if (endNum.value === components.value.length) {
    showLoading.end();
    return;
  }
  showLoading.update("正在加载首页...", `正在加载：${loadComp.value.join("、")}`);
}

onUnmounted(() => (components.value = []));
</script>
<style lang="css" scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.home-tools {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.home-tool-select {
  width: 200px;
  max-width: 200px;
}

.home-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.select-btn {
  width: 100px;
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
