<!-- 背包圣遗物合并视图工作台 -->
<template>
  <PbBagWorkspaceShell
    v-model:groupsOpen="groupsOpen"
    :detailOpen="detailOpen"
    :detailTitleId="detailTitleId"
    :groupsTitleId="groupsTitleId"
    :itemsTitleId="itemsTitleId"
  >
    <template #groups-header>
      <div class="pb-rw-heading">
        <h2 :id="groupsTitleId">圣遗物分组</h2>
        <span class="pb-rw-groups-count">{{ props.groups.length }} 组</span>
      </div>
      <button
        aria-label="返回全部分组"
        class="pb-rw-back"
        title="返回全部分组"
        type="button"
        @click="handleBack"
      >
        <v-icon aria-hidden="true" size="18">mdi-view-grid-outline</v-icon>
      </button>
    </template>

    <template #groups>
      <div aria-label="圣遗物分组" class="pb-rw-group-list" role="listbox">
        <button
          v-for="group in props.groups"
          :key="group.key"
          :aria-selected="group.key === currentGroup?.key"
          class="pb-rw-group-option"
          role="option"
          type="button"
          @click="selectGroup(group.key)"
        >
          <span class="pb-rw-group-icon">
            <img :src="`/icon/bg/${group.representative.brief.star}-Star.webp`" alt="" />
            <img
              :src="`/WIKI/relic/${group.representative.brief.icon}.webp`"
              :alt="group.setName"
            />
          </span>
          <span class="pb-rw-group-copy">
            <span class="pb-rw-group-title-row"
              ><span class="pb-rw-group-title">{{ group.setName }}</span>
              <span class="pb-rw-group-total">
                <template v-if="group.visibleCount < group.totalCount">
                  <v-icon aria-hidden="true" size="12">mdi-filter-check-outline</v-icon>
                  <span>{{ group.visibleCount }} / {{ group.totalCount }}</span>
                </template>
                <span v-else>{{ group.totalCount }} 件</span>
              </span></span
            >
            <span class="pb-rw-group-positions" aria-label="部位分布">
              <template
                v-for="(position, positionIndex) in group.positionCounts"
                :key="position.position"
              >
                <span class="pb-rw-group-position">
                  <img :src="`/icon/relic/${position.position}.webp`" alt="" />
                  <span>{{ position.count }}</span>
                </span>
                <span
                  v-if="positionIndex < group.positionCounts.length - 1"
                  aria-hidden="true"
                  class="pb-rw-group-position-separator"
                  >·</span
                >
              </template>
            </span>
          </span>
        </button>
        <p v-if="props.groups.length === 0" class="pb-rw-empty pb-rw-group-empty" role="status">
          暂无符合条件的分组
        </p>
      </div>
    </template>

    <template #items-header>
      <div class="pb-rw-items-heading">
        <div>
          <h2 :id="itemsTitleId">{{ currentGroup?.setName ?? "圣遗物分组" }}</h2>
          <span v-if="currentGroup" class="pb-rw-position-summary"
            ><span
              v-for="position in summaryPositions"
              :key="position.position"
              :title="position.name"
              :aria-label="position.name + ' ' + position.count"
              ><img :src="`/icon/relic/${position.position}.webp`" alt="" />{{
                position.count
              }}</span
            ><span class="pb-rw-items-count">{{ itemsSummary }}</span></span
          >
        </div>
        <div class="pb-rw-items-actions">
          <v-menu
            v-if="currentGroup"
            v-model="positionMenuOpen"
            :close-on-content-click="false"
            location="bottom end"
          >
            <template #activator="{ props: activatorProps }">
              <button
                v-bind="activatorProps"
                :aria-label="
                  hasPositionFilter ? `部件筛选，已选 ${selectedPositions.length} 项` : '部件筛选'
                "
                :aria-pressed="hasPositionFilter"
                :class="{ 'pb-rw-position-filter-active': hasPositionFilter }"
                class="pb-rw-position-filter"
                type="button"
              >
                <v-icon aria-hidden="true" size="16">mdi-shape-outline</v-icon>
                <span>部件</span>
                <span v-if="hasPositionFilter" class="pb-rw-position-filter-count">
                  {{ selectedPositions.length }}
                </span>
              </button>
            </template>
            <div class="pb-rw-position-menu">
              <div class="pb-rw-position-menu-header">
                <span>按部件筛选</span>
                <button
                  :disabled="!hasPositionFilter"
                  class="pb-rw-position-menu-clear"
                  type="button"
                  @click="clearPositionFilter"
                >
                  清除
                </button>
              </div>
              <div class="pb-rw-position-options">
                <button
                  v-for="position in positionOptions"
                  :key="position.position"
                  :aria-pressed="selectedPositions.includes(position.position)"
                  class="pb-rw-position-option"
                  type="button"
                  @click="togglePosition(position.position)"
                >
                  <img
                    :src="`/icon/relic/${position.position}.webp`"
                    :alt="position.name"
                    class="pb-rw-position-option-icon"
                  />
                  <span class="pb-rw-position-option-name">{{ position.name }}</span>
                  <span class="pb-rw-position-option-count">{{ position.count }}</span>
                </button>
              </div>
            </div>
          </v-menu>
          <div
            v-if="hasHiddenItems"
            aria-label="物品显示范围"
            class="pb-rw-view-toggle"
            role="group"
          >
            <button
              :aria-pressed="!showAllInGroup"
              class="pb-rw-toggle-btn"
              type="button"
              @click="setShowAll(false)"
            >
              只看匹配
            </button>
            <button
              :aria-pressed="showAllInGroup"
              class="pb-rw-toggle-btn"
              type="button"
              @click="setShowAll(true)"
            >
              查看组内全部
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #items>
      <div
        v-if="currentItems.length > 0"
        :aria-label="currentGroup ? `${currentGroup.setName}套装实例` : '圣遗物'"
        class="pb-rw-items-grid"
        role="listbox"
      >
        <PbRelicItem
          v-for="relic in renderedItems"
          :key="relic.guid"
          :avatarId="props.equipAvatarMap.get(relic.guid)"
          :detail="true"
          :relic
          :selected="relic.guid === selectedInstanceGuid"
          @select="selectInstance"
        />
      </div>
      <div v-else class="pb-rw-empty pb-rw-items-empty" role="status">
        <span>{{
          hasPositionFilter ? "当前部件筛选没有匹配的物品" : "当前分组没有符合条件的物品"
        }}</span>
        <div class="pb-rw-empty-actions">
          <button
            v-if="hasPositionFilter"
            class="pb-rw-empty-action"
            type="button"
            @click="clearPositionFilter"
          >
            清除部件筛选
          </button>
          <button
            v-if="currentGroup && !showAllInGroup && currentGroup.items.length > 0"
            class="pb-rw-empty-action"
            type="button"
            @click="setShowAll(true)"
          >
            查看组内全部
          </button>
        </div>
      </div>
      <button v-if="hasMoreItems" class="pb-rw-load-more" type="button" @click="loadMoreItems">
        加载更多（{{ currentItems.length - renderedItems.length }}）
      </button>
    </template>

    <template #detail-header>
      <div class="pb-rw-detail-heading">
        <div class="pb-rw-detail-copy">
          <div class="pb-rw-title-row">
            <img
              v-if="selectedInstance"
              :src="`/icon/relic/${selectedInstance.brief.pos}.webp`"
              :alt="getPositionName(selectedInstance.brief.pos)"
              class="pb-rw-title-icon"
            />
            <h2 :id="detailTitleId">{{ selectedInstance?.brief.name ?? "物品详情" }}</h2>
          </div>
          <span v-if="selectedInstance">
            Lv.{{ selectedInstance.level - 1 }} ·
            {{ getPositionName(selectedInstance.brief.pos) }}
          </span>
        </div>
        <div class="pb-rw-detail-actions">
          <button
            :disabled="!selectedInstance || !detailVisible"
            aria-label="分享圣遗物物品详情"
            class="pb-rw-icon-btn"
            title="分享详情"
            type="button"
            @click="shareDetail"
          >
            <v-icon size="18">mdi-share-variant-outline</v-icon>
          </button>
          <button
            :aria-label="'上一件圣遗物'"
            :disabled="!canNavigatePrevious"
            class="pb-rw-icon-btn"
            title="上一件"
            type="button"
            @click="navigateInstance(-1)"
          >
            <v-icon size="18">mdi-chevron-left</v-icon>
          </button>
          <button
            :aria-label="'下一件圣遗物'"
            :disabled="!canNavigateNext"
            class="pb-rw-icon-btn"
            title="下一件"
            type="button"
            @click="navigateInstance(1)"
          >
            <v-icon size="18">mdi-chevron-right</v-icon>
          </button>
          <button
            aria-label="关闭详情"
            class="pb-rw-icon-btn pb-rw-detail-close"
            title="关闭详情"
            type="button"
            @click="closeDetail"
          >
            <v-icon size="18">mdi-close</v-icon>
          </button>
        </div>
      </div>
    </template>

    <template #detail>
      <PbRelicDetailContent
        v-if="selectedInstance && detailVisible"
        ref="detailContent"
        :avatarId="props.equipAvatarMap.get(selectedInstance.guid)"
        :closable="false"
        :cur="selectedInstance"
        :showActions="false"
      />
      <div v-else class="pb-rw-empty pb-rw-detail-empty" role="status">
        <span>{{
          selectedInstance
            ? "详情已收起，选择任一物品可重新打开"
            : hasPositionFilter
              ? "当前部件筛选没有匹配的物品"
              : "当前分组没有符合条件的物品"
        }}</span>
        <div class="pb-rw-empty-actions">
          <button
            v-if="hasPositionFilter"
            class="pb-rw-empty-action"
            type="button"
            @click="clearPositionFilter"
          >
            清除部件筛选
          </button>
          <button
            v-if="currentGroup && !showAllInGroup && currentGroup.items.length > 0"
            class="pb-rw-empty-action"
            type="button"
            @click="setShowAll(true)"
          >
            查看组内全部
          </button>
        </div>
      </div>
    </template>
  </PbBagWorkspaceShell>
