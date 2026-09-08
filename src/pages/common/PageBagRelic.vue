<!-- 背包圣遗物页面 -->
<template>
  <v-app-bar :extension-height="56">
    <template #prepend>
      <div class="pbr-nav-prepend">
        <img alt="icon" src="/UI/nav/userBag.webp" />
        <span class="pbr-page-title">背包圣遗物</span>
        <v-select
          v-model="curUid"
          :hide-details="true"
          :items="uidList"
          class="pbr-uid-select"
          density="compact"
          label="存档UID"
          variant="outlined"
        />
        <v-switch
          v-model="onlyEquipped"
          class="pbr-equipped-switch"
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          label="仅显示已装备"
        />
      </div>
    </template>
    <template #append>
      <div class="pbr-nav-append">
        <v-btn
          aria-label="通过 Yae 导入"
          class="pbr-ne-btn"
          prepend-icon="mdi-import"
          title="通过Yae导入（请确保导入前游戏未启动）"
          variant="elevated"
          @click="tryImportRelic()"
          ><span class="pbr-action-label">导入</span></v-btn
        >
        <v-btn
          aria-label="新建存档"
          class="pbr-ne-btn"
          prepend-icon="mdi-plus"
          title="新建存档"
          variant="elevated"
          @click="createUid()"
          ><span class="pbr-action-label">新建存档</span></v-btn
        >
        <v-btn
          aria-label="删除存档"
          class="pbr-ne-btn"
          prepend-icon="mdi-delete"
          title="删除存档"
          variant="elevated"
          @click="deleteUid()"
          ><span class="pbr-action-label">删除存档</span></v-btn
        >
      </div>
    </template>
    <template #extension>
      <div class="pbr-secondary-tools">
        <v-text-field
          v-model="searchDraft"
          :clearable="true"
          :hide-details="true"
          append-inner-icon="mdi-magnify"
          autocomplete="off"
          class="pbr-nav-search"
          density="compact"
          label="搜索圣遗物"
          variant="outlined"
          @click:clear="clearSearch()"
          @keydown.enter="submitSearch()"
          @click:append-inner="submitSearch()"
        />
        <v-btn-toggle
          v-model="viewMode"
          aria-label="圣遗物背包视图"
          class="pbr-view-toggle"
          color="var(--tgc-od-blue)"
          density="compact"
          :divided="false"
          mandatory
          variant="text"
        >
          <v-btn :value="BagViewMode.Individual" aria-label="单件视图" title="单件视图"
            ><v-icon size="16">mdi-view-grid</v-icon></v-btn
          >
          <v-btn :value="BagViewMode.Merged" aria-label="合并视图" title="合并视图"
            ><v-icon size="20">mdi-layers-triple-outline</v-icon></v-btn
          >
        </v-btn-toggle>
        <v-btn
          :class="{ 'pbr-filter-active': activeFilterCount > 0 }"
          aria-label="筛选圣遗物"
          class="pbr-filter-btn"
          prepend-icon="mdi-filter-variant"
          title="筛选圣遗物"
          variant="elevated"
          @click="showFilter = true"
          ><span class="pbr-filter-label">筛选</span>
          <span v-if="activeFilterCount > 0" class="pbr-filter-count">{{ activeFilterCount }}</span>
        </v-btn>
        <div v-if="viewMode === BagViewMode.Individual" class="pbr-load-status" aria-live="polite">
          <span
            >已显示 <strong>{{ visibleIndividualRelics.length }}</strong> /
            {{ visibleItems.length }}</span
          >
          <v-progress-linear
            :color="hasMoreRelics ? 'var(--tgc-od-blue)' : 'var(--tgc-od-green)'"
            :model-value="
              visibleItems.length ? (visibleIndividualRelics.length / visibleItems.length) * 100 : 0
            "
            bg-color="var(--common-shadow-2)"
            class="pbr-load-progress"
            height="4"
          />
        </div>
        <div v-else class="pbr-group-status" aria-live="polite">
          <v-icon size="14">
            {{ isFilteringActive ? "mdi-filter-check-outline" : "mdi-layers-triple-outline" }}
          </v-icon>
          <span v-if="isFilteringActive">
            匹配 <strong>{{ visibleGroups.length }}</strong> / {{ allGroups.length }} 组 ·
            <strong>{{ visibleItems.length }}</strong> / {{ sourceItems.length }} 件
          </span>
          <span v-else
            >共 <strong>{{ allGroups.length }}</strong> 组 · {{ sourceItems.length }} 件</span
          >
        </div>
      </div>
    </template>
  </v-app-bar>

  <div
    v-if="viewMode === BagViewMode.Individual"
    class="pbr-container"
    role="listbox"
    aria-label="圣遗物实例"
  >
    <PbRelicItem
      v-for="relic in visibleIndividualRelics"
      :key="relic.guid"
      :avatar-id="equipAvatarMap.get(relic.guid)"
      :detail="showDetail"
      :relic
      :selected="relic.guid === curRelic?.guid"
      @select="handleSelect"
    />
    <div v-if="hasMoreRelics" ref="loadMoreRef" class="pbr-load-trigger" />
    <div v-if="visibleItems.length === 0" class="pbr-empty">当前条件下没有圣遗物</div>
  </div>
  <div
    v-else-if="mergedLayout === MergedLayout.Grid"
    ref="groupGrid"
    class="pbr-group-grid"
    role="group"
    aria-label="圣遗物分组"
  >
    <PbRelicGroupItem
      v-for="group in visibleGroups"
      :key="group.key"
      :group
      :show-match-count="isFilteringActive"
      @select="openGroup"
    />
    <div v-if="visibleGroups.length === 0" class="pbr-empty">
      当前条件下没有圣遗物分组，请调整筛选或搜索词
    </div>
  </div>
  <PbRelicWorkspace
    v-model:selectedPositions="filterValue.slot"
    v-else
    v-model:selected-group-key="selectedGroupKey"
    v-model:selected-instance-guid="selectedInstanceGuid"
    :equip-avatar-map="equipAvatarMap"
    :groups="visibleGroups"
    @back="backToGroups"
  />

  <PbRelicDetail
    v-if="viewMode === BagViewMode.Individual && curRelic"
    v-model:show="showDetail"
    :avatar-id="equipAvatarMap.get(curRelic.guid)"
    :cur="curRelic"
  />
  <PbRelicFilter v-model="showFilter" :value="filterValue" @filter="handleFilter" />
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PbRelicDetail from "@comp/pageBag/pb-relic-detail.vue";
import PbRelicFilter, { type RelicFilterValue } from "@comp/pageBag/pb-relic-filter.vue";
import PbRelicGroupItem from "@comp/pageBag/pb-relic-group-item.vue";
import PbRelicItem from "@comp/pageBag/pb-relic-item.vue";
import PbRelicWorkspace from "@comp/pageBag/pb-relic-workspace.vue";
import TSUserBagAvatar from "@Sqlm/userBagAvatar.js";
import TSUserBagRelic from "@Sqlm/userBagRelic.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { groupRelics } from "@utils/userBagGroup.js";
import wikiUtils from "@utils/wikiUtils.js";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import { wrSet } from "@/data/index.js";

