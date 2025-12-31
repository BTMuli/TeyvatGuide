<!-- 胡桃云统计数据 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="hta-top-prepend">
        <div class="hta-top-title">
          <img alt="icon" src="/source/UI/wikiAbyss.webp" />
          <span>深渊统计</span>
        </div>
        <v-select
          v-model="tab"
          :items="abyssList"
          class="hta-top-select"
          density="compact"
          item-title="label"
          item-value="value"
          label="数据类型"
          variant="outlined"
        />
      </div>
    </template>
    <template #append>
      <div class="hta-top-append">
        <span v-if="overview" @click="showDialog = !showDialog">
          更新于 {{ timestampToDate(overview.cur.Timestamp) }}
        </span>
      </div>
    </template>
  </v-app-bar>
  <div class="hta-box">
    <v-window v-model="tab" class="hta-tab-item">
      <v-window-item value="use">
        <HtaTabUse v-if="abyssData.use" :data="abyssData.use" />
      </v-window-item>
      <v-window-item value="up">
        <HtaTabUp v-if="abyssData.up" :data="abyssData.up" />
      </v-window-item>
      <v-window-item value="team">
        <HtaTabTeam v-if="abyssData.team" :model-value="abyssData.team" />
      </v-window-item>
      <v-window-item value="hold">
        <HtaTabHold v-if="abyssData.hold" :data="abyssData.hold" />
      </v-window-item>
    </v-window>
  </div>
  <HtaOverlayOverview v-if="overview" v-model="showDialog" :data="overview" />
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import HtaOverlayOverview from "@comp/hutaoAbyss/hta-overlay-overview.vue";
import HtaTabHold from "@comp/hutaoAbyss/hta-tab-hold.vue";
import HtaTabTeam from "@comp/hutaoAbyss/hta-tab-team.vue";
import HtaTabUp from "@comp/hutaoAbyss/hta-tab-up.vue";
import HtaTabUse from "@comp/hutaoAbyss/hta-tab-use.vue";
import hutao from "@Hutao/index.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { onMounted, reactive, ref, type ShallowRef, shallowRef, watch } from "vue";

type AbyssTab = "use" | "up" | "team" | "hold";
type AbyssList = Array<{ label: string; value: AbyssTab }>;
export type AbyssDataItem<T> = { cur: T; last: T };
export type AbyssDataItemType<T extends AbyssTab> = T extends "use"
  ? AbyssDataItem<Array<TGApp.Plugins.Hutao.Abyss.AvatarUse>>
  : T extends "up"
    ? AbyssDataItem<Array<TGApp.Plugins.Hutao.Abyss.AvatarUp>>
    : T extends "team"
      ? Array<TGApp.Plugins.Hutao.Abyss.TeamCombination>
      : T extends "hold"
        ? AbyssDataItem<Array<TGApp.Plugins.Hutao.Abyss.AvatarHold>>
        : null;
type AbyssData = { [key in AbyssTab]: ShallowRef<AbyssDataItemType<key> | null> };

const abyssList: Readonly<AbyssList> = [
  { label: "角色使用", value: "use" },
  { label: "角色出场", value: "up" },
  { label: "队伍出场", value: "team" },
  { label: "角色持有", value: "hold" },
];
const showDialog = ref<boolean>(false);
const tab = shallowRef<AbyssTab>("use");
const overview = shallowRef<AbyssDataItem<TGApp.Plugins.Hutao.Abyss.OverviewData>>();
const abyssData = reactive<AbyssData>({
  use: shallowRef<AbyssDataItemType<"use"> | null>(null),
  up: shallowRef<AbyssDataItemType<"up"> | null>(null),
  team: shallowRef<AbyssDataItemType<"team"> | null>(null),
  hold: shallowRef<AbyssDataItemType<"hold"> | null>(null),
});

watch(
  () => tab.value,
  async () => await refreshData(tab.value),
);

onMounted(async () => {
  await getOverview();
  await getUseData();
  await showLoading.end();
});

async function refreshData(type: AbyssTab): Promise<void> {
  if (abyssData && abyssData[type] !== null) return;
  switch (type) {
    case "use":
      await getUseData();
      break;
    case "up":
      await getUpData();
      break;
    case "team":
      await getTeamData();
      break;
    case "hold":
      await getHoldData();
      break;
  }
  await showLoading.end();
}

async function getOverview(): Promise<void> {
  await showLoading.start("正在获取深渊概览");
  let cur: TGApp.Plugins.Hutao.Abyss.OverviewData | undefined = undefined;
  let last: TGApp.Plugins.Hutao.Abyss.OverviewData | undefined = undefined;
  const curResp = await hutao.Abyss.overview();
  if ("retcode" in curResp) {
    await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
  } else {
    cur = curResp;
  }
  const lastResp = await hutao.Abyss.overview(true);
  if ("retcode" in lastResp) {
    await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
  } else {
    last = lastResp;
  }
  if (cur && last) overview.value = { cur, last };
  else overview.value = undefined;
}

async function getUseData(): Promise<void> {
  await showLoading.start("正在获取角色使用率数据");
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarUse> = [];
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarUse> = [];
  const curResp = await hutao.Abyss.avatar.use();
  if (!Array.isArray(curResp)) {
    await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
  } else {
    cur = curResp;
  }
  const lastResp = await hutao.Abyss.avatar.use(true);
  if (!Array.isArray(lastResp)) {
    await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
  } else {
    last = lastResp;
  }
  abyssData.use = { cur, last };
}

async function getUpData(): Promise<void> {
  await showLoading.start("正在获取角色出场率数据");
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarUp> = [];
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarUp> = [];
  const curResp = await hutao.Abyss.avatar.up();
  if (!Array.isArray(curResp)) {
    await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
  } else {
    cur = curResp;
  }
  const lastResp = await hutao.Abyss.avatar.use(true);
  if (!Array.isArray(lastResp)) {
    await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
  } else {
    last = lastResp;
  }
  abyssData.up = { cur, last };
}

async function getTeamData(): Promise<void> {
  await showLoading.start("正在获取队伍出场数据");
  const teamResp = await hutao.Abyss.team();
  if ("retcode" in teamResp) {
    await showLoading.update(`[${teamResp.retcode}] ${teamResp.message}`);
  } else {
    abyssData.team = teamResp;
  }
}

async function getHoldData(): Promise<void> {
  await showLoading.start("正在获取角色持有数据");
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarHold> = [];
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarHold> = [];
  const curResp = await hutao.Abyss.avatar.hold();
  if (!Array.isArray(curResp)) {
    await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
  } else {
    cur = curResp;
  }
  const lastResp = await hutao.Abyss.avatar.hold(true);
  if (!Array.isArray(lastResp)) {
    await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
  } else {
    last = lastResp;
  }
  abyssData.hold = { cur, last };
}
</script>
<style lang="scss" scoped>
.hta-top-prepend {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 16px;
}

.hta-top-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 20px;

  img {
    width: 32px;
    height: 32px;
    object-fit: cover;
  }
}

.hta-top-select {
  position: relative;
  height: 40px;
}

.hta-top-append {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-right: 12px;
  cursor: pointer;
  font-family: var(--font-title);
}

.hta-box {
  overflow: auto;
  width: 100%;
  box-sizing: border-box;
  border-radius: 4px;
  box-shadow: 0 0 8px var(--common-shadow-4);
}

.hta-tab-item {
  width: 100%;
  height: 100%;
}
</style>
