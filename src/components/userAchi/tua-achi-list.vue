<template>
  <div class="tua-al-container">
    <div v-if="ncData !== undefined" class="tua-al-nc">
      <TopNameCard :data="ncData" :finish="isFinish" @selected="showNc = true" />
    </div>
    <v-virtual-scroll :item-height="60" :items="renderAchi" class="tua-al-list">
      <template #default="{ item }">
        <TuaAchi
          :completedStageCount="item.completedStageCount"
          :data="item.achievement"
          :expandable="item.expandable"
          :expanded="item.expanded"
          :isStageChild="item.isStageChild"
          :stageCount="item.stageCount"
          :stageIndex="item.stageIndex"
          @updated="handleAchiUpdated"
          @select-achi="selectAchi"
          @toggle-stages="toggleStageChain(item.stageChainId)"
        />
      </template>
    </v-virtual-scroll>
    <ToNameCard
      v-if="ncData"
      v-model="showNc"
      :data="ncData"
      :achievementSeries="{
        uid: props.uid,
        name: TSUserAchi.getAchievementCategoryById(series)?.name ?? '成就系列',
        items: achievements,
      }"
      topOffset="112px"
    />
    <TuaAchiOverlay
      v-if="selectedAchi"
      v-model="showOverlay"
      :data="selectedAchi"
      @search="handleSearch"
      @updated="handleAchiUpdated"
      @select-achievement="selectAchiFromOverlay"
      @select-series="selectSeries"
    >
      <template #left>
        <v-btn
          :disabled="!canNavigatePrevious"
          aria-label="上一个成就"
          class="card-arrow"
          icon="mdi-chevron-left"
          title="上一个成就"
          variant="flat"
          @click="switchAchiInfo(false)"
        />
      </template>
      <template #right>
        <v-btn
          :disabled="!canNavigateNext"
          aria-label="下一个成就"
          class="card-arrow"
          icon="mdi-chevron-right"
          title="下一个成就"
          variant="flat"
          @click="switchAchiInfo(true)"
        />
      </template>
    </TuaAchiOverlay>
    <VpOverlaySearch
      v-model="showSearch"
      :gid="2"
      :keyword="searchWd"
      topOffset="112px"
      @user-click="handleUserClick"
    />
    <VpOverlayUser v-model="showUser" :gid="curGid" :uid="curUid" />
  </div>
</template>
<script lang="ts" setup>
import ToNameCard from "@comp/app/to-nameCard.vue";
import TopNameCard from "@comp/app/top-nameCard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import TSUserAchi from "@Sqlm/userAchi.js";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";

import TuaAchiOverlay from "./tua-achi-overlay.vue";
import TuaAchi from "./tua-achi.vue";

import { AppNameCardsData } from "@/data/index.js";

/**
 * 成就列表组件属性。
 * @since Beta v0.13.0
 */
type TuaAchiListProps = {
  uid: number;
  hideFin: boolean;
  hiddenFilter: "all" | "hidden" | "visible";
  recentAchievements: ReadonlyArray<TGApp.App.Achievement.RenderItem>;
  search?: string;
};
type AchievementListItem = {
  achievement: TGApp.App.Achievement.RenderItem;
  completedStageCount: number;
  stageChainId: number;
  stageIndex: number;
  stageCount: number;
  isStageChild: boolean;
  expandable: boolean;
  expanded: boolean;
};

const props = defineProps<TuaAchiListProps>();
const series = defineModel<number>("series", { required: true });
const isSearch = defineModel<boolean>("isSearch", { required: true });

const showNc = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const isFinish = ref<boolean>(false);
const searchWd = ref<string>();
const showSearch = ref<boolean>(false);
const showUser = ref<boolean>(false);
const curUid = ref<string>("");
const curGid = ref<number>(2);
const expandedStageChains = ref<Set<number>>(new Set());