const BagViewMode = <const>{ Individual: "individual", Merged: "merged" };
type BagViewModeEnum = (typeof BagViewMode)[keyof typeof BagViewMode];
const MergedLayout = <const>{ Grid: "grid", Workspace: "workspace" };
type MergedLayoutEnum = (typeof MergedLayout)[keyof typeof MergedLayout];
const RELIC_VIEW_MODE_KEY = "bagRelicViewMode";
const RELIC_RENDER_SIZE: Readonly<number> = 100;
const relicSetNameMap = new Map<number, string>(wrSet.map((item) => [item.id, item.name]));

const { isLogin } = storeToRefs(useAppStore());
const { account } = storeToRefs(useUserStore());
const curUid = ref<number>(0);
const uidList = shallowRef<Array<number>>([]);
const searchDraft = ref<string>("");
const searchQuery = ref<string>("");
const viewMode = ref<BagViewModeEnum>(readViewMode());
const mergedLayout = ref<MergedLayoutEnum>(MergedLayout.Grid);
const selectedGroupKey = ref<string>();
const selectedInstanceGuid = ref<string>();
const showFilter = ref<boolean>(false);
const onlyEquipped = ref<boolean>(false);
const showDetail = ref<boolean>(false);
const curRelic = shallowRef<TGApp.Sqlite.UserBag.RelicTable>();
const sourceItems = shallowRef<Array<TGApp.Sqlite.UserBag.RelicTable>>([]);
const equipAvatarMap = shallowRef<Map<string, number>>(new Map());
const renderedCount = ref<number>(RELIC_RENDER_SIZE);
const loadMoreRef = useTemplateRef<HTMLElement>("loadMoreRef");
const groupGrid = useTemplateRef<HTMLElement>("groupGrid");
const filterValue = ref<RelicFilterValue>(createEmptyFilter());
let loadMoreObserver: IntersectionObserver | undefined;
let groupGridScrollTop = 0;
let lastGroupTriggerKey: string | undefined;

