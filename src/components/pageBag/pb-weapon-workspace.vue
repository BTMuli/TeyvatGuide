<!-- 背包武器合并视图工作台 -->
<template>
  <PbBagWorkspaceShell
    v-model:groupsOpen="groupsOpen"
    :detailOpen="detailOpen"
    :detailTitleId="detailTitleId"
    :groupsTitleId="groupsTitleId"
    :itemsTitleId="itemsTitleId"
  >
    <template #groups-header>
      <div class="pb-wws-heading">
        <h2 :id="groupsTitleId">武器分组</h2>
        <span>
          <template v-if="hasWeaponTypeFilter">
            {{ visibleGroups.length }} / {{ props.groups.length }} 组
          </template>
          <template v-else>{{ props.groups.length }} 组</template>
        </span>
      </div>
      <div class="pb-wws-groups-actions">
        <v-menu v-model="weaponTypeMenuOpen" :close-on-content-click="false" location="bottom end">
          <template #activator="{ props: activatorProps }">
            <button
              v-bind="activatorProps"
              :aria-label="
                hasWeaponTypeFilter
                  ? `武器类型筛选，已选 ${selectedWeaponTypes.length} 项`
                  : '武器类型筛选'
              "
              :aria-pressed="hasWeaponTypeFilter"
              :class="{ 'pb-wws-type-filter-active': hasWeaponTypeFilter }"
              class="pb-wws-icon-button pb-wws-type-filter"
              title="按武器类型筛选"
              type="button"
            >
              <v-icon aria-hidden="true" size="18">mdi-sword-cross</v-icon>
              <span v-if="hasWeaponTypeFilter" class="pb-wws-type-filter-count">
                {{ selectedWeaponTypes.length }}
              </span>
            </button>
          </template>
          <div class="pb-wws-type-menu">
            <div class="pb-wws-type-menu-header">
              <span>按武器类型筛选</span>
              <button
                :disabled="!hasWeaponTypeFilter"
                class="pb-wws-type-menu-clear"
                type="button"
                @click="clearWeaponTypeFilter"
              >
                清除
              </button>
            </div>
            <div class="pb-wws-type-options">
              <button
                v-for="weaponType in weaponTypeOptions"
                :key="weaponType.name"
                :aria-pressed="selectedWeaponTypes.includes(weaponType.name)"
                class="pb-wws-type-option"
                type="button"
                @click="toggleWeaponType(weaponType.name)"
              >
                <img :src="`/icon/weapon/${weaponType.name}.webp`" alt="" />
                <span class="pb-wws-type-option-name">{{ weaponType.name }}</span>
                <span class="pb-wws-type-option-count">{{ weaponType.count }}</span>
              </button>
            </div>
          </div>
        </v-menu>
        <button
          aria-label="返回全部分组"
          class="pb-wws-icon-button"
          title="返回全部分组"
          type="button"
          @click="backToGrid"
        >
          <v-icon aria-hidden="true" size="18">mdi-view-grid-outline</v-icon>
        </button>
      </div>
    </template>

    <template #groups>
      <div :aria-labelledby="groupsTitleId" class="pb-wws-groups-list" role="listbox">
        <template v-if="visibleGroups.length > 0">
          <button
            v-for="group in visibleGroups"
            :key="group.key"
            :aria-label="
              group.visibleCount < group.totalCount
                ? `${group.name}，${group.weaponType}，匹配 ${group.visibleCount} 件，共 ${group.totalCount} 件`
                : `${group.name}，${group.weaponType}，共 ${group.totalCount} 件`
            "
            :aria-selected="group.key === selectedGroup?.key"
            :class="[
              'pb-wws-group-option',
              { 'pb-wws-group-selected': group.key === selectedGroup?.key },
            ]"
            role="option"
            type="button"
            @click="selectGroup(group.key)"
          >
            <span class="pb-wws-group-icon" aria-hidden="true">
              <img :src="`/icon/bg/${group.star}-Star.webp`" alt="" class="pb-wws-group-bg" />
              <img
                :src="`/WIKI/weapon/${group.representative.info.id}.webp`"
                alt=""
                class="pb-wws-group-image"
              />
              <img
                :src="`/icon/weapon/${group.weaponType}.webp`"
                alt=""
                class="pb-wws-group-type-icon"
              />
            </span>
            <span class="pb-wws-group-copy">
              <span class="pb-wws-group-title-row"
                ><span class="pb-wws-group-name">{{ group.name }}</span>
                <span class="pb-wws-group-count">
                  <template v-if="group.visibleCount < group.totalCount">
                    <v-icon aria-hidden="true" size="12">mdi-filter-check-outline</v-icon>
                    <span>{{ group.visibleCount }} / {{ group.totalCount }}</span>
                  </template>
                  <span v-else>{{ group.totalCount }} 件</span>
                </span></span
              >
              <span class="pb-wws-group-summary">
                <span>{{ group.weaponType }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ group.star }}★</span>
              </span>
            </span>
          </button>
        </template>
        <div v-else class="pb-wws-empty">
          {{ hasWeaponTypeFilter ? "当前武器类型下没有分组" : "没有符合当前筛选条件的武器分组" }}
        </div>
      </div>
    </template>

    <template #items-header>
      <div class="pb-wws-items-heading">
        <div class="pb-wws-heading">
          <div class="pb-wws-title-row">
            <img
              v-if="selectedGroup"
              :src="`/icon/weapon/${selectedGroup.weaponType}.webp`"
              alt=""
              class="pb-wws-title-icon"
            />
            <h2 :id="itemsTitleId">{{ selectedGroup?.name ?? "武器" }}</h2>
            <span v-if="selectedGroup" class="pb-wws-count-tag">{{
              selectedGroup.totalCount
            }}</span>
          </div>
          <span v-if="selectedGroup && hasHiddenItems" class="pb-wws-match-summary">
            <template v-if="hasHiddenItems">
              <v-icon size="12">mdi-filter-check-outline</v-icon>
              <span>匹配</span>
              <strong>{{ selectedGroup.visibleCount }}</strong>
              <span>/ {{ selectedGroup.totalCount }} 件</span>
            </template>
          </span>
        </div>
        <div class="pb-wws-header-actions">
          <button
            v-if="hasHiddenItems"
            :aria-pressed="showMatchesOnly"
            aria-label="只显示匹配物品"
            class="pb-wws-header-button"
            type="button"
            @click="toggleMatchScope"
          >
            <v-icon aria-hidden="true" size="18">
              {{ showMatchesOnly ? "mdi-filter-check-outline" : "mdi-filter-off-outline" }}
            </v-icon>
            {{ showMatchesOnly ? "查看组内全部" : "仅看匹配" }}
          </button>
        </div>
      </div>
    </template>

    <template #items>
      <div class="pb-wws-items-panel">
        <div
          v-if="displayItems.length === 0"
          aria-live="polite"
          class="pb-wws-empty pb-wws-items-empty"
        >
          {{ selectedGroup ? "当前分组没有符合条件的物品" : "请选择一个武器分组" }}
        </div>
        <div v-else :aria-labelledby="itemsTitleId" class="pb-wws-item-list" role="listbox">
          <PbWeaponItem
            v-for="item in renderedItems"
            :key="item.guid"
            :avatarId="props.equipAvatarMap.get(item.guid)"
            :cur="selectedItem"
            :detail="true"
            :info="item.info"
            :selected="item.guid === selectedInstanceGuid"
            :tb="item.tb"
            @select="selectInstance"
          />
        </div>
        <button v-if="hasMoreItems" class="pb-wws-load-more" type="button" @click="loadMore">
          加载更多（每次 100 件）
        </button>
      </div>
    </template>

    <template #detail-header>
      <div class="pb-wws-detail-heading">
        <div class="pb-wws-heading">
          <div class="pb-wws-title-row">
            <img
              v-if="selectedItem"
              :src="`/icon/weapon/${selectedItem.info.weapon}.webp`"
              alt=""
              class="pb-wws-title-icon"
            />
            <h2 :id="detailTitleId">物品详情</h2>
          </div>
          <span v-if="selectedItem">
            Lv.{{ selectedItem.tb.info.level }} · 精炼{{ getWeaponRefineLevel(selectedItem) }}
          </span>
        </div>
        <div class="pb-wws-detail-actions">
          <button
            :disabled="!selectedItem || !detailVisible"
            aria-label="分享武器物品详情"
            class="pb-wws-icon-button"
            title="分享详情"
            type="button"
            @click="shareDetail"
          >
            <v-icon aria-hidden="true" size="18">mdi-share-variant-outline</v-icon>
          </button>
          <button
            :disabled="!canMovePrevious"
            aria-label="上一件武器"
            class="pb-wws-icon-button"
            title="上一件"
            type="button"
            @click="moveSelection(-1)"
          >
            <v-icon aria-hidden="true" size="20">mdi-chevron-left</v-icon>
          </button>
          <button
            :disabled="!canMoveNext"
            aria-label="下一件武器"
            class="pb-wws-icon-button"
            title="下一件"
            type="button"
            @click="moveSelection(1)"
          >
            <v-icon aria-hidden="true" size="20">mdi-chevron-right</v-icon>
          </button>
          <button
            aria-label="关闭物品详情"
            class="pb-wws-icon-button"
            title="关闭详情"
            type="button"
            @click="closeMobileDetail"
          >
            <v-icon aria-hidden="true" size="20">mdi-close</v-icon>
          </button>
        </div>
      </div>
    </template>

    <template #detail>
      <div v-if="selectedItem && detailVisible" class="pb-wws-detail-content">
        <PbWeaponDetailContent
          ref="detailContent"
          :avatarId="props.equipAvatarMap.get(selectedItem.guid)"
          :closeable="false"
          :cur="selectedItem"
          :showActions="false"
        />
      </div>
      <div v-else class="pb-wws-empty pb-wws-detail-empty">
        {{ selectedItem ? "详情已收起，选择任一物品可重新打开" : "请选择一个武器查看详情" }}
      </div>
    </template>
  </PbBagWorkspaceShell>
