<template>
  <div class="tua-al-container">
    <div v-if="nameCard && nameCardAchievements" class="tua-al-nc">
      <TopNameCard :data="nameCard" :finish="isFinish" @selected="showNc = true" />
    </div>
    <div
      v-if="searching && achievements !== undefined && renderAchi.length === 0"
      class="pa-4"
      role="status"
    >
      没有符合当前条件的成就
    </div>
    <v-virtual-scroll
      v-else
      :key="series"
      :item-height="60"
      :items="renderAchi"
      class="tua-al-list"
    >
      <template #default="{ item }">
        <TuaAchi
          :completedStageCount="item.completedStageCount"
          :data="item.achievement"
          :expandable="item.expandable"
          :expanded="item.expanded"
          :isStageChild="item.isStageChild"
          :stageCount="item.stageCount"
          :stageIndex="item.stageIndex"
          @updated="emits('updated')"
          @select-achi="selectAchi"
          @toggle-stages="toggleStageChain(item.stageChainId)"
        />
      </template>
    </v-virtual-scroll>
    <ToNameCard
      v-if="nameCard && nameCardAchievements"
      v-model="showNc"
      :data="nameCard"
      :achievementSeries="{
        uid: props.uid,
        name: TSUserAchi.getAchievementCategoryById(series)?.name ?? '成就系列',
        items: nameCardAchievements,
      }"
      topOffset="112px"
    />
    <TuaAchiOverlay
      v-if="selectedAchi"
      v-model="showOverlay"
      :data="selectedAchi"
      @search="handleSearch"
      @updated="emits('updated')"
      @select-achievement="selectAchiFromOverlay"
      @select-series="emits('select-series', $event)"
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
import { computed, ref, shallowRef, watch } from "vue";

import TuaAchiOverlay from "./tua-achi-overlay.vue";
import TuaAchi from "./tua-achi.vue";

import { AppNameCardsData } from "@/data/index.js";

/**
 * 成就列表组件属性。
 * @since Beta v0.13.0
 */
type TuaAchiListProps = {
  uid: number;
  series: number;
  hideFin: boolean;
  hiddenFilter: "all" | "hidden" | "visible";
  achievements?: Array<TGApp.App.Achievement.RenderItem>;
  recentAchievements: ReadonlyArray<TGApp.App.Achievement.RenderItem>;
  searching: boolean;
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
const emits = defineEmits<{ updated: []; "select-series": [seriesId: number] }>();

const showNc = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const searchWd = ref<string>();
const showSearch = ref<boolean>(false);
const showUser = ref<boolean>(false);
const curUid = ref<string>("");
const curGid = ref<number>(2);
const expandedStageChains = ref<Set<number>>(new Set());

const selectedAchi = shallowRef<TGApp.App.Achievement.RenderItem>();
const recentNavigation = shallowRef<ReadonlyArray<TGApp.App.Achievement.RenderItem>>();
const searchSeriesAchievements = shallowRef<Array<TGApp.App.Achievement.RenderItem>>();

const nameCard = computed<TGApp.App.NameCard.Item | undefined>(() => {
  const namecardId = TSUserAchi.getAchievementCategoryById(props.series)?.namecardId;
  return AppNameCardsData.find((item) => item.id === namecardId);
});
const nameCardAchievements = computed<Array<TGApp.App.Achievement.RenderItem> | undefined>(() => {
  if (props.searching) return searchSeriesAchievements.value;
  if (props.achievements?.[0]?.categoryId === props.series) return props.achievements;
  return undefined;
});
const isFinish = computed<boolean>(
  () => nameCardAchievements.value?.every((item) => item.isCompleted) ?? false,
);
const renderAchi = computed<Array<AchievementListItem>>(() =>
  groupAchievementStages(props.achievements ?? []),
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

watch(
  [() => props.searching, () => props.series, () => props.uid, () => props.achievements],
  async ([searching, series, uid], [wasSearching, previousSeries, previousUid], onCleanup) => {
    if (searching !== wasSearching || series !== previousSeries || uid !== previousUid) {
      showNc.value = false;
      searchSeriesAchievements.value = undefined;
    }
    if (!searching || nameCard.value === undefined) return;
    let stale = false;
    onCleanup(() => {
      stale = true;
    });
    const items = await TSUserAchi.getAchievements(uid, series);
    if (!stale) searchSeriesAchievements.value = items;
  },
  { immediate: true },
);

watch(
  () => props.uid,
  () => {
    expandedStageChains.value = new Set();
    recentNavigation.value = undefined;
    selectedAchi.value = undefined;
    showOverlay.value = false;
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

function groupAchievementStages(
  items: ReadonlyArray<TGApp.App.Achievement.RenderItem>,
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
  if (!props.searching && props.series !== -1 && props.series !== 0 && props.series !== 17) {
    return result;
  }
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