</template>

<script lang="ts" setup>
import PbBagWorkspaceShell from "@comp/pageBag/pb-bag-workspace-shell.vue";
import PbRelicDetailContent from "@comp/pageBag/pb-relic-detail-content.vue";
import PbRelicItem from "@comp/pageBag/pb-relic-item.vue";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, ref, useId, useTemplateRef, watch } from "vue";

type PbRelicWorkspaceProps = {
  groups: Array<TGApp.App.UserBag.RelicGroup>;
  equipAvatarMap: ReadonlyMap<string, number>;
};

type PbRelicWorkspaceEmits = { back: [] };

const props = defineProps<PbRelicWorkspaceProps>();
const emits = defineEmits<PbRelicWorkspaceEmits>();
const selectedGroupKey = defineModel<string | undefined>("selectedGroupKey");
const selectedInstanceGuid = defineModel<string | undefined>("selectedInstanceGuid");

const workspaceId = useId();
const groupsTitleId = `${workspaceId}-groups-title`;
const itemsTitleId = `${workspaceId}-items-title`;
const detailTitleId = `${workspaceId}-detail-title`;
const groupsOpen = ref<boolean>(false);
const showAllInGroup = ref<boolean>(false);
const mobileDetailOpen = ref<boolean>(false);
const detailVisible = ref<boolean>(true);
const renderedCount = ref<number>(100);
const selectedPositions = defineModel<Array<number>>("selectedPositions", { required: true });
const positionMenuOpen = ref<boolean>(false);
const detailContent = useTemplateRef<{ share: () => Promise<void> }>("detailContent");