</template>

<script lang="ts" setup>
import PbBagWorkspaceShell from "@comp/pageBag/pb-bag-workspace-shell.vue";
import PbWeaponDetailContent from "@comp/pageBag/pb-weapon-detail-content.vue";
import PbWeaponItem from "@comp/pageBag/pb-weapon-item.vue";
import { getWeaponRefineLevel } from "@utils/userBagGroup.js";
import { computed, ref, useId, useTemplateRef, watch } from "vue";

type PbWeaponWorkspaceProps = {
  groups: Array<TGApp.App.UserBag.WeaponGroup>;
  allGroups: Array<TGApp.App.UserBag.WeaponGroup>;
  equipAvatarMap: ReadonlyMap<string, number>;
};

type WeaponTypeOption = {
  name: string;
  count: number;
};

const props = defineProps<PbWeaponWorkspaceProps>();
const emits = defineEmits<{ back: [] }>();
const selectedGroupKey = defineModel<string | undefined>("selectedGroupKey");
const selectedInstanceGuid = defineModel<string | undefined>("selectedInstanceGuid");

const ITEM_PAGE_SIZE = 100;
const componentId = useId();
const groupsTitleId = `${componentId}-groups-title`;
const itemsTitleId = `${componentId}-items-title`;
const detailTitleId = `${componentId}-detail-title`;
const groupsOpen = ref<boolean>(false);
const mobileDetailOpen = ref<boolean>(false);
const detailVisible = ref<boolean>(true);
const showMatchesOnly = ref<boolean>(true);
const renderedCount = ref<number>(ITEM_PAGE_SIZE);
const selectedWeaponTypes = defineModel<Array<string>>("selectedWeaponTypes", { required: true });
const weaponTypeMenuOpen = ref<boolean>(false);
const detailContent = useTemplateRef<{ share: () => Promise<void> }>("detailContent");

