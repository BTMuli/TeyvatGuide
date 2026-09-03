<template>
  <div class="tua-al-container">
    <div v-if="ncData !== undefined" class="tua-al-nc">
      <TopNameCard :data="ncData" :finish="isFinish" @selected="showNc = true" />
    </div>
    <v-virtual-scroll :item-height="60" :items="renderAchi" class="tua-al-list">
      <template #default="{ item }">
        <TuaAchi
          :data="item.achievement"
          :expandable="item.expandable"
          :expanded="item.expanded"
          :isStageChild="item.isStageChild"
          :stageCount="item.stageCount"
          :stageIndex="item.stageIndex"
          @select-achi="selectAchi"
          @toggle-stages="toggleStageChain(item.stageChainId)"
          @updated="handleAchiUpdated"
        />
      </template>
    </v-virtual-scroll>
    <ToNameCard v-if="ncData" v-model="showNc" :data="ncData" topOffset="112px" />
    <TuaAchiOverlay
      v-if="selectedAchi"
      v-model="showOverlay"
      :data="selectedAchi"
      @search="handleSearch"
      @select-series="selectSeries"
    >
      <template #left>
        <v-btn
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
          aria-label="下一个成就"
          class="card-arrow"
          icon="mdi-chevron-right"
          title="下一个成就"
          variant="flat"
          @click="switchAchiInfo(true)"
        />
      </template>
    </TuaAchiOverlay>
    <VpOverlaySearch topOffset="112px" v-model="showSearch" :gid="2" :keyword="searchWd" />
  </div>
</template>
<script lang="ts" setup>
import ToNameCard from "@comp/app/to-nameCard.vue";
import TopNameCard from "@comp/app/top-nameCard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import TSUserAchi from "@Sqlm/userAchi.js";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";

import TuaAchiOverlay from "./tua-achi-overlay.vue";
import TuaAchi from "./tua-achi.vue";

import { AppNameCardsData } from "@/data/index.js";

type TuaAchiListProps = {
  uid: number;
  hideFin: boolean;
  hiddenFilter: "all" | "hidden" | "visible";
  search?: string;
};
type AchievementListItem = {
  achievement: TGApp.App.Achievement.RenderItem;
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
const expandedStageChains = ref<Set<number>>(new Set());

const ncData = shallowRef<TGApp.App.NameCard.Item>();
const achievements = shallowRef<Array<TGApp.App.Achievement.RenderItem>>([]);
const selectedAchi = shallowRef<TGApp.App.Achievement.RenderItem>();

const renderAchi = computed<Array<AchievementListItem>>(() =>
  groupAchievementStages(achievements.value),
);

onMounted(async () => await loadAchi());

watch(() => [props.search, isSearch.value], searchAchi);
watch(
  () => [series.value, props.uid],
  async () => await loadAchi(),
);
watch(
  renderAchi,
  (items) => {
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

async function searchAchi(): Promise<void> {
  if (!isSearch.value) return;
  if (!props.search) {
    achievements.value = await TSUserAchi.getAchievements(props.uid, series.value);
    showSnackbar.success("已重置");
    isSearch.value = false;
    return;
  }
  if (props.search === "") {
    showSnackbar.warn("请输入搜索内容");
    isSearch.value = false;
    return;
  }
  const searchRes = await TSUserAchi.searchAchi(props.uid, props.search);
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
  achievements.value =
    series.value === -1 && props.search
      ? await TSUserAchi.searchAchi(props.uid, props.search)
      : await TSUserAchi.getAchievements(props.uid, series.value);
  const ov = await TSUserAchi.getOverview(props.uid, series.value);
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
    const maxStage = availableStages[availableStages.length - 1];
    if (maxStage === undefined || !matchesAchievementFilters(maxStage.achievement)) continue;
    const expandable = availableStages.length > 1;
    const expanded = expandable && expandedStageChains.value.has(stageChainId);
    result.push({
      ...maxStage,
      stageChainId,
      stageCount: chain.length,
      isStageChild: false,
      expandable,
      expanded,
    });
    if (!expanded) continue;
    for (let index = availableStages.length - 2; index >= 0; index -= 1) {
      result.push({
        ...availableStages[index],
        stageChainId,
        stageCount: chain.length,
        isStageChild: true,
        expandable: false,
        expanded: false,
      });
    }
  }
  return result;
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
  selectedAchi.value = data;
  showOverlay.value = true;
}

function selectSeries(data: number): void {
  series.value = data;
}

function switchAchiInfo(next: boolean): void {
  if (selectedAchi.value === undefined) {
    showSnackbar.warn("当前未选中成就！");
    return;
  }
  const index = renderAchi.value.findIndex(
    (item) => item.achievement.id === selectedAchi.value?.id,
  );
  if (index === -1) {
    showSnackbar.warn(
      `未找到选中成就 ${selectedAchi.value.name}(${selectedAchi.value.id}) 的索引！`,
    );
    return;
  }
  if (next) {
    if (index === renderAchi.value.length - 1) {
      showSnackbar.warn("已经是最后一个了");
      return;
    }
    selectedAchi.value = renderAchi.value[index + 1].achievement;
    return;
  }
  if (index === 0) {
    showSnackbar.warn("已经是第一个了");
    return;
  }
  selectedAchi.value = renderAchi.value[index - 1].achievement;
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

.tua-al-list {
  padding-right: 10px;
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
