<!-- 深渊统计浮窗 -->
<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId
    class="tua-ovs"
    contentMaxHeight="none"
    panelHeight="min(760px, calc(100dvh - 144px))"
    panelWidth="min(1280px, calc(100vw - clamp(24px, 8vw, 112px)))"
    topOffset="112px"
  >
    <template #header>
      <div class="tua-ovs-header">
        <div class="tua-ovs-identity">
          <img alt="" class="tua-ovs-icon" src="/platforms/other/hutao.webp" />
          <div>
            <h2 :id="titleId" class="tua-ovs-title">深渊统计</h2>
            <v-menu
              v-if="overview"
              v-model="showOverview"
              :close-on-content-click="false"
              location="bottom start"
              offset="8"
            >
              <template #activator="{ props: menuProps }">
                <button
                  v-bind="menuProps"
                  class="tua-ovs-update"
                  title="查看数据概况"
                  type="button"
                >
                  <v-icon aria-hidden="true" icon="mdi-chart-box-outline" size="14" />
                  <span>更新于 {{ fmtUtil.dateTime(overview.cur.Timestamp) }}</span>
                </button>
              </template>
              <HtaOverlayOverview :data="overview" />
            </v-menu>
          </div>
        </div>
        <div class="tua-ovs-controls">
          <v-btn-toggle
            v-if="floorList.length > 0"
            v-model="floor"
            aria-label="楼层"
            class="tua-ovs-toggle"
            color="var(--common-text-title)"
            mandatory
            role="group"
            size="36"
            variant="outlined"
          >
            <v-tooltip
              v-for="item in floorList"
              :key="item"
              :text="`第${item}层`"
              location="bottom"
            >
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="`第${item}层`"
                  :aria-pressed="floor === item"
                  :value="item"
                  icon
                  type="button"
                >
                  <v-icon aria-hidden="true" icon="mdi-stairs" size="20" />
                  <span aria-hidden="true" class="tua-ovs-floor-badge">{{ item }}</span>
                </v-btn>
              </template>
            </v-tooltip>
          </v-btn-toggle>
          <v-btn-toggle
            v-model="tab"
            aria-label="统计类型"
            class="tua-ovs-toggle"
            color="var(--common-text-title)"
            mandatory
            role="group"
            size="36"
            variant="outlined"
          >
            <v-tooltip
              v-for="item in abyssList"
              :key="item.value"
              :text="item.label"
              location="bottom"
            >
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="item.label"
                  :aria-pressed="tab === item.value"
                  :disabled="isLoading && loading !== item.value"
                  :icon="item.icon"
                  :loading="loading === item.value"
                  :value="item.value"
                  type="button"
                />
              </template>
            </v-tooltip>
          </v-btn-toggle>
        </div>
      </div>
    </template>
    <template #actions>
      <v-btn
        :disabled="isLoading && loading !== 'refresh'"
        :loading="loading === 'refresh'"
        aria-label="刷新深渊统计"
        density="comfortable"
        icon="mdi-refresh"
        title="刷新深渊统计"
        type="button"
        variant="text"
        @click="refreshData(tab, 'refresh')"
      />
      <v-btn
        aria-label="关闭深渊统计"
        density="comfortable"
        icon="mdi-close"
        title="关闭深渊统计"
        type="button"
        variant="text"
        @click="visible = false"
      />
    </template>
    <div :aria-busy="isLoading" class="tua-ovs-content">
      <HtaTabUse v-if="tab === 'use' && hasTabData && abyssData.use" :data="abyssData.use" :floor />
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
      <div v-else-if="!isLoading" class="tua-ovs-empty">
        <v-icon icon="mdi-database-off-outline" size="56" />
        <span>暂无统计数据</span>
        <small>当前数据类型暂时没有可展示的内容</small>
      </div>
    </div>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import HtaOverlayOverview from "@comp/hutaoAbyss/hta-overlay-overview.vue";
import HtaTabHold from "@comp/hutaoAbyss/hta-tab-hold.vue";
import HtaTabTeam from "@comp/hutaoAbyss/hta-tab-team.vue";
import HtaTabUp from "@comp/hutaoAbyss/hta-tab-up.vue";
import HtaTabUse from "@comp/hutaoAbyss/hta-tab-use.vue";
import hutao from "@Hutao/index.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { computed, reactive, ref, shallowRef, useId, watch } from "vue";

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
const titleId = useId();
const showOverview = ref<boolean>(false);
const loading = shallowRef<AbyssTab | "refresh">();
const isLoading = computed<boolean>(() => loading.value !== undefined);
const tab = shallowRef<AbyssTab>("use");
const floor = ref<number>(12);
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

watch(visible, async (show) => {
  if (show && abyssData.use === null) await refreshData("use", "initial");
});

watch(tab, async (type) => await refreshData(type));

watch(floorList, (list) => {
  if (!list.includes(floor.value)) floor.value = list.includes(12) ? 12 : (list[0] ?? 12);
});

async function refreshData(
  type: AbyssTab,
  mode: "tab" | "initial" | "refresh" = "tab",
): Promise<void> {
  if (isLoading.value || (mode === "tab" && abyssData[type] !== null)) return;
  loading.value = mode === "refresh" ? "refresh" : type;
  try {
    const loadedOverview = mode === "tab" || (await getOverview());
    let loadedStats: boolean;
    switch (type) {
      case "use":
        loadedStats = await getUseData();
        break;
      case "up":
        loadedStats = await getUpData();
        break;
      case "team":
        loadedStats = await getTeamData();
        break;
      case "hold":
        loadedStats = await getHoldData();
        break;
    }
    if (!loadedOverview || !loadedStats) showSnackbar.warn("深渊统计数据获取不完整");
  } finally {
    loading.value = undefined;
  }
}

