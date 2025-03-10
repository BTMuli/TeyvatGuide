<template>
  <div class="home-container">
    <div class="home-top">
      <div class="home-tools" v-if="isLogin">
        <v-select
          v-model="curGid"
          class="home-tool-select"
          :items="gameList"
          :hide-details="true"
          item-value="gid"
          variant="outlined"
          label="分区"
        >
          <template #selection="{ item }">
            <div class="select-item main">
              <TMiImg
                v-if="item.raw.icon"
                :ori="true"
                :src="item.raw.icon"
                :alt="item.raw.title"
                :title="item.raw.title"
                class="icon"
              />
              <span>{{ item.raw.title }}</span>
            </div>
          </template>
          <template #item="{ props, item }">
            <div
              v-bind="props"
              class="select-item sub"
              :class="item.raw.gid === curGid ? 'selected' : ''"
            >
              <TMiImg
                v-if="item.raw.icon"
                :src="item.raw.icon"
                :alt="item.raw.title"
                :title="item.raw.title"
                class="icon"
              />
              <span>{{ item.raw.title }}</span>
            </div>
          </template>
        </v-select>
        <TGameNav :model-value="curGid" />
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
import TGameNav from "@comp/app/t-gameNav.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhCompCalendar from "@comp/pageHome/ph-comp-calendar.vue";
import PhCompPool from "@comp/pageHome/ph-comp-pool.vue";
import PhCompPosition from "@comp/pageHome/ph-comp-position.vue";
import { storeToRefs } from "pinia";
import { type Component, computed, onMounted, ref, shallowRef, watch } from "vue";

import { useAppStore } from "@/store/modules/app.js";
import { ShowItemEnum, useHomeStore } from "@/store/modules/home.js";
import TGLogger from "@/utils/TGLogger.js";
import apiHubReq from "@/web/request/apiHubReq.js";

type SFComp = Component & {
  __file?: string;
  __hmrId?: string;
  __name?: string;
  __scopeId?: string;
};
type SelectItem = { icon: string; title: string; gid: number };

const { devMode, isLogin } = storeToRefs(useAppStore());
const homeStore = useHomeStore();

const showItemsAll: Array<ShowItemEnum> = [
  ShowItemEnum.calendar,
  ShowItemEnum.pool,
  ShowItemEnum.position,
];

const curGid = ref<number>(2);
const gameList = shallowRef<Array<SelectItem>>();

const loadItems = shallowRef<Array<ShowItemEnum>>([]);
const components = shallowRef<Array<SFComp>>([]);
const showItems = computed<Array<ShowItemEnum>>({
  get: () => homeStore.getShowItems(),
  set: (v: Array<ShowItemEnum>) => homeStore.setShowItems(v),
});

onMounted(async () => {
  // @ts-expect-error-next-line The import.meta meta-property is not allowed in files which will build into CommonJS output.
  const isProdEnv = import.meta.env.MODE === "production";
  if (isProdEnv && devMode.value) devMode.value = false;
  if (isLogin.value) {
    await showLoading.start("正在加载首页小部件");
    const allGames = await apiHubReq.game();
    gameList.value = allGames.map((i) => ({ icon: i.app_icon, title: i.name, gid: i.id }));
  }
  await loadComp();
});

watch(
  () => components.value,
  async (cur, old) => {
    const newComp = cur.filter((i) => !old.includes(i));
    if (newComp.length === 0) await showLoading.end();
  },
);

async function loadComp(): Promise<void> {
  const temp: Array<SFComp> = [];
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
  await showLoading.start(`正在加载：${showItems.value.join("、")}`);
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
  await showLoading.update(`${compName} 加载完成`);
  if (!loadItems.value.includes(compName)) loadItems.value.push(compName);
  else showSnackbar.warn(`${compName} 已加载`);
  if (loadItems.value.length === components.value.length) await showLoading.end();
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
  width: 250px;
  max-width: 250px;
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

.select-item {
  position: relative;
  display: flex;
  align-items: center;
  column-gap: 4px;

  &.main {
    position: relative;
    height: 24px;
    font-family: var(--font-title);
    font-size: 16px;
  }

  &.sub {
    padding: 8px;
    font-family: var(--font-title);
    font-size: 16px;

    &:hover {
      background: var(--common-shadow-2);
    }

    &.selected:not(:hover) {
      background: var(--common-shadow-1);
    }
  }

  .icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
  }
}
</style>