const currentGroup = computed<TGApp.App.UserBag.RelicGroup | undefined>(() => {
  const selected = selectedGroupKey.value;
  return (
    (selected === undefined ? undefined : props.groups.find((group) => group.key === selected)) ??
    props.groups[0]
  );
});
const scopedItems = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() => {
  const group = currentGroup.value;
  if (group === undefined) return [];
  return showAllInGroup.value ? group.items : group.visibleItems;
});
const currentItems = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() => {
  if (selectedPositions.value.length === 0) return scopedItems.value;
  const positionSet = new Set(selectedPositions.value);
  return scopedItems.value.filter((item) => positionSet.has(item.brief.pos));
});
const renderedItems = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() =>
  currentItems.value.slice(0, renderedCount.value),
);
const selectedInstance = computed<TGApp.Sqlite.UserBag.RelicTable | undefined>(() =>
  currentItems.value.find((item) => item.guid === selectedInstanceGuid.value),
);
const selectedInstanceIndex = computed<number>(() => {
  if (selectedInstance.value === undefined) return -1;
  return currentItems.value.findIndex((item) => item.guid === selectedInstance.value?.guid);
});
const detailOpen = computed<boolean>(
  () => mobileDetailOpen.value && detailVisible.value && selectedInstance.value !== undefined,
);
const positionOptions = computed<Array<TGApp.App.UserBag.RelicPositionCount>>(() => {
  const group = currentGroup.value;
  if (group === undefined) return [];
  const scopedPositionCounts = new Map<number, number>();
  for (const item of group.items) {
    scopedPositionCounts.set(item.brief.pos, (scopedPositionCounts.get(item.brief.pos) ?? 0) + 1);
  }
  return group.positionCounts.map((position) => ({
    ...position,
    count: scopedPositionCounts.get(position.position) ?? 0,
  }));
});
const hasPositionFilter = computed<boolean>(() => selectedPositions.value.length > 0);
const summaryPositions = computed<Array<TGApp.App.UserBag.RelicPositionCount>>(() => {
  const counts = new Map<number, number>();
  for (const item of currentItems.value)
    counts.set(item.brief.pos, (counts.get(item.brief.pos) ?? 0) + 1);
  return positionOptions.value
    .filter((position) => counts.has(position.position))
    .map((position) => ({ ...position, count: counts.get(position.position) ?? 0 }));
});
const itemsSummary = computed<string>(() => {
  const countSummary = hasPositionFilter.value
    ? `显示 ${currentItems.value.length} / ${scopedItems.value.length} 件`
    : hasHiddenItems.value && !showAllInGroup.value
      ? `匹配 ${currentGroup.value?.visibleCount ?? 0} / ${currentGroup.value?.totalCount ?? 0}`
      : `${scopedItems.value.length} 件`;
  return countSummary;
});
const hasMoreItems = computed<boolean>(
  () => renderedItems.value.length < currentItems.value.length,
);
const hasHiddenItems = computed<boolean>(
  () =>
    currentGroup.value !== undefined &&
    currentGroup.value.visibleCount < currentGroup.value.totalCount,
);
const canNavigatePrevious = computed<boolean>(() => selectedInstanceIndex.value > 0);
const canNavigateNext = computed<boolean>(
  () =>
    selectedInstanceIndex.value >= 0 && selectedInstanceIndex.value < currentItems.value.length - 1,
);
const selectionSignature = computed<string>(() =>
  [
    currentGroup.value?.key ?? "",
    showAllInGroup.value ? "all" : "matching",
    selectedPositions.value.join(","),
    currentItems.value.map((item) => item.guid).join("\u0000"),
  ].join("\u0001"),
);

