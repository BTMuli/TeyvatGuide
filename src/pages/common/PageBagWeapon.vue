<!-- 背包武器页面 -->
<template>
  <v-app-bar :extension-height="56">
    <template #prepend>
      <div class="pbw-nav-prepend">
        <img alt="icon" src="/UI/nav/userBag.webp" />
        <span class="pbw-page-title">背包武器</span>
        <v-select
          v-model="curUid"
          :hide-details="true"
          :items="uidList"
          class="pbw-uid-select"
          density="compact"
          label="存档UID"
          variant="outlined"
        />
        <v-switch
          v-model="onlyEquipped"
          class="pbw-equipped-switch"
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          label="仅显示已装备"
        />
      </div>
    </template>
    <template #append>
      <div class="pbw-nav-append">
        <v-btn
          aria-label="通过 Yae 导入"
          class="pbw-ne-btn"
          prepend-icon="mdi-import"
          title="通过Yae导入（请确保导入前游戏未启动）"
          variant="elevated"
          @click="tryImportWeapon()"
          ><span class="pbw-action-label">导入</span></v-btn
        >
        <v-btn
          aria-label="新建存档"
          class="pbw-ne-btn"
          prepend-icon="mdi-plus"
          title="新建存档"
          variant="elevated"
          @click="createUid()"
          ><span class="pbw-action-label">新建存档</span></v-btn
        >
        <v-btn
          aria-label="删除存档"
          class="pbw-ne-btn"
          prepend-icon="mdi-delete"
          title="删除存档"
          variant="elevated"
          @click="deleteUid()"
          ><span class="pbw-action-label">删除存档</span></v-btn
        >
      </div>
    </template>
    <template #extension>
      <div class="pbw-secondary-tools">
        <v-text-field
          v-model="searchDraft"
          :clearable="true"
          :hide-details="true"
          append-inner-icon="mdi-magnify"
          autocomplete="off"
          class="pbw-nav-search"
          density="compact"
          label="搜索武器"
          variant="outlined"
          @click:clear="clearSearch()"
          @keydown.enter="submitSearch()"
          @click:append-inner="submitSearch()"
        />
        <v-btn-toggle
          v-model="viewMode"
          aria-label="武器背包视图"
          class="pbw-view-toggle"
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
          :class="{ 'pbw-filter-active': activeFilterCount > 0 }"
          aria-label="筛选武器"
          class="pbw-filter-btn"
          prepend-icon="mdi-filter-variant"
          title="筛选武器"
          variant="elevated"
          @click="showFilter = true"
          ><span class="pbw-filter-label">筛选</span>
          <span v-if="activeFilterCount > 0" class="pbw-filter-count">{{ activeFilterCount }}</span>
        </v-btn>
        <div v-if="viewMode === BagViewMode.Merged" class="pbw-group-status" aria-live="polite">
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
    class="pbw-container"
    role="listbox"
    aria-label="武器实例"
  >
    <PbWeaponItem
      v-for="weapon in visibleItems"
      :key="weapon.tb.guid"
      :avatar-id="equipAvatarMap.get(weapon.tb.guid)"
      :cur="curWeapon"
      :detail="showDetail"
      :info="weapon.info"
      :selected="weapon.tb.guid === curWeapon?.tb.guid"
      :tb="weapon.tb"
      @select="handleSelect"
    />
    <div v-if="visibleItems.length === 0" class="pbw-empty">当前条件下没有武器</div>
  </div>
  <div
    v-else-if="mergedLayout === MergedLayout.Grid"
    ref="groupGrid"
    class="pbw-group-grid"
    role="group"
    aria-label="武器分组"
  >
    <PbWeaponGroupItem
      v-for="group in visibleGroups"
      :key="group.key"
      :group
      :show-match-count="isFilteringActive"
      @select="openGroup"
    />
    <div v-if="visibleGroups.length === 0" class="pbw-empty">
      当前条件下没有武器分组，请调整筛选或搜索词
    </div>
  </div>
  <PbWeaponWorkspace
    v-model:selectedWeaponTypes="filterValue.weaponType"
    :allGroups="allGroups"
    v-else
    v-model:selected-group-key="selectedGroupKey"
    v-model:selected-instance-guid="selectedInstanceGuid"
    :equip-avatar-map="equipAvatarMap"
    :groups="visibleGroups"
    @back="backToGroups"
  />

  <PbWeaponDetail
    v-if="viewMode === BagViewMode.Individual && curWeapon"
    v-model:show="showDetail"
    :avatar-id="equipAvatarMap.get(curWeapon.tb.guid)"
    :cur="curWeapon"
  />
  <PbWeaponFilter v-model="showFilter" :value="filterValue" @filter="handleFilter" />
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PbWeaponDetail from "@comp/pageBag/pb-weapon-detail.vue";
import PbWeaponFilter, { type WeaponFilterValue } from "@comp/pageBag/pb-weapon-filter.vue";
import PbWeaponGroupItem from "@comp/pageBag/pb-weapon-group-item.vue";
import PbWeaponItem from "@comp/pageBag/pb-weapon-item.vue";
import PbWeaponWorkspace from "@comp/pageBag/pb-weapon-workspace.vue";
import TSUserBagAvatar from "@Sqlm/userBagAvatar.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { getWeaponRefineLevel, groupWeapons } from "@utils/userBagGroup.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import { wwWeapon } from "@/data/index.js";

