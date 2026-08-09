<!-- 深渊统计浮窗 -->
<template>
  <TOverlay v-model="visible" top-offset="112px">
    <div class="tua-ovs-box">
      <div class="tua-ovs-top">
        <div class="tua-ovs-title">
          <img alt="icon" src="/platforms/other/hutao.webp" />
          <span>深渊统计</span>
        </div>
        <v-btn-toggle
          v-model="tab"
          :mandatory="true"
          class="tua-ovs-toggle"
          color="var(--tgc-od-orange)"
          density="compact"
          variant="outlined"
        >
          <v-btn
            v-for="item in abyssList"
            :key="item.value"
            :prepend-icon="item.icon"
            :value="item.value"
          >
            {{ item.label }}
          </v-btn>
        </v-btn-toggle>
        <v-btn-toggle
          v-if="floorList.length > 0"
          v-model="floor"
          :mandatory="true"
          class="tua-ovs-toggle"
          color="var(--tgc-od-orange)"
          density="compact"
          variant="outlined"
        >
          <v-btn v-for="item in floorList" :key="item" :value="item">第{{ item }}层</v-btn>
        </v-btn-toggle>
        <div class="tua-ovs-actions">
          <v-menu
            v-if="overview"
            v-model="showOverview"
            :close-on-content-click="false"
            location="bottom end"
            offset="8"
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                class="tua-ovs-update"
                prepend-icon="mdi-chart-box-outline"
                v-bind="menuProps"
                variant="text"
              >
                更新于 {{ timestampToDate(overview.cur.Timestamp) }}
              </v-btn>
            </template>
            <HtaOverlayOverview :data="overview" />
          </v-menu>
          <v-btn icon="mdi-close" size="36" variant="text" @click="visible = false" />
        </div>
      </div>
      <div class="tua-ovs-content">
        <HtaTabUse
          v-if="tab === 'use' && hasTabData && abyssData.use"
          :data="abyssData.use"
          :floor
        />
        <HtaTabUp
          v-else-if="tab === 'up' && hasTabData && abyssData.up"
          :data="abyssData.up"
          :floor
        />
        <HtaTabTeam
          v-else-if="tab === 'team' && hasTabData && abyssData.team"
          :floor
          :model-value="abyssData.team"
        />
        <HtaTabHold
          v-else-if="tab === 'hold' && hasTabData && abyssData.hold"
          :data="abyssData.hold"
        />
        <div v-else class="tua-ovs-empty">
          <v-icon icon="mdi-database-off-outline" size="56" />
          <span>暂无统计数据</span>
          <small>当前数据类型暂时没有可展示的内容</small>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import HtaOverlayOverview from "@comp/hutaoAbyss/hta-overlay-overview.vue";
import HtaTabHold from "@comp/hutaoAbyss/hta-tab-hold.vue";
import HtaTabTeam from "@comp/hutaoAbyss/hta-tab-team.vue";
import HtaTabUp from "@comp/hutaoAbyss/hta-tab-up.vue";
import HtaTabUse from "@comp/hutaoAbyss/hta-tab-use.vue";
import hutao from "@Hutao/index.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { computed, reactive, ref, shallowRef, watch } from "vue";

type AbyssTab = "use" | "up" | "team" | "hold";
type AbyssList = Array<{ label: string; value: AbyssTab; icon: string }>;
type AbyssDataItemType<T extends AbyssTab> = T extends "use"
  ? TGApp.Plugins.Hutao.Abyss.PeriodData<Array<TGApp.Plugins.Hutao.Abyss.AvatarUse>>
  : T extends "up"
    ? TGApp.Plugins.Hutao.Abyss.PeriodData<Array<TGApp.Plugins.Hutao.Abyss.AvatarUp>>
    : T extends "team"
      ? Array<TGApp.Plugins.Hutao.Abyss.TeamCombination>
      : T extends "hold"
        ? TGApp.Plugins.Hutao.Abyss.PeriodData<Array<TGApp.Plugins.Hutao.Abyss.AvatarHold>>
        : null;
type AbyssData = { [key in AbyssTab]: AbyssDataItemType<key> | null };