watch(
  selectionSignature,
  () => {
    renderedCount.value = Math.min(100, currentItems.value.length);
    syncSelection();
  },
  { immediate: true },
);
watch(hasHiddenItems, (value) => {
  if (!value) showAllInGroup.value = false;
});
watch(
  () => currentGroup.value?.key,
  () => {
    positionMenuOpen.value = false;
  },
);

function syncSelection(): void {
  mobileDetailOpen.value = false;
  const group = currentGroup.value;
  if (group === undefined) {
    selectedGroupKey.value = undefined;
    selectedInstanceGuid.value = undefined;
    return;
  }
  if (selectedGroupKey.value !== group.key) selectedGroupKey.value = group.key;
  const firstItem = currentItems.value[0];
  if (
    selectedInstanceGuid.value === undefined ||
    !currentItems.value.some((item) => item.guid === selectedInstanceGuid.value)
  ) {
    selectedInstanceGuid.value = firstItem?.guid;
  }
}

function selectGroup(groupKey: string): void {
  if (!props.groups.some((group) => group.key === groupKey)) return;
  selectedGroupKey.value = groupKey;
  selectedInstanceGuid.value = undefined;
  showAllInGroup.value = false;
  positionMenuOpen.value = false;
  mobileDetailOpen.value = false;
  detailVisible.value = true;
  groupsOpen.value = false;
}