const BagViewMode = <const>{ Individual: "individual", Merged: "merged" };
type BagViewModeEnum = (typeof BagViewMode)[keyof typeof BagViewMode];
const MergedLayout = <const>{ Grid: "grid", Workspace: "workspace" };
type MergedLayoutEnum = (typeof MergedLayout)[keyof typeof MergedLayout];
const WEAPON_VIEW_MODE_KEY = "bagWeaponViewMode";

const { isLogin } = storeToRefs(useAppStore());
const { account } = storeToRefs(useUserStore());
const curUid = ref<number>(0);
const searchDraft = ref<string>("");
const searchQuery = ref<string>("");
const viewMode = ref<BagViewModeEnum>(readViewMode());
const mergedLayout = ref<MergedLayoutEnum>(MergedLayout.Grid);
const selectedGroupKey = ref<string>();
const selectedInstanceGuid = ref<string>();
const showDetail = ref<boolean>(false);
const showFilter = ref<boolean>(false);
const onlyEquipped = ref<boolean>(false);
const uidList = shallowRef<Array<number>>([]);
const curWeapon = shallowRef<TGApp.App.UserBag.WeaponItem>();
const sourceItems = shallowRef<Array<TGApp.App.UserBag.WeaponItem>>([]);
const equipAvatarMap = shallowRef<Map<string, number>>(new Map());
const groupGrid = useTemplateRef<HTMLElement>("groupGrid");
const filterValue = ref<WeaponFilterValue>({
  star: [],
  weaponType: [],
  refine: [],
  subProp: [],
  locked: null,
});
let groupGridScrollTop = 0;
let lastGroupTriggerKey: string | undefined;

const filteredItems = computed<Array<TGApp.App.UserBag.WeaponItem>>(() =>
  sortWeapons(applyWeaponFilters(sourceItems.value)),
);
const visibleItems = computed<Array<TGApp.App.UserBag.WeaponItem>>(() =>
  filterWeaponSearch(filteredItems.value, searchQuery.value),
);
const allGroups = computed<Array<TGApp.App.UserBag.WeaponGroup>>(() =>
  groupWeapons(sourceItems.value, sourceItems.value, equipAvatarMap.value),
);
const visibleGroups = computed<Array<TGApp.App.UserBag.WeaponGroup>>(() =>
  groupWeapons(sourceItems.value, visibleItems.value, equipAvatarMap.value),
);
const isFilteringActive = computed<boolean>(() => {
  const filter = filterValue.value;
  return (
    onlyEquipped.value ||
    searchQuery.value !== "" ||
    filter.star.length > 0 ||
    filter.weaponType.length > 0 ||
    filter.refine.length > 0 ||
    filter.subProp.length > 0 ||
    filter.locked !== null
  );
});
const activeFilterCount = computed<number>(() => {
  const filter = filterValue.value;
  return [
    filter.star.length > 0,
    filter.weaponType.length > 0,
    filter.refine.length > 0,
    filter.subProp.length > 0,
    filter.locked !== null,
  ].filter(Boolean).length;
});

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
});
watch(curUid, async (uid) => await loadWeaponList(uid));
watch(viewMode, (value) => {
  localStorage.setItem(WEAPON_VIEW_MODE_KEY, value);
  showDetail.value = false;
  curWeapon.value = undefined;
  resetWorkspace();
});
watch(visibleGroups, () => reconcileWorkspaceSelection());