const filteredItems = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() =>
  sortRelics(applyRelicFilters(sourceItems.value)),
);
const visibleItems = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() =>
  filterRelicSearch(filteredItems.value, searchQuery.value),
);
const visibleIndividualRelics = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() =>
  visibleItems.value.slice(0, renderedCount.value),
);
const hasMoreRelics = computed<boolean>(() => renderedCount.value < visibleItems.value.length);
const allGroups = computed<Array<TGApp.App.UserBag.RelicGroup>>(() =>
  groupRelics(sourceItems.value, sourceItems.value, createGroupOptions()),
);
const visibleGroups = computed<Array<TGApp.App.UserBag.RelicGroup>>(() =>
  groupRelics(sourceItems.value, visibleItems.value, createGroupOptions()),
);
const isFilteringActive = computed<boolean>(() => {
  const filter = filterValue.value;
  return (
    onlyEquipped.value ||
    searchQuery.value !== "" ||
    filter.slot.length > 0 ||
    filter.star.length > 0 ||
    filter.set.length > 0 ||
    filter.mainProp.length > 0 ||
    filter.subProp.length > 0 ||
    filter.locked !== null ||
    filter.marked !== null ||
    filter.grade.length > 0
  );
});
const activeFilterCount = computed<number>(() => {
  const filter = filterValue.value;
  return [
    filter.slot.length > 0,
    filter.star.length > 0,
    filter.set.length > 0,
    filter.mainProp.length > 0,
    filter.subProp.length > 0,
    filter.locked !== null,
    filter.marked !== null,
    filter.grade.length > 0,
  ].filter(Boolean).length;
});

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
  initLoadMoreObserver();
});
onBeforeUnmount(() => loadMoreObserver?.disconnect());
watch(curUid, async (uid) => await loadRelicList(uid));
watch(visibleItems, () => resetRenderedRelics());
watch(viewMode, (value) => {
  localStorage.setItem(RELIC_VIEW_MODE_KEY, value);
  showDetail.value = false;
  curRelic.value = undefined;
  resetWorkspace();
  resetRenderedRelics();
});
watch(visibleGroups, () => reconcileWorkspaceSelection());

function readViewMode(): BagViewModeEnum {
  return localStorage.getItem(RELIC_VIEW_MODE_KEY) === BagViewMode.Merged
    ? BagViewMode.Merged
    : BagViewMode.Individual;
}

function createEmptyFilter(): RelicFilterValue {
  return {
    slot: [],
    star: [],
    set: [],
    mainProp: [],
    subProp: [],
    subPropMatchCount: 0,
    locked: null,
    marked: null,
    grade: [],
  };
}

function createGroupOptions(): {
  equipAvatarMap: ReadonlyMap<string, number>;
  setNameMap: ReadonlyMap<number, string>;
  getPositionName: (position: number) => string;
} {
  return {
    equipAvatarMap: equipAvatarMap.value,
    setNameMap: relicSetNameMap,
    getPositionName: getPositionName,
  };
}