function selectInstance(relic: TGApp.Sqlite.UserBag.RelicTable): void {
  if (!currentItems.value.some((item) => item.guid === relic.guid)) return;
  selectedInstanceGuid.value = relic.guid;
  detailVisible.value = true;
  mobileDetailOpen.value = true;
}

function setShowAll(value: boolean): void {
  showAllInGroup.value = value;
  mobileDetailOpen.value = false;
}

function togglePosition(position: number): void {
  selectedPositions.value = selectedPositions.value.includes(position)
    ? selectedPositions.value.filter((selected) => selected !== position)
    : [...selectedPositions.value, position];
}

function clearPositionFilter(): void {
  selectedPositions.value = [];
}

function loadMoreItems(): void {
  renderedCount.value = Math.min(renderedCount.value + 100, currentItems.value.length);
}

function navigateInstance(offset: number): void {
  const nextIndex = selectedInstanceIndex.value + offset;
  const nextItem = currentItems.value[nextIndex];
  if (nextItem !== undefined) {
    selectedInstanceGuid.value = nextItem.guid;
    detailVisible.value = true;
  }
}

function closeDetail(): void {
  detailVisible.value = false;
  mobileDetailOpen.value = false;
}

async function shareDetail(): Promise<void> {
  await detailContent.value?.share();
}

function getPositionName(position: number): string {
  return wikiUtils.relic.pos(position) ?? `部位 ${position}`;
}

function handleBack(): void {
  emits("back");
}
</script>