const ncData = shallowRef<TGApp.App.NameCard.Item>();
const achievements = shallowRef<Array<TGApp.App.Achievement.RenderItem>>([]);
const selectedAchi = shallowRef<TGApp.App.Achievement.RenderItem>();
const recentNavigation = shallowRef<ReadonlyArray<TGApp.App.Achievement.RenderItem>>();
let dataRequestId = 0;

const renderAchi = computed<Array<AchievementListItem>>(() =>
  groupAchievementStages(achievements.value),
);
const navigationItems = computed<Array<TGApp.App.Achievement.RenderItem>>(() =>
  recentNavigation.value === undefined
    ? renderAchi.value.map((item) => item.achievement)
    : Array.from(recentNavigation.value),
);
const navigationIndex = computed<number>(() => {
  if (selectedAchi.value === undefined) return -1;
  return getNavigationIndex(navigationItems.value, selectedAchi.value);
});
const canNavigatePrevious = computed<boolean>(() => navigationIndex.value > 0);
const canNavigateNext = computed<boolean>(
  () => navigationIndex.value >= 0 && navigationIndex.value < navigationItems.value.length - 1,
);

onMounted(async () => await loadAchi());

watch(() => [props.search, isSearch.value], searchAchi);
watch(
  () => [series.value, props.uid],
  (next, previous) => {
    if (previous !== undefined && next[1] !== previous[1]) {
      dataRequestId += 1;
      achievements.value = [];
      expandedStageChains.value = new Set();
      recentNavigation.value = undefined;
      selectedAchi.value = undefined;
      showOverlay.value = false;
      isSearch.value = false;
    }
    void loadAchi();
  },
);
watch(
  () => props.recentAchievements,
  (items) => {
    if (recentNavigation.value === undefined) return;
    const previousItems = recentNavigation.value;
    const previousIndex =
      selectedAchi.value === undefined ? -1 : getNavigationIndex(previousItems, selectedAchi.value);
    recentNavigation.value = items;
    if (selectedAchi.value === undefined) return;
    const selected = items.find((item) => item.id === selectedAchi.value?.id);
    if (selected !== undefined) {
      selectedAchi.value = selected;
      return;
    }
    if (
      !previousItems.some((item) => item.id === selectedAchi.value?.id) &&
      getNavigationIndex(items, selectedAchi.value) !== -1
    ) {
      return;
    }
    const nextIndex = Math.min(Math.max(previousIndex, 0), items.length - 1);
    const next = items[nextIndex];
    if (next === undefined) {
      selectedAchi.value = undefined;
      showOverlay.value = false;
      return;
    }
    selectedAchi.value = next;
  },
  { flush: "sync" },
);
watch(
  renderAchi,
  (items) => {
    if (
      recentNavigation.value !== undefined &&
      (selectedAchi.value === undefined ||
        getNavigationIndex(recentNavigation.value, selectedAchi.value) !== -1)
    ) {
      return;
    }
    const selectedId = selectedAchi.value?.id;
    const selectedStageChainId =
      selectedId === undefined
        ? undefined
        : TSUserAchi.getAchievementStageChain(selectedId)?.[0]?.id;
    selectedAchi.value =
      items.find((item) => item.achievement.id === selectedId)?.achievement ??
      items.find((item) => item.stageChainId === selectedStageChainId)?.achievement ??
      items[0]?.achievement;
    if (selectedAchi.value === undefined) showOverlay.value = false;
  },
  { flush: "sync" },
);

function handleSearch(kw: string): void {
  searchWd.value = kw;
  showSearch.value = true;
}

function handleUserClick(user: TGApp.BBS.Post.User, gid: number): void {
  curGid.value = gid;
  curUid.value = user.uid;
  showUser.value = true;
}