function getPositionName(position: number): string {
  return wikiUtils.relic.pos(position) ?? `部位 ${position}`;
}

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserBagRelic.getAllUid();
  if (uidList.value.includes(Number(account.value.gameUid)))
    curUid.value = Number(account.value.gameUid);
  else if (uidList.value.length > 0) curUid.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [Number(account.value.gameUid)];
    curUid.value = Number(account.value.gameUid);
  } else curUid.value = 0;
}

function applyRelicFilters(
  data: Array<TGApp.Sqlite.UserBag.RelicTable>,
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  let result = data;
  const filter = filterValue.value;
  if (onlyEquipped.value) result = result.filter((item) => equipAvatarMap.value.has(item.guid));
  if (filter.slot.length > 0)
    result = result.filter((item) => filter.slot.includes(item.brief.pos));
  if (filter.star.length > 0)
    result = result.filter((item) => filter.star.includes(item.brief.star));
  if (filter.set.length > 0) result = result.filter((item) => filter.set.includes(item.sets));
  if (filter.mainProp.length > 0)
    result = result.filter((item) => filter.mainProp.includes(item.mp.type));
  if (filter.subProp.length > 0)
    result = result.filter((item) =>
      filter.subProp.every((propType) => item.sp.some((prop) => prop.type === propType)),
    );
  if (filter.locked !== null) result = result.filter((item) => item.is_locked === filter.locked);
  if (filter.marked !== null) result = result.filter((item) => item.is_marked === filter.marked);
  if (filter.grade.length > 0) result = result.filter(matchesRelicGrade);
  return result;
}

function matchesRelicGrade(item: TGApp.Sqlite.UserBag.RelicTable): boolean {
  const totalSubPropCount = item.sp.reduce((sum, prop) => sum + prop.vals.length, 0);
  return filterValue.value.grade.some((grade) => {
    if (grade === "init3") return item.level === 1 && totalSubPropCount === 3;
    if (grade === "init4") return item.level === 1 && totalSubPropCount === 4;
    if (grade === "enhance5") return item.level === 21 && totalSubPropCount === 9;
    if (grade === "enhance4") return item.level === 21 && totalSubPropCount === 8;
    return false;
  });
}

function sortRelics(
  data: Array<TGApp.Sqlite.UserBag.RelicTable>,
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  return [...data].sort(
    (a, b) =>
      b.brief.star - a.brief.star ||
      a.brief.pos - b.brief.pos ||
      b.level - a.level ||
      a.guid.localeCompare(b.guid),
  );
}

function filterRelicSearch(
  data: Array<TGApp.Sqlite.UserBag.RelicTable>,
  query: string,
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  if (query === "") return data;
  return data.filter(
    (item) =>
      item.id.toString().includes(query) ||
      item.level.toString().includes(query) ||
      item.brief.name.includes(query),
  );
}

function handleFilter(value: RelicFilterValue): void {
  filterValue.value = value;
  nextTick(() => {
    if (visibleItems.value.length === 0) showSnackbar.warn("未找到符合条件的圣遗物!");
    else showSnackbar.success(`筛选完成，共 ${visibleItems.value.length} 件圣遗物`);
  });
}

async function loadRelicList(uid: number): Promise<void> {
  await showLoading.start(`正在加载 ${uid} 的圣遗物数据`);
  sourceItems.value = [];
  clearPageStateForUid();
  equipAvatarMap.value = await TSUserBagAvatar.getEquipMap(uid);
  sourceItems.value = sortRelics(await TSUserBagRelic.getRelic(uid));
  await showLoading.end();
}

function submitSearch(): void {
  const query = searchDraft.value.trim();
  if (query === "") {
    if (searchQuery.value === "") showSnackbar.warn("请输入搜索内容!");
    else clearSearch();
    return;
  }
  const matches = filterRelicSearch(filteredItems.value, query);
  if (matches.length === 0) {
    showSnackbar.warn("未找到符合条件的圣遗物!");
    return;
  }
  searchQuery.value = query;
  showSnackbar.success(`找到${matches.length}条符合条件的圣遗物`);
}

function clearSearch(): void {
  searchDraft.value = "";
  if (searchQuery.value === "") return;
  searchQuery.value = "";
  showSnackbar.success("已重置搜索");
}

