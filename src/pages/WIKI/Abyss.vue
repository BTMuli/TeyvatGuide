<template>
  <v-app-bar>
    <template #prepend>
      <div class="hta-top-prepend">
        <img src="/source/UI/wikiAbyss.webp" alt="icon" />
        <span>深渊统计</span>
        <v-select
          v-model="tab"
          :items="abyssList"
          item-title="label"
          item-value="value"
          density="compact"
          variant="outlined"
        />
      </div>
    </template>
    <template #append>
      <div class="hta-top-append">
        <span @click="showDialog = !showDialog" v-if="overview">
          更新于 {{ timestampToDate(overview.cur.Timestamp) }}
        </span>
      </div>
    </template>
  </v-app-bar>
  <div class="hta-box">
    <v-window v-model="tab" class="hta-tab-item">
      <v-window-item value="use">
        <HtaTabUse v-if="abyssData.use !== null" :data="abyssData.use" />
      </v-window-item>
      <v-window-item value="up">
        <HtaTabUp v-if="abyssData.up !== null" :data="abyssData.up" />
      </v-window-item>
      <v-window-item value="team">
        <HtaTabTeam v-if="abyssData.team !== null" :model-value="abyssData.team" />
      </v-window-item>
      <v-window-item value="hold">
        <HtaTabHold v-if="abyssData.hold !== null" :data="abyssData.hold" />
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
import Hutao from "@Hutao/index.js";
import { onMounted, reactive, type Ref, ref, shallowRef, watch } from "vue";

import { timestampToDate } from "@/utils/toolFunc.js";

enum AbyssTabEnum {
  use = "角色使用",
  up = "角色出场",
  team = "队伍出场",
  hold = "角色持有",
}

type AbyssTab = keyof typeof AbyssTabEnum;
type AbyssList = Array<{ label: AbyssTabEnum; value: AbyssTab }>;
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
type AbyssData = { [key in AbyssTab]: Ref<AbyssDataItemType<key> | null> };

const abyssList: Readonly<AbyssList> = [
  { label: AbyssTabEnum.use, value: "use" },
  { label: AbyssTabEnum.up, value: "up" },
  { label: AbyssTabEnum.team, value: "team" },
  { label: AbyssTabEnum.hold, value: "hold" },
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
  await showLoading.start("正在获取深渊数据", "正在获取深渊概览");
  overview.value = {
    cur: await Hutao.Abyss.overview(),
    last: await Hutao.Abyss.overview(true),
  };
  await showLoading.update("正在获取角色使用率数据");
  abyssData.use = <AbyssDataItem<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>>await getData("use");
  await showLoading.end();
});

async function refreshData(type: AbyssTab): Promise<void> {
  if (abyssData && abyssData[type] !== null) return;
  await showLoading.start("正在获取深渊数据", `正在获取 ${AbyssTabEnum[type]} 数据`);
  const data = await getData(type);
  switch (type) {
    case "use":
      abyssData.use = <AbyssDataItemType<"use">>data;
      break;
    case "up":
      abyssData.up = <AbyssDataItemType<"up">>data;
      break;
    case "team":
      abyssData.team = <AbyssDataItemType<"team">>data;
      break;
    case "hold":
      abyssData.hold = <AbyssDataItemType<"hold">>data;
      break;
  }
  await showLoading.end();
}

async function getData(type: AbyssTab): Promise<AbyssDataItemType<AbyssTab>> {
  switch (type) {
    case "use":
      return {
        cur: await Hutao.Abyss.avatar.use(),
        last: await Hutao.Abyss.avatar.use(true),
      };
    case "up":
      return {
        cur: await Hutao.Abyss.avatar.up(),
        last: await Hutao.Abyss.avatar.up(true),
      };
    case "team":
      return await Hutao.Abyss.team();
    case "hold":
      return {
        cur: await Hutao.Abyss.avatar.hold(),
        last: await Hutao.Abyss.avatar.hold(true),
      };
  }
}
</script>
<style lang="css" scoped>
.hta-top-prepend {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }

  :last-child {
    height: 50px;
    margin-top: 20px;
  }
}

.hta-top-append {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-right: 10px;
  cursor: pointer;
  font-family: var(--font-title);
}

.hta-box {
  overflow: auto;
  width: 100%;
  box-sizing: border-box;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.hta-tab-item {
  width: 100%;
  height: 100%;
}
</style>