async function searchAchi(): Promise<void> {
  if (!isSearch.value) return;
  const requestId = ++dataRequestId;
  const uid = props.uid;
  if (!props.search) {
    const currentSeries = series.value;
    const nextAchievements = await TSUserAchi.getAchievements(uid, currentSeries);
    if (requestId !== dataRequestId || uid !== props.uid || currentSeries !== series.value) return;
    achievements.value = nextAchievements;
    showSnackbar.success("已重置");
    isSearch.value = false;
    return;
  }
  if (props.search === "") {
    showSnackbar.warn("请输入搜索内容");
    isSearch.value = false;
    return;
  }
  const searchRes = await TSUserAchi.searchAchi(uid, props.search);
  if (requestId !== dataRequestId || uid !== props.uid) return;
  if (showOverlay.value) showOverlay.value = false;
  if (searchRes.length > 0) {
    ncData.value = undefined;
    achievements.value = searchRes;
    showSnackbar.success(`成功获取${achievements.value.length}条成就`);
    series.value = -1;
    await nextTick();
  } else {
    showSnackbar.warn("未搜索到相关成就");
  }
  isSearch.value = false;
}

async function loadAchi(showFeedback: boolean = true): Promise<void> {
  if (isSearch.value) return;
  const requestId = ++dataRequestId;
  const uid = props.uid;
  const currentSeries = series.value;
  const currentSearch = props.search;
  const nextAchievements =
    currentSeries === -1 && currentSearch
      ? await TSUserAchi.searchAchi(uid, currentSearch)
      : await TSUserAchi.getAchievements(uid, currentSeries);
  const ov = await TSUserAchi.getOverview(uid, currentSeries);
  if (
    requestId !== dataRequestId ||
    uid !== props.uid ||
    currentSeries !== series.value ||
    currentSearch !== props.search
  ) {
    return;
  }
  achievements.value = nextAchievements;
  isFinish.value = ov.fin === ov.total;
  const seriesFind = TSUserAchi.getAchievementCategoryById(series.value);
  if (!seriesFind || seriesFind.namecardId === null) {
    ncData.value = undefined;
  } else {
    const ncFind = AppNameCardsData.find((item) => item.id === seriesFind.namecardId);
    ncData.value = ncFind ?? undefined;
  }
  if (showFeedback) showSnackbar.success(`已获取 ${achievements.value.length} 条成就数据`);
}

async function handleAchiUpdated(): Promise<void> {
  await loadAchi(false);
}

function groupAchievementStages(
  items: Array<TGApp.App.Achievement.RenderItem>,
): Array<AchievementListItem> {
  const itemMap = new Map<number, TGApp.App.Achievement.RenderItem>(
    items.map((item) => [item.id, item]),
  );
  const visited = new Set<number>();
  const result: Array<AchievementListItem> = [];
  for (const item of items) {
    if (visited.has(item.id)) continue;
    const chain = TSUserAchi.getAchievementStageChain(item.id) ?? [item];
    const stageChainId = chain[0]?.id ?? item.id;
    const availableStages: Array<{
      achievement: TGApp.App.Achievement.RenderItem;
      stageIndex: number;
    }> = [];
    for (const [index, definition] of chain.entries()) {
      const achievement = itemMap.get(definition.id);
      if (achievement === undefined || visited.has(achievement.id)) continue;
      visited.add(achievement.id);
      availableStages.push({ achievement, stageIndex: index + 1 });
    }
    const currentStage =
      availableStages.find((stage) => !stage.achievement.isCompleted) ??
      availableStages[availableStages.length - 1];
    if (currentStage === undefined || !matchesAchievementFilters(currentStage.achievement))
      continue;
    const currentStageCompletedCount = currentStage.achievement.isCompleted
      ? currentStage.stageIndex
      : currentStage.stageIndex - 1;
    const expandable = availableStages.length > 1;
    const expanded = expandable && expandedStageChains.value.has(stageChainId);
    result.push({
      ...currentStage,
      completedStageCount: currentStageCompletedCount,
      stageChainId,
      stageCount: chain.length,
      isStageChild: false,
      expandable,
      expanded,
    });
    if (!expanded) continue;
    const currentStageIndex = availableStages.indexOf(currentStage);
    const otherStages = [
      ...availableStages.slice(currentStageIndex + 1),
      ...availableStages.slice(0, currentStageIndex).reverse(),
    ];
    for (const stage of otherStages) {
      result.push({
        ...stage,
        completedStageCount: Math.min(stage.stageIndex, currentStageCompletedCount),
        stageChainId,
        stageCount: chain.length,
        isStageChild: true,
        expandable: false,
        expanded: false,
      });
    }
  }
  if (series.value !== -1 && series.value !== 0 && series.value !== 17) return result;
  // 按显示阶段排序整组成就，避免其他阶段的完成时间影响位置或拆散展开项。
  const groups: Array<Array<AchievementListItem>> = [];
  for (const item of result) {
    if (item.isStageChild) groups[groups.length - 1].push(item);
    else groups.push([item]);
  }
  groups.sort((a, b) => {
    const first = a[0].achievement;
    const second = b[0].achievement;
    if (first.isCompleted !== second.isCompleted) {
      return Number(first.isCompleted) - Number(second.isCompleted);
    }
    if (!first.isCompleted) return 0;
    return second.completedTime.localeCompare(first.completedTime);
  });
  return groups.flat();
}