function readViewMode(): BagViewModeEnum {
  return localStorage.getItem(WEAPON_VIEW_MODE_KEY) === BagViewMode.Merged
    ? BagViewMode.Merged
    : BagViewMode.Individual;
}

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserBagWeapon.getAllUid();
  if (uidList.value.includes(Number(account.value.gameUid)))
    curUid.value = Number(account.value.gameUid);
  else if (uidList.value.length > 0) curUid.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [Number(account.value.gameUid)];
    curUid.value = Number(account.value.gameUid);
  } else curUid.value = 0;
}

function applyWeaponFilters(
  data: Array<TGApp.App.UserBag.WeaponItem>,
): Array<TGApp.App.UserBag.WeaponItem> {
  let result = data;
  if (onlyEquipped.value) result = result.filter((item) => equipAvatarMap.value.has(item.tb.guid));
  const filter = filterValue.value;
  if (filter.star.length > 0)
    result = result.filter((item) => filter.star.includes(item.info.star));
  if (filter.weaponType.length > 0)
    result = result.filter((item) => filter.weaponType.includes(item.info.weapon));
  if (filter.refine.length > 0)
    result = result.filter((item) => filter.refine.includes(getWeaponRefineLevel(item)));
  if (filter.subProp.length > 0)
    result = result.filter((item) =>
      item.info.curves.some((curve) => curve.curve !== 1101 && filter.subProp.includes(curve.prop)),
    );
  if (filter.locked !== null)
    result = result.filter((item) => item.tb.info.is_locked === filter.locked);
  return result;
}

function filterWeaponSearch(
  data: Array<TGApp.App.UserBag.WeaponItem>,
  query: string,
): Array<TGApp.App.UserBag.WeaponItem> {
  if (query === "") return data;
  return data.filter(
    (item) => item.info.name.includes(query) || item.info.description.includes(query),
  );
}

function handleFilter(value: WeaponFilterValue): void {
  filterValue.value = value;
  nextTick(() => {
    if (visibleItems.value.length === 0) showSnackbar.warn("未找到符合条件的武器!");
    else showSnackbar.success(`找到${visibleItems.value.length}条符合条件的武器`);
  });
}

function sortWeapons(
  data: Array<TGApp.App.UserBag.WeaponItem>,
): Array<TGApp.App.UserBag.WeaponItem> {
  return [...data].sort(
    (a, b) =>
      b.info.star - a.info.star ||
      a.info.weapon.localeCompare(b.info.weapon) ||
      a.info.id - b.info.id ||
      a.tb.guid.localeCompare(b.tb.guid),
  );
}

async function loadWeaponList(uid: number): Promise<void> {
  await showLoading.start(`正在加载 ${uid} 的武器数据`);
  sourceItems.value = [];
  clearPageStateForUid();
  equipAvatarMap.value = await TSUserBagAvatar.getEquipMap(uid);
  const records = await TSUserBagWeapon.getWeapon(uid);
  const items: Array<TGApp.App.UserBag.WeaponItem> = [];
  for (const weapon of records) {
    const info = wwWeapon.find((item) => item.id === weapon.id);
    if (info) items.push({ guid: weapon.guid, tb: weapon, info });
  }
  sourceItems.value = sortWeapons(items);
  await showLoading.end();
}

function submitSearch(): void {
  const query = searchDraft.value.trim();
  if (query === "") {
    if (searchQuery.value === "") showSnackbar.warn("请输入搜索内容!");
    else clearSearch();
    return;
  }
  const matches = filterWeaponSearch(filteredItems.value, query);
  if (matches.length === 0) {
    showSnackbar.warn("未找到符合条件的武器!");
    return;
  }
  searchQuery.value = query;
  showSnackbar.success(`找到${matches.length}条符合条件的武器`);
}

function clearSearch(): void {
  searchDraft.value = "";
  if (searchQuery.value === "") return;
  searchQuery.value = "";
  showSnackbar.success("已重置搜索");
}

async function tryImportWeapon(): Promise<void> {
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
  await TSUserBagWeapon.delUid(curUid.value);
  await reloadUid();
  showSnackbar.success("已删除对应存档，即将刷新");
}

function handleSelect(weapon: TGApp.App.UserBag.WeaponItem): void {
  curWeapon.value = weapon;
  showDetail.value = true;
}