const abyssList: Readonly<AbyssList> = [
  { label: "角色使用", value: "use", icon: "mdi-chart-donut" },
  { label: "角色出场", value: "up", icon: "mdi-account-arrow-up" },
  { label: "队伍出场", value: "team", icon: "mdi-account-group" },
  { label: "角色持有", value: "hold", icon: "mdi-account-heart" },
];
const visible = defineModel<boolean>();
const showOverview = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const tab = shallowRef<AbyssTab>("use");
const floor = ref<number>(12);
const loadingTypes = new Set<AbyssTab>();
const overview =
  shallowRef<TGApp.Plugins.Hutao.Abyss.PeriodData<TGApp.Plugins.Hutao.Abyss.OverviewData>>();
const abyssData: AbyssData = reactive({
  use: shallowRef<AbyssDataItemType<"use"> | null>(null),
  up: shallowRef<AbyssDataItemType<"up"> | null>(null),
  team: shallowRef<AbyssDataItemType<"team"> | null>(null),
  hold: shallowRef<AbyssDataItemType<"hold"> | null>(null),
});
const floorList = computed<Array<number>>(() => {
  let floors: Array<number> = [];
  switch (tab.value) {
    case "use":
      floors = [
        ...(abyssData.use?.cur.map((item) => item.Floor) ?? []),
        ...(abyssData.use?.last.map((item) => item.Floor) ?? []),
      ];
      break;
    case "up":
      floors = [
        ...(abyssData.up?.cur.map((item) => item.Floor) ?? []),
        ...(abyssData.up?.last.map((item) => item.Floor) ?? []),
      ];
      break;
    case "team":
      floors = abyssData.team?.map((item) => item.Floor) ?? [];
      break;
    case "hold":
      return [];
  }
  return [...new Set(floors)].sort((a, b) => b - a);
});
const hasTabData = computed<boolean>(() => {
  switch (tab.value) {
    case "use":
      return (
        abyssData.use?.cur.some((item) => item.Floor === floor.value && item.Ranks.length > 0) ===
          true ||
        abyssData.use?.last.some((item) => item.Floor === floor.value && item.Ranks.length > 0) ===
          true
      );
    case "up":
      return (
        abyssData.up?.cur.some((item) => item.Floor === floor.value && item.Ranks.length > 0) ===
          true ||
        abyssData.up?.last.some((item) => item.Floor === floor.value && item.Ranks.length > 0) ===
          true
      );
    case "team": {
      const team = abyssData.team?.find((item) => item.Floor === floor.value);
      return team !== undefined && (team.Up.length > 0 || team.Down.length > 0);
    }
    case "hold":
      return (abyssData.hold?.cur.length ?? 0) > 0 || (abyssData.hold?.last.length ?? 0) > 0;
  }
  return false;
});

watch(
  () => visible.value,
  async (show) => {
    if (!show || abyssData.use !== null || isLoading.value) return;
    isLoading.value = true;
    loadingTypes.add("use");
    try {
      await getOverview();
      await getUseData();
    } finally {
      loadingTypes.delete("use");
      isLoading.value = false;
      await showLoading.end();
    }
  },
);

watch(
  () => tab.value,
  async () => await refreshData(tab.value),
);

watch(floorList, (list) => {
  if (!list.includes(floor.value)) floor.value = list.includes(12) ? 12 : (list[0] ?? 12);
});

async function refreshData(type: AbyssTab): Promise<void> {
  if (abyssData[type] !== null || loadingTypes.has(type)) return;
  loadingTypes.add(type);
  try {
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
  } finally {
    loadingTypes.delete(type);
    await showLoading.end();
  }
}

async function getOverview(): Promise<void> {
  await showLoading.start("正在获取深渊概览");
  let cur: TGApp.Plugins.Hutao.Abyss.OverviewData | undefined = undefined;
  let last: TGApp.Plugins.Hutao.Abyss.OverviewData | undefined = undefined;
  try {
    const curResp = await hutao.Abyss.overview();
    if (curResp.retcode !== 0) {
      await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getOverview] 获取本期概览失败：${curResp.retcode} ${curResp.message}`,
      );
    } else {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取本期概览失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getOverview] 获取本期概览异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.overview(true);
    if (lastResp.retcode !== 0) {
      await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getOverview] 获取上期概览失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取上期概览失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getOverview] 获取上期概览异常：${errMsg}`);
  }
  if (cur && last) overview.value = { cur, last };
  else overview.value = undefined;
}