function matchesAchievementFilters(achievement: TGApp.App.Achievement.RenderItem): boolean {
  if (props.hideFin && achievement.isCompleted) return false;
  if (props.hiddenFilter === "hidden") return achievement.hidden;
  if (props.hiddenFilter === "visible") return !achievement.hidden;
  return true;
}

function toggleStageChain(stageChainId: number): void {
  const next = new Set(expandedStageChains.value);
  if (next.has(stageChainId)) {
    next.delete(stageChainId);
  } else {
    next.add(stageChainId);
  }
  expandedStageChains.value = next;
}

function selectAchi(data: TGApp.App.Achievement.RenderItem): void {
  recentNavigation.value = undefined;
  displayAchi(data);
}

function selectAchiFromOverlay(data: TGApp.App.Achievement.RenderItem): void {
  displayAchi(data);
}

function displayAchi(data: TGApp.App.Achievement.RenderItem): void {
  selectedAchi.value = data;
  showOverlay.value = true;
}

function selectRecentAchievement(data: TGApp.App.Achievement.RenderItem): void {
  const selected = props.recentAchievements.find((item) => item.id === data.id);
  if (selected === undefined || selected.uid !== props.uid) return;
  recentNavigation.value = props.recentAchievements;
  displayAchi(selected);
}

defineExpose({ selectRecentAchievement });

function selectSeries(data: number): void {
  if (series.value === data) {
    showSnackbar.warn("已经选中当前系列");
    return;
  }
  series.value = data;
}

function switchAchiInfo(next: boolean): void {
  if (selectedAchi.value === undefined) {
    showSnackbar.warn("当前未选中成就！");
    return;
  }
  const index = navigationIndex.value;
  if (index === -1) {
    showSnackbar.warn(
      `未找到选中成就 ${selectedAchi.value.name}(${selectedAchi.value.id}) 的索引！`,
    );
    return;
  }
  if (next) {
    const nextItem = navigationItems.value[index + 1];
    if (nextItem !== undefined) selectedAchi.value = nextItem;
    return;
  }
  const previousItem = navigationItems.value[index - 1];
  if (previousItem !== undefined) selectedAchi.value = previousItem;
}

function getNavigationIndex(
  items: ReadonlyArray<TGApp.App.Achievement.RenderItem>,
  achievement: TGApp.App.Achievement.RenderItem,
): number {
  const exactIndex = items.findIndex((item) => item.id === achievement.id);
  if (exactIndex !== -1) return exactIndex;
  const chainId = TSUserAchi.getAchievementStageChain(achievement.id)?.[0]?.id;
  if (chainId === undefined) return -1;
  return items.findIndex(
    (item) => TSUserAchi.getAchievementStageChain(item.id)?.[0]?.id === chainId,
  );
}
</script>
<style lang="scss" scoped>
.tua-al-container {
  display: flex;
  width: 100%;
  max-height: 100%;
  flex-direction: column;
  overflow-y: auto;
}

.tua-al-nc {
  margin-bottom: 8px;
}

.card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}
</style>