function openGroup(groupKey: string): void {
  const group = visibleGroups.value.find((item) => item.key === groupKey);
  if (!group) return;
  groupGridScrollTop = window.scrollY;
  lastGroupTriggerKey = groupKey;
  selectedGroupKey.value = groupKey;
  selectedInstanceGuid.value = group.visibleItems[0]?.tb.guid;
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
  if (!group.visibleItems.some((item) => item.tb.guid === selectedInstanceGuid.value))
    selectedInstanceGuid.value = group.visibleItems[0]?.tb.guid;
}

function resetWorkspace(): void {
  mergedLayout.value = MergedLayout.Grid;
  selectedGroupKey.value = undefined;
  selectedInstanceGuid.value = undefined;
}

function clearPageStateForUid(): void {
  filterValue.value = { star: [], weaponType: [], refine: [], subProp: [], locked: null };
  searchDraft.value = "";
  searchQuery.value = "";
  curWeapon.value = undefined;
  showDetail.value = false;
  resetWorkspace();
}
</script>

<style lang="scss" scoped>
.pbw-nav-prepend,
.pbw-nav-append,
.pbw-secondary-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pbw-nav-prepend {
  margin-left: 8px;
}

.pbw-nav-prepend > img {
  width: 32px;
  height: 32px;
}

.pbw-page-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.pbw-uid-select {
  width: 200px;
}

.pbw-nav-append {
  margin-right: 12px;
}

.pbw-secondary-tools {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 16px;
}

.pbw-nav-search {
  min-width: 160px;
  max-width: 320px;
}

.pbw-view-toggle {
  display: inline-flex;
  overflow: hidden;
  height: 36px;
  flex: none;
  align-items: stretch;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.pbw-view-toggle :deep(.v-btn) {
  min-width: 40px;
  height: 34px;
  padding: 0 10px;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--box-text-4);
}

.pbw-view-toggle :deep(.v-btn + .v-btn) {
  border-inline-start: 1px solid var(--common-shadow-2) !important;
  margin-inline-start: 0;
}

.pbw-view-toggle :deep(.v-btn__overlay),
.pbw-view-toggle :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.pbw-view-toggle :deep(.v-btn.v-btn--active),
.pbw-view-toggle :deep(.v-btn.v-btn--selected),
.pbw-view-toggle :deep(.v-btn[aria-pressed="true"]) {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.pbw-filter-btn,
.pbw-ne-btn {
  height: 40px;
  flex: none;
  border-radius: 4px;
  font-family: var(--font-title);
  font-weight: normal;
}

.pbw-filter-btn {
  min-width: 92px;
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
  box-shadow: none;
  color: var(--app-page-content);
}

.pbw-filter-active {
  border-color: var(--tgc-yellow-3);
  background: var(--box-bg-4);
  color: var(--common-text-title);
}

.pbw-filter-count {
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

.pbw-ne-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.pbw-group-status {
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

.pbw-group-status strong {
  color: var(--common-text-title);
  font-weight: 600;
}

.pbw-container,
.pbw-group-grid {
  position: relative;
  display: grid;
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  gap: 12px;
}

.pbw-container {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.pbw-group-grid {
  padding: 12px;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
}

.pbw-empty {
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
  .pbw-action-label {
    display: none;
  }

  .pbw-ne-btn {
    min-width: 40px;
    padding: 0 8px;
  }
}

@media (width <= 839px) {
  .pbw-page-title,
  .pbw-filter-label,
  .pbw-equipped-switch :deep(.v-label) {
    display: none;
  }

  .pbw-nav-prepend {
    gap: 4px;
  }

  .pbw-uid-select {
    width: 116px;
  }

  .pbw-equipped-switch {
    width: 40px;
  }

  .pbw-secondary-tools {
    padding: 8px;
    gap: 4px;
  }

  .pbw-nav-search {
    min-width: 112px;
    flex: 1;
  }

  .pbw-filter-btn {
    min-width: 40px;
    padding: 0 8px;
  }

  .pbw-group-status {
    display: none;
  }
}

@media (width <= 479px) {
  .pbw-nav-prepend > img,
  .pbw-nav-append .pbw-ne-btn:nth-child(2) {
    display: none;
  }

  .pbw-container,
  .pbw-group-grid {
    padding: 8px;
  }
}
</style>