async function tryImportRelic(): Promise<void> {
  await tryCallYae(curUid.value.toString());
}

async function createUid(): Promise<void> {
  let uidDefault = "";
  if (account.value && !uidList.value.includes(Number(account.value.gameUid)))
    uidDefault = account.value.gameUid;
  const uidInput = await showDialog.input("请输入新存档UID", "UID:", uidDefault);
  if (uidInput === undefined || uidInput === false) {
    showSnackbar.cancel("已取消");
    return;
  }
  if (isNaN(Number(uidInput))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  if (uidList.value.includes(Number(uidInput))) {
    showSnackbar.warn("该存档已存在！");
    return;
  }
  uidList.value.push(Number(uidInput));
  curUid.value = Number(uidInput);
  showSnackbar.success(`切换到新存档 ${Number(uidInput)}`);
}

async function deleteUid(): Promise<void> {
  if (!curUid.value) {
    showSnackbar.warn("未检测到存档数据!");
    return;
  }
  const delCheck = await showDialog.check(
    "确定删除该存档?",
    `确认则清空存档-${curUid.value}对应数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消删除存档");
    return;
  }
  await TSUserBagRelic.delUid(curUid.value);
  await reloadUid();
  showSnackbar.success("已删除对应存档，即将刷新");
}

function resetRenderedRelics(): void {
  renderedCount.value = Math.min(RELIC_RENDER_SIZE, visibleItems.value.length);
  nextTick(() => observeLoadMore());
}

function loadMoreRelics(): void {
  if (hasMoreRelics.value)
    renderedCount.value = Math.min(
      renderedCount.value + RELIC_RENDER_SIZE,
      visibleItems.value.length,
    );
}

function initLoadMoreObserver(): void {
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRelics();
    },
    { rootMargin: "360px" },
  );
  observeLoadMore();
}

function observeLoadMore(): void {
  if (!loadMoreObserver || !loadMoreRef.value) return;
  loadMoreObserver.disconnect();
  loadMoreObserver.observe(loadMoreRef.value);
}

function handleSelect(relic: TGApp.Sqlite.UserBag.RelicTable): void {
  curRelic.value = relic;
  showDetail.value = true;
}

function openGroup(groupKey: string): void {
  const group = visibleGroups.value.find((item) => item.key === groupKey);
  if (!group) return;
  groupGridScrollTop = window.scrollY;
  lastGroupTriggerKey = groupKey;
  selectedGroupKey.value = groupKey;
  selectedInstanceGuid.value = group.visibleItems[0]?.guid;
  mergedLayout.value = MergedLayout.Workspace;
  showDetail.value = false;
  window.scrollTo({ top: 0 });
}

function backToGroups(): void {
  mergedLayout.value = MergedLayout.Grid;
  nextTick(() => {
    window.scrollTo({ top: groupGridScrollTop });
    const trigger = [
      ...(groupGrid.value?.querySelectorAll<HTMLElement>("[data-group-key]") ?? []),
    ].find((element) => element.dataset.groupKey === lastGroupTriggerKey);
    trigger?.focus();
  });
}

function reconcileWorkspaceSelection(): void {
  if (mergedLayout.value !== MergedLayout.Workspace) return;
  const group = visibleGroups.value.find((item) => item.key === selectedGroupKey.value);
  if (!group) {
    resetWorkspace();
    return;
  }
  if (!group.visibleItems.some((item) => item.guid === selectedInstanceGuid.value))
    selectedInstanceGuid.value = group.visibleItems[0]?.guid;
}

function resetWorkspace(): void {
  mergedLayout.value = MergedLayout.Grid;
  selectedGroupKey.value = undefined;
  selectedInstanceGuid.value = undefined;
}

function clearPageStateForUid(): void {
  filterValue.value = createEmptyFilter();
  searchDraft.value = "";
  searchQuery.value = "";
  curRelic.value = undefined;
  showDetail.value = false;
  resetWorkspace();
  resetRenderedRelics();
}
</script>

<style lang="scss" scoped>
.pbr-nav-prepend,
.pbr-nav-append,
.pbr-secondary-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pbr-nav-prepend {
  margin-left: 8px;
}

.pbr-nav-prepend > img {
  width: 32px;
  height: 32px;
}

.pbr-page-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.pbr-uid-select {
  width: 200px;
}

.pbr-nav-append {
  margin-right: 12px;
}

.pbr-secondary-tools {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 16px;
}

.pbr-nav-search {
  min-width: 160px;
  max-width: 320px;
}

.pbr-view-toggle {
  display: inline-flex;
  overflow: hidden;
  height: 36px;
  flex: none;
  align-items: stretch;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.pbr-view-toggle :deep(.v-btn) {
  min-width: 40px;
  height: 34px;
  padding: 0 10px;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--box-text-4);
}

.pbr-view-toggle :deep(.v-btn + .v-btn) {
  border-inline-start: 1px solid var(--common-shadow-2) !important;
  margin-inline-start: 0;
}

.pbr-view-toggle :deep(.v-btn__overlay),
.pbr-view-toggle :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.pbr-view-toggle :deep(.v-btn.v-btn--active),
.pbr-view-toggle :deep(.v-btn.v-btn--selected),
.pbr-view-toggle :deep(.v-btn[aria-pressed="true"]) {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.pbr-filter-btn,
.pbr-ne-btn {
  height: 40px;
  flex: none;
  border-radius: 4px;
  font-family: var(--font-title);
  font-weight: normal;
}

.pbr-filter-btn {
  min-width: 92px;
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
  box-shadow: none;
  color: var(--app-page-content);
}

.pbr-filter-active {
  border-color: var(--tgc-yellow-3);
  background: var(--box-bg-4);
  color: var(--common-text-title);
}

.pbr-filter-count {
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  margin-left: 6px;
  background: var(--tgc-yellow-3);
  color: var(--tgc-dark-8);
  font-family: var(--font-text);
  font-size: 12px;
  font-weight: 600;
}

.pbr-ne-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.pbr-load-status {
  display: flex;
  min-width: 160px;
  flex: 1;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  white-space: nowrap;
}

.pbr-load-status strong {
  color: var(--common-text-title);
  font-size: 14px;
}

.pbr-load-progress {
  min-width: 80px;
  max-width: 240px;
  flex: 1;
}

.pbr-group-status {
  display: inline-flex;
  min-height: 32px;
  flex: none;
  align-items: center;
  padding: 0 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin-left: auto;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  white-space: nowrap;
}

.pbr-group-status strong {
  color: var(--common-text-title);
  font-weight: 600;
}

.pbr-container,
.pbr-group-grid {
  position: relative;
  display: grid;
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  gap: 12px;
}

.pbr-container {
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

.pbr-group-grid {
  padding: 12px;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
}

.pbr-load-trigger {
  width: 100%;
  height: 1px;
  grid-column: 1 / -1;
}

.pbr-empty {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 14px;
  grid-column: 1 / -1;
  line-height: 20px;
  text-align: center;
}

@media (width <= 1179px) {
  .pbr-action-label {
    display: none;
  }

  .pbr-ne-btn {
    min-width: 40px;
    padding: 0 8px;
  }
}

@media (width <= 839px) {
  .pbr-page-title,
  .pbr-filter-label,
  .pbr-equipped-switch :deep(.v-label) {
    display: none;
  }

  .pbr-nav-prepend {
    gap: 4px;
  }

  .pbr-uid-select {
    width: 116px;
  }

  .pbr-equipped-switch {
    width: 40px;
  }

  .pbr-secondary-tools {
    padding: 8px;
    gap: 4px;
  }

  .pbr-nav-search {
    min-width: 112px;
    flex: 1;
  }

  .pbr-filter-btn {
    min-width: 40px;
    padding: 0 8px;
  }

  .pbr-load-status,
  .pbr-group-status {
    display: none;
  }
}

@media (width <= 479px) {
  .pbr-nav-prepend > img,
  .pbr-nav-append .pbr-ne-btn:nth-child(2) {
    display: none;
  }

  .pbr-container,
  .pbr-group-grid {
    padding: 8px;
  }
}
</style>