async function getOverview(): Promise<boolean> {
  let cur: TGApp.Plugins.Hutao.Abyss.OverviewData | undefined = undefined;
  let last: TGApp.Plugins.Hutao.Abyss.OverviewData | undefined = undefined;
  try {
    const curResp = await hutao.Abyss.overview();
    if (curResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getOverview] 获取本期概览失败：${curResp.retcode} ${curResp.message}`,
      );
    } else {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getOverview] 获取本期概览异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.overview(true);
    if (lastResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getOverview] 获取上期概览失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getOverview] 获取上期概览异常：${errMsg}`);
  }
  if (!cur || !last) return false;
  overview.value = { cur, last };
  return true;
}

async function getUseData(): Promise<boolean> {
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarUse> | undefined;
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarUse> | undefined;
  try {
    const curResp = await hutao.Abyss.avatar.use();
    if (curResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUseData] 获取本期使用率失败：${curResp.retcode} ${curResp.message}`,
      );
    } else if (curResp.data) {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getUseData] 获取本期使用率异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.avatar.use(true);
    if (lastResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUseData] 获取上期使用率失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else if (lastResp.data) {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getUseData] 获取上期使用率异常：${errMsg}`);
  }
  const loaded = cur !== undefined && last !== undefined;
  if (loaded || abyssData.use === null) abyssData.use = { cur: cur ?? [], last: last ?? [] };
  return loaded;
}

async function getUpData(): Promise<boolean> {
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarUp> | undefined;
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarUp> | undefined;
  try {
    const curResp = await hutao.Abyss.avatar.up();
    if (curResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUpData] 获取本期出场率失败：${curResp.retcode} ${curResp.message}`,
      );
    } else if (curResp.data) {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getUpData] 获取本期出场率异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.avatar.up(true);
    if (lastResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getUpData] 获取上期出场率失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else if (lastResp.data) {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getUpData] 获取上期出场率异常：${errMsg}`);
  }
  const loaded = cur !== undefined && last !== undefined;
  if (loaded || abyssData.up === null) abyssData.up = { cur: cur ?? [], last: last ?? [] };
  return loaded;
}

async function getTeamData(): Promise<boolean> {
  let data: Array<TGApp.Plugins.Hutao.Abyss.TeamCombination> | undefined;
  try {
    const teamResp = await hutao.Abyss.team();
    if (teamResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getTeamData] 获取队伍数据失败：${teamResp.retcode} ${teamResp.message}`,
      );
    } else if (teamResp.data) {
      data = teamResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getTeamData] 获取队伍数据异常：${errMsg}`);
  }
  abyssData.team = data ?? abyssData.team ?? [];
  return data !== undefined;
}

async function getHoldData(): Promise<boolean> {
  let cur: Array<TGApp.Plugins.Hutao.Abyss.AvatarHold> | undefined;
  let last: Array<TGApp.Plugins.Hutao.Abyss.AvatarHold> | undefined;
  try {
    const curResp = await hutao.Abyss.avatar.hold();
    if (curResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getHoldData] 获取本期持有率失败：${curResp.retcode} ${curResp.message}`,
      );
    } else if (curResp.data) {
      cur = curResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getHoldData] 获取本期持有率异常：${errMsg}`);
  }
  try {
    const lastResp = await hutao.Abyss.avatar.hold(true);
    if (lastResp.retcode !== 0) {
      await TGLogger.Warn(
        `[UserAbyss/Stat][getHoldData] 获取上期持有率失败：${lastResp.retcode} ${lastResp.message}`,
      );
    } else if (lastResp.data) {
      last = lastResp.data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[UserAbyss/Stat][getHoldData] 获取上期持有率异常：${errMsg}`);
  }
  const loaded = cur !== undefined && last !== undefined;
  if (loaded || abyssData.hold === null) abyssData.hold = { cur: cur ?? [], last: last ?? [] };
  return loaded;
}
</script>
<style lang="scss" scoped>
.tua-ovs {
  :deep(.tolp-panel) {
    max-width: none;
    background: var(--box-bg-1);
    box-shadow: 0 4px 12px var(--common-shadow-1);
  }

  :deep(.tolp-header) {
    flex-shrink: 0;
    padding: 12px 16px;
  }

  :deep(.tolp-content) {
    overflow: hidden;
    padding: 12px;
  }
}

.tua-ovs-header,
.tua-ovs-identity,
.tua-ovs-controls {
  display: flex;
  align-items: center;
}

.tua-ovs-header {
  width: 100%;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.tua-ovs-identity {
  min-width: 0;
  gap: 8px;
}

.tua-ovs-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 4px;
  object-fit: cover;
}

.tua-ovs-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 24px;
}

.tua-ovs-update {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--box-text-4);
  cursor: pointer;
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  text-align: left;

  &:hover,
  &:focus-visible {
    color: var(--common-text-title);
    text-decoration: underline;
  }
}

.tua-ovs-controls {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 12px;
  margin-inline-start: auto;
}

.tua-ovs-toggle {
  background: var(--box-bg-1);
}

.tua-ovs-floor-badge {
  position: absolute;
  right: 2px;
  bottom: 4px;
  display: flex;
  width: 12px;
  height: 12px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-od-orange);
  color: var(--tgc-dark-8);
  font-family: var(--font-text);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 12px;
  pointer-events: none;
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
