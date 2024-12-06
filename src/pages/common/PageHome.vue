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
          v-model="showItems"
          :items="showItemsAll"
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
import { type Component, computed, onMounted, ref, shallowRef, watch } from "vue";

import TGameNav from "../../components/app/t-gamenav.vue";
import showLoading from "../../components/func/loading.js";
import showSnackbar from "../../components/func/snackbar.js";
import PhCompCalendar from "../../components/pageHome/ph-comp-calendar.vue";
import PhCompPool from "../../components/pageHome/ph-comp-pool.vue";
import PhCompPosition from "../../components/pageHome/ph-comp-position.vue";
import { useAppStore } from "../../store/modules/app.js";
import { ShowItemEnum, useHomeStore } from "../../store/modules/home.js";
import TGLogger from "../../utils/TGLogger.js";
import TGConstant from "../../web/constant/TGConstant.js";

type SFComp = Component & {
  __file?: string;
  __hmrId?: string;
  __name?: string;
  __scopeId?: string;
};

const appStore = useAppStore();
const homeStore = useHomeStore();

const showItemsAll: Array<ShowItemEnum> = [
  ShowItemEnum.calendar,
  ShowItemEnum.pool,
  ShowItemEnum.position,
];
const showItems = computed<ShowItemEnum[]>({
  get: () => homeStore.getShowItems(),
  set: (v: ShowItemEnum[]) => homeStore.setShowItems(v),
});
const loadItems = shallowRef<ShowItemEnum[]>([]);
const components = shallowRef<SFComp[]>([]);

const gameSelectList = TGConstant.BBS.CHANNELS;
const curGid = ref<string>(gameSelectList[0].gid);

onMounted(async () => {
  showLoading.start("正在加载首页...");
  // @ts-expect-error-next-line The import.meta meta-property is not allowed in files which will build into CommonJS output.
  const isProdEnv = import.meta.env.MODE === "production";
  if (isProdEnv && appStore.devMode) appStore.devMode = false;
  await loadComp();
});

watch(
  () => components.value,
  (cur, old) => {
    const newComp = cur.filter((i) => !old.includes(i));
    if (newComp.length === 0) showLoading.end();
  },
);

async function loadComp(): Promise<void> {
  showLoading.start("正在加载首页...");
  const temp: SFComp[] = [];
  for (const item of showItems.value) {
    switch (item) {
      case "限时祈愿":
        temp.push(PhCompPool);
        break;
      case "近期活动":
        temp.push(PhCompPosition);
        break;
      case "素材日历":
        temp.push(PhCompCalendar);
        break;
    }
  }
  showLoading.update("正在加载首页...", `正在加载：${showItems.value.join("、")}`);
  components.value = temp;
  await TGLogger.Info(`[Home][loadComp] 打开首页，当前显示：${showItems.value.join("、")}`);
}

async function submitHome(): Promise<void> {
  if (showItems.value.length === 0) {
    showSnackbar.warn("请至少选择一个!");
    return;
  }
  showSnackbar.success("设置成功!");
  await TGLogger.Info("[Home][submitHome] 首页设置成功，当前显示：" + showItems.value.join("、"));
  loadItems.value = showItems.value.filter((i) => loadItems.value.includes(i));
  await loadComp();
}

function getName(name: string): ShowItemEnum | undefined {
  switch (name) {
    case "ph-comp-pool":
      return ShowItemEnum.pool;
    case "ph-comp-position":
      return ShowItemEnum.position;
    case "ph-comp-calendar":
      return ShowItemEnum.calendar;
    default:
      return undefined;
  }
}

async function loadEnd(item: SFComp): Promise<void> {
  const compName = getName(item.__name ?? "");
  if (!compName) return;
  await TGLogger.Info(`[Home][loadEnd] ${compName} 加载完成`);
  showLoading.update("正在加载首页...", `${compName} 加载完成`);
  if (!loadItems.value.includes(compName)) loadItems.value.push(compName);
  else showSnackbar.warn(`${compName} 已加载`);
  if (loadItems.value.length === components.value.length) showLoading.end();
}
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