<style lang="scss" scoped>
.pb-rw-items-heading,
.pb-rw-detail-heading {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pb-rw-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.pb-rw-heading h2,
.pb-rw-items-heading h2,
.pb-rw-detail-heading h2 {
  overflow: hidden;
  min-width: 0;
  margin: 0;
  color: var(--app-page-content);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-rw-back,
.pb-rw-icon-btn,
.pb-rw-toggle-btn,
.pb-rw-empty-action,
.pb-rw-load-more {
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
}

.pb-rw-back {
  display: inline-flex;
  width: 32px;
  min-height: 32px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-color: transparent;
  background: transparent;
  color: var(--bag-accent-text);
  gap: 4px;
  white-space: nowrap;
}

.pb-rw-groups-count,
.pb-rw-items-count,
.pb-rw-group-total,
.pb-rw-group-positions {
  color: var(--bag-text-secondary);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.pb-rw-group-total,
.pb-rw-group-positions,
.pb-rw-group-position {
  display: inline-flex;
  align-items: center;
}

.pb-rw-group-total {
  flex: none;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--bag-text-secondary);
  gap: 4px;
}

.pb-rw-group-positions {
  overflow: hidden;
  gap: 4px;
  text-overflow: ellipsis;
}

.pb-rw-group-position {
  gap: 2px;
}

.pb-rw-group-position img {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-rw-group-position-separator {
  color: var(--bag-stroke-strong);
}

.pb-rw-group-total strong {
  color: var(--bag-accent-text);
}

.pb-rw-group-list {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}

.pb-rw-group-option {
  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  align-items: center;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--bag-surface);
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
  gap: 4px;
  grid-template-columns: 40px minmax(0, 1fr);
  text-align: left;
  transition: none;
}

.pb-rw-group-option:hover {
  border-color: transparent;
  background: var(--bag-surface-hover);
}

.pb-rw-group-option[aria-selected="true"] {
  border-color: transparent;
  background: var(--bag-surface-selected);
  box-shadow: inset 3px 0 var(--bag-accent);
}

.pb-rw-group-icon {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  flex: none;
  border: 1px solid var(--bag-stroke);
  border-radius: 4px;
  background: var(--bag-surface);
}

.pb-rw-group-icon > img {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: contain;
}

.pb-rw-group-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.pb-rw-group-title {
  overflow: hidden;
  padding-right: 4px;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-rw-items-heading > div:first-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.pb-rw-items-actions {
  display: flex;
  min-width: 0;
  flex: none;
  align-items: center;
  gap: 4px;
}

.pb-rw-view-toggle {
  display: flex;
  overflow: hidden;
  flex: none;
  border: 1px solid var(--bag-stroke);
  border-radius: 4px;
  background: var(--bag-surface);
}

.pb-rw-toggle-btn {
  display: inline-flex;
  min-width: 0;
  min-height: 32px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--bag-text-secondary);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.pb-rw-toggle-btn[aria-pressed="true"] {
  background: var(--bag-surface-selected);
  color: var(--bag-accent-text);
  font-weight: 600;
}

.pb-rw-position-filter,
.pb-rw-position-menu-clear,
.pb-rw-position-option {
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
}

.pb-rw-position-filter {
  display: inline-flex;
  min-height: 32px;
  box-sizing: border-box;
  align-items: center;
  padding: 4px 8px;
  border-color: var(--bag-stroke);
  background: var(--bag-surface);
  color: var(--bag-accent-text);
  gap: 4px;
  white-space: nowrap;
}

.pb-rw-position-filter-active {
  border-color: var(--bag-accent);
  background: var(--bag-surface-selected);
}

.pb-rw-position-filter-active:hover {
  background: var(--bag-surface-selected);
}

.pb-rw-position-filter-count {
  display: inline-flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border-radius: 8px;
  background: var(--bag-accent);
  color: var(--app-page-bg);
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
}

.pb-rw-position-menu {
  width: 224px;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--common-shadow-4);
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  color: var(--app-page-content);
}

.pb-rw-position-menu-header {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px;
  color: var(--app-page-content);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.pb-rw-position-menu-clear {
  min-height: 28px;
  padding: 4px 6px;
  color: var(--common-text-title);
  font-size: 12px;
  line-height: 16px;
}

.pb-rw-position-menu-clear:disabled {
  cursor: default;
  opacity: 0.45;
}

.pb-rw-position-options {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pb-rw-position-option {
  display: flex;
  width: 100%;
  min-height: 32px;
  box-sizing: border-box;
  align-items: center;
  padding: 4px 6px;
  border-color: var(--common-shadow-2);
  background: var(--app-page-bg);
  gap: 8px;
  text-align: left;
}

.pb-rw-position-menu-clear:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.pb-rw-position-option:hover,
.pb-rw-position-menu-clear:hover:not(:disabled) {
  background: var(--box-bg-3);
}

.pb-rw-position-option[aria-pressed="true"] {
  border-color: var(--common-text-title);
  background: var(--box-bg-4);
  box-shadow: inset 2px 0 var(--common-text-title);
  color: var(--common-text-title);
}

.pb-rw-position-option-icon {
  width: 20px;
  height: 20px;
  flex: none;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-rw-position-option-name {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-rw-position-option-count {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.pb-rw-items-grid {
  display: grid;
  padding: 12px;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
}

.pb-rw-items-grid :deep(.pb-ri-box.detail) {
  filter: none;

  &.selected {
    outline-color: var(--bag-accent);
  }

  &:focus-visible {
    outline-color: var(--bag-accent-text);
  }
}

.pb-rw-items-count {
  white-space: normal;
}

.pb-rw-load-more {
  display: block;
  min-height: 36px;
  padding: 4px 12px;
  border-color: var(--bag-stroke);
  margin: 0 auto 8px;
  color: var(--bag-accent-text);
  font-size: 12px;
  line-height: 16px;
}

.pb-rw-detail-heading {
  gap: 4px;
}

.pb-rw-detail-copy {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.pb-rw-detail-copy > span {
  overflow: hidden;
  color: var(--bag-text-secondary);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-rw-detail-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
}

.pb-rw-icon-btn {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
}

.pb-rw-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pb-rw-empty {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--bag-text-secondary);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
}

.pb-rw-group-empty {
  min-height: 80px;
}

.pb-rw-items-empty,
.pb-rw-detail-empty {
  flex-direction: column;
  gap: 8px;
}

.pb-rw-empty-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.pb-rw-empty-action {
  padding: 6px 10px;
  border-color: var(--bag-stroke);
  color: var(--bag-accent-text);
  font-size: 12px;
  line-height: 16px;
}

.pb-rw-back:focus-visible,
.pb-rw-icon-btn:focus-visible,
.pb-rw-toggle-btn:focus-visible,
.pb-rw-position-filter:focus-visible,
.pb-rw-position-option:focus-visible,
.pb-rw-empty-action:focus-visible,
.pb-rw-load-more:focus-visible,
.pb-rw-group-option:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.pb-rw-back:hover,
.pb-rw-icon-btn:hover:not(:disabled),
.pb-rw-toggle-btn:hover,
.pb-rw-position-filter:hover,
.pb-rw-empty-action:hover,
.pb-rw-load-more:hover {
  background: var(--bag-surface-hover);
}

@media (width <= 839px) {
  .pb-rw-items-grid {
    padding: 8px;
    gap: 8px;
  }

  .pb-rw-view-toggle {
    max-width: 50%;
  }

  .pb-rw-toggle-btn {
    overflow: hidden;
    padding: 4px 6px;
    text-overflow: ellipsis;
  }

  .pb-rw-position-filter {
    padding-inline: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pb-rw-back,
  .pb-rw-icon-btn,
  .pb-rw-toggle-btn,
  .pb-rw-empty-action,
  .pb-rw-load-more,
  .pb-rw-group-option {
    transition: none;
  }
}

.pb-rw-items-heading {
  flex-wrap: wrap;
  row-gap: 8px;
}

.pb-rw-detail-heading {
  flex-wrap: wrap;
}

.pb-rw-detail-actions {
  margin-left: auto;
}

.pb-rw-items-heading > div:first-child {
  flex: 1 1 160px;
}

.pb-rw-title-row,
.pb-rw-group-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.pb-rw-title-icon {
  width: 20px;
  height: 20px;
  flex: none;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-rw-count-tag {
  flex: none;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--bag-text-secondary);
  font-size: 12px;
  line-height: 20px;
}

.pb-rw-position-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pb-rw-position-summary > span {
  display: inline-flex;
  align-items: center;
  color: var(--bag-text-secondary);
  font-size: 12px;
  gap: 4px;
}

.pb-rw-position-summary img {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
}
</style>