const weaponTypeOptions = computed<Array<WeaponTypeOption>>(() => {
  const counts = new Map<string, number>();
  for (const group of props.allGroups) {
    counts.set(group.weaponType, (counts.get(group.weaponType) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
});
const hasWeaponTypeFilter = computed<boolean>(() => selectedWeaponTypes.value.length > 0);
const visibleGroups = computed<Array<TGApp.App.UserBag.WeaponGroup>>(() => {
  if (!hasWeaponTypeFilter.value) return props.groups;
  const typeSet = new Set(selectedWeaponTypes.value);
  return props.groups.filter((group) => typeSet.has(group.weaponType));
});
const visibleGroupSignature = computed<string>(() =>
  visibleGroups.value.map((group) => group.key).join("\u0000"),
);
const selectedGroup = computed<TGApp.App.UserBag.WeaponGroup | undefined>(() => {
  const selected = visibleGroups.value.find((group) => group.key === selectedGroupKey.value);
  return selected ?? visibleGroups.value[0];
});
const displayItems = computed<Array<TGApp.App.UserBag.WeaponItem>>(() => {
  const group = selectedGroup.value;
  if (group === undefined) return [];
  return showMatchesOnly.value ? group.visibleItems : group.items;
});
const selectedItem = computed<TGApp.App.UserBag.WeaponItem | undefined>(() => {
  const group = selectedGroup.value;
  if (group === undefined) return undefined;
  const selected = group.items.find((item) => item.guid === selectedInstanceGuid.value);
  return selected ?? displayItems.value[0] ?? group.items[0];
});
const selectedIndex = computed<number>(() => {
  const guid = selectedItem.value?.guid;
  if (guid === undefined) return -1;
  return displayItems.value.findIndex((item) => item.guid === guid);
});
const renderedItems = computed<Array<TGApp.App.UserBag.WeaponItem>>(() =>
  displayItems.value.slice(0, renderedCount.value),
);
const hasMoreItems = computed<boolean>(() => renderedCount.value < displayItems.value.length);
const hasHiddenItems = computed<boolean>(
  () =>
    selectedGroup.value !== undefined &&
    selectedGroup.value.visibleCount < selectedGroup.value.totalCount,
);
const canMovePrevious = computed<boolean>(() => selectedIndex.value > 0);
const canMoveNext = computed<boolean>(
  () => selectedIndex.value >= 0 && selectedIndex.value < displayItems.value.length - 1,
);
const detailOpen = computed<boolean>(
  () => mobileDetailOpen.value && detailVisible.value && selectedItem.value !== undefined,
);

watch(
  () => [
    visibleGroupSignature.value,
    selectedGroupKey.value,
    selectedInstanceGuid.value,
    showMatchesOnly.value,
  ],
  normalizeSelection,
  { immediate: true },
);
watch(
  () => [selectedGroupKey.value, showMatchesOnly.value],
  () => {
    renderedCount.value = ITEM_PAGE_SIZE;
  },
);
watch(hasHiddenItems, (value) => {
  if (!value) showMatchesOnly.value = true;
});

function normalizeSelection(): void {
  const group = selectedGroup.value;
  if (group === undefined) {
    selectedGroupKey.value = undefined;
    selectedInstanceGuid.value = undefined;
    mobileDetailOpen.value = false;
    return;
  }
  if (selectedGroupKey.value !== group.key) selectedGroupKey.value = group.key;
  const item = displayItems.value.find(
    (candidate) => candidate.guid === selectedInstanceGuid.value,
  );
  if (item !== undefined) return;
  selectedInstanceGuid.value = getFirstItemGuid(group);
}

function getFirstItemGuid(group: TGApp.App.UserBag.WeaponGroup): string | undefined {
  return group.visibleItems[0]?.guid ?? group.items[0]?.guid;
}

function selectGroup(groupKey: string): void {
  const group = visibleGroups.value.find((candidate) => candidate.key === groupKey);
  if (group === undefined) return;
  selectedGroupKey.value = group.key;
  selectedInstanceGuid.value = getFirstItemGuid(group);
  showMatchesOnly.value = true;
  renderedCount.value = ITEM_PAGE_SIZE;
  mobileDetailOpen.value = false;
  detailVisible.value = true;
  groupsOpen.value = false;
}

function toggleWeaponType(weaponType: string): void {
  selectedWeaponTypes.value = selectedWeaponTypes.value.includes(weaponType)
    ? selectedWeaponTypes.value.filter((selected) => selected !== weaponType)
    : [...selectedWeaponTypes.value, weaponType];
  mobileDetailOpen.value = false;
}

function clearWeaponTypeFilter(): void {
  selectedWeaponTypes.value = [];
}

function toggleMatchScope(): void {
  showMatchesOnly.value = !showMatchesOnly.value;
}

function selectInstance(item: TGApp.App.UserBag.WeaponItem): void {
  if (!selectedGroup.value?.items.some((candidate) => candidate.guid === item.guid)) return;
  selectedInstanceGuid.value = item.guid;
  detailVisible.value = true;
  mobileDetailOpen.value = true;
}

function moveSelection(direction: -1 | 1): void {
  const items = displayItems.value;
  if (items.length === 0) return;
  const currentIndex = selectedIndex.value < 0 ? 0 : selectedIndex.value;
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), items.length - 1);
  if (nextIndex === currentIndex && selectedIndex.value >= 0) return;
  selectedInstanceGuid.value = items[nextIndex]?.guid;
  detailVisible.value = true;
  mobileDetailOpen.value = true;
}

function loadMore(): void {
  renderedCount.value += ITEM_PAGE_SIZE;
}

function closeMobileDetail(): void {
  detailVisible.value = false;
  mobileDetailOpen.value = false;
}

async function shareDetail(): Promise<void> {
  await detailContent.value?.share();
}

function backToGrid(): void {
  groupsOpen.value = false;
  mobileDetailOpen.value = false;
  emits("back");
}
</script>

<style lang="scss" scoped>
.pb-wws-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.pb-wws-heading h2 {
  overflow: hidden;
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wws-heading > span {
  color: var(--bag-text-secondary);
  font-size: 12px;
  line-height: 16px;
}

.pb-wws-groups-list,
.pb-wws-items-panel {
  display: flex;
  min-height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
}

.pb-wws-groups-list {
  min-height: 0;
}

.pb-wws-groups-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.pb-wws-group-option {
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

.pb-wws-group-icon {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  flex: none;
  border: 1px solid var(--bag-stroke);
  border-radius: 4px;
  background: var(--bag-surface);
}

.pb-wws-group-bg,
.pb-wws-group-image {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: contain;
}

.pb-wws-group-type-icon {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
}

.pb-wws-group-copy {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.pb-wws-group-option:hover {
  border-color: transparent;
  background: var(--bag-surface-hover);
}

.pb-wws-group-option:focus-visible {
  outline: 2px solid var(--bag-accent);
  outline-offset: -2px;
}

.pb-wws-group-name,
.pb-wws-group-summary {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wws-group-name {
  padding-right: 4px;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.pb-wws-group-summary {
  display: inline-flex;
  align-items: center;
  color: var(--bag-text-secondary);
  font-size: 12px;
  gap: 3px;
  line-height: 16px;
}

.pb-wws-group-count {
  display: inline-flex;
  flex: none;
  align-items: center;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--bag-text-secondary);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  white-space: nowrap;
}

.pb-wws-group-summary strong,
.pb-wws-match-summary strong {
  color: var(--bag-accent-text);
}

.pb-wws-match-summary {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.pb-wws-group-selected,
.pb-wws-group-selected:hover {
  border-color: transparent;
  background: var(--bag-surface-selected);
  box-shadow: inset 3px 0 var(--bag-accent);
}

.pb-wws-items-heading,
.pb-wws-detail-heading {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pb-wws-header-actions,
.pb-wws-detail-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.pb-wws-header-button,
.pb-wws-icon-button,
.pb-wws-load-more {
  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--bag-stroke);
  border-radius: 4px;
  background: var(--bag-surface);
  color: var(--bag-accent-text);
  cursor: pointer;
  font: inherit;
}

.pb-wws-header-button {
  min-height: 32px;
  flex: none;
  padding: 4px 8px;
  gap: 4px;
  white-space: nowrap;
}

.pb-wws-icon-button {
  position: relative;
  width: 32px;
  height: 32px;
  padding: 0;
  border-color: transparent;
  background: transparent;
  color: var(--app-page-content);
}

.pb-wws-type-filter-active {
  border-color: var(--common-text-title);
  background: var(--box-bg-4);
}

.pb-wws-type-filter-count {
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border-radius: 8px;
  background: var(--common-text-title);
  color: var(--app-page-bg);
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
}

.pb-wws-type-menu {
  width: 224px;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--common-shadow-4);
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  color: var(--app-page-content);
}

.pb-wws-type-menu-header {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.pb-wws-type-menu-clear,
.pb-wws-type-option {
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
}

.pb-wws-type-menu-clear {
  min-height: 28px;
  padding: 4px 6px;
  color: var(--common-text-title);
  font-size: 12px;
  line-height: 16px;
}

.pb-wws-type-menu-clear:disabled {
  cursor: default;
  opacity: 0.45;
}

.pb-wws-type-options {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pb-wws-type-option {
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

.pb-wws-type-option:hover,
.pb-wws-type-menu-clear:hover:not(:disabled) {
  background: var(--box-bg-3);
}

.pb-wws-type-option[aria-pressed="true"] {
  border-color: var(--common-text-title);
  background: var(--box-bg-4);
  box-shadow: inset 2px 0 var(--common-text-title);
  color: var(--common-text-title);
}

.pb-wws-type-option img {
  width: 20px;
  height: 20px;
  flex: none;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-wws-type-option-name {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wws-type-option-count {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.pb-wws-load-more {
  min-height: 36px;
  align-self: center;
  padding: 6px 12px;
}

.pb-wws-header-button:hover,
.pb-wws-icon-button:hover,
.pb-wws-load-more:hover {
  border-color: var(--bag-stroke-strong);
  background: var(--bag-surface-hover);
}

.pb-wws-header-button:focus-visible,
.pb-wws-icon-button:focus-visible,
.pb-wws-type-menu-clear:focus-visible,
.pb-wws-type-option:focus-visible,
.pb-wws-load-more:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.pb-wws-header-button:disabled,
.pb-wws-icon-button:disabled,
.pb-wws-load-more:disabled {
  cursor: default;
  opacity: 0.5;
}

.pb-wws-item-list {
  display: grid;
  min-width: 0;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
}

.pb-wws-item-list :deep(.pb-wi-box.detail) {
  filter: none;

  &.selected {
    border-color: var(--bag-accent);
    background: var(--bag-surface-selected);
  }

  &:focus-visible {
    outline-color: var(--bag-accent-text);
  }
}

.pb-wws-empty {
  display: grid;
  min-height: 128px;
  box-sizing: border-box;
  padding: 24px 16px;
  color: var(--bag-text-secondary);
  font-size: 14px;
  line-height: 20px;
  place-items: center center;
  text-align: center;
}

.pb-wws-items-empty,
.pb-wws-detail-empty {
  flex: 1;
}

.pb-wws-detail-content {
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pb-wws-header-button,
  .pb-wws-icon-button,
  .pb-wws-load-more {
    transition: none;
  }
}

.pb-wws-items-heading {
  flex-wrap: wrap;
  row-gap: 8px;
}

.pb-wws-detail-heading {
  flex-wrap: wrap;
}

.pb-wws-detail-actions {
  margin-left: auto;
}

.pb-wws-items-heading > div:first-child {
  flex: 1 1 160px;
}

.pb-wws-title-row,
.pb-wws-group-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.pb-wws-title-icon {
  width: 20px;
  height: 20px;
  flex: none;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-wws-count-tag {
  flex: none;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--bag-text-secondary);
  font-size: 12px;
  line-height: 20px;
}
</style>