async function getUseData(): Promise<void> {
  await showLoading.start("正在获取角色使用率数据");
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarUse> = [];
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarUse> = [];
  try {
    const curResp = await hutao.Abyss.avatar.use();
    if (curResp.retcode !== 0) {
      await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUseData] 获取本期使用率失败：${curResp.retcode} ${curResp.message}`,
      );
    } else if (curResp.data) {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取本期使用率失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getUseData] 获取本期使用率异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.avatar.use(true);
    if (lastResp.retcode !== 0) {
      await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUseData] 获取上期使用率失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else if (lastResp.data) {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取上期使用率失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getUseData] 获取上期使用率异常：${errMsg}`);
  }
  abyssData.use = { cur, last };
}

async function getUpData(): Promise<void> {
  await showLoading.start("正在获取角色出场率数据");
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarUp> = [];
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarUp> = [];
  try {
    const curResp = await hutao.Abyss.avatar.up();
    if (curResp.retcode !== 0) {
      await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUpData] 获取本期出场率失败：${curResp.retcode} ${curResp.message}`,
      );
    } else if (curResp.data) {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取本期出场率失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getUpData] 获取本期出场率异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.avatar.up(true);
    if (lastResp.retcode !== 0) {
      await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUpData] 获取上期出场率失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else if (lastResp.data) {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取上期出场率失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getUpData] 获取上期出场率异常：${errMsg}`);
  }
  abyssData.up = { cur, last };
}

async function getTeamData(): Promise<void> {
  await showLoading.start("正在获取队伍出场数据");
  let data: Array<TGApp.Plugins.Hutao.Abyss.TeamCombination> = [];
  try {
    const teamResp = await hutao.Abyss.team();
    if (teamResp.retcode !== 0) {
      await showLoading.update(`[${teamResp.retcode}] ${teamResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getTeamData] 获取队伍数据失败：${teamResp.retcode} ${teamResp.message}`,
      );
    } else if (teamResp.data) {
      data = teamResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取队伍数据失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getTeamData] 获取队伍数据异常：${errMsg}`);
  }
  abyssData.team = data;
}

async function getHoldData(): Promise<void> {
  await showLoading.start("正在获取角色持有数据");
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarHold> = [];
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarHold> = [];
  try {
    const curResp = await hutao.Abyss.avatar.hold();
    if (curResp.retcode !== 0) {
      await showLoading.update(`[${curResp.retcode}] ${curResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getHoldData] 获取本期持有率失败：${curResp.retcode} ${curResp.message}`,
      );
    } else if (curResp.data) {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取本期持有率失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getHoldData] 获取本期持有率异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.avatar.hold(true);
    if (lastResp.retcode !== 0) {
      await showLoading.update(`[${lastResp.retcode}] ${lastResp.message}`);
      await TGLogger.Warn(
        `[UserAbyss/Stat][getHoldData] 获取上期持有率失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else if (lastResp.data) {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update(`获取上期持有率失败：${errMsg}`);
    await TGLogger.Error(`[UserAbyss/Stat][getHoldData] 获取上期持有率异常：${errMsg}`);
  }
  abyssData.hold = { cur, last };
}
</script>
<style lang="scss" scoped>
.tua-ovs-box {
  display: flex;
  overflow: hidden;
  width: min(1280px, calc(100vw - 112px));
  height: min(760px, calc(100% - 32px));
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
  gap: 12px;
}

.tua-ovs-top {
  display: flex;
  min-height: 48px;
  align-items: center;
  padding: 0 4px 12px;
  border-bottom: 1px solid var(--common-shadow-2);
  gap: 16px;
}

.tua-ovs-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
  gap: 4px;
  white-space: nowrap;

  img {
    width: 32px;
    height: 32px;
    object-fit: cover;
  }
}

.tua-ovs-toggle {
  flex-shrink: 0;
  border-radius: 4px;
}

.tua-ovs-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 4px;
}

.tua-ovs-update {
  cursor: pointer;
  font-family: var(--font-title);
  font-weight: normal;
  white-space: nowrap;
}

.tua-ovs-content {
  overflow: hidden;
  width: 100%;
  min-height: 0;
  flex: 1;
  border-radius: 6px;
  background: var(--app-page-bg);
}

.tua-ovs-empty {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  gap: 6px;

  span {
    color: var(--box-text-2);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  small {
    font-size: 13px;
  }
}
</style>
