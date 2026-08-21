<!-- 用户角色列表 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uc-top-title">
        <img alt="icon" src="/UI/nav/userAvatar.webp" />
        <span>角色列表</span>
        <v-btn class="uc-top-btn" variant="elevated" @click="showSelect = true">筛选角色</v-btn>
        <v-btn class="uc-top-btn" variant="elevated" @click="resetList()">重置筛选</v-btn>
      </div>
    </template>
    <template #append>
      <div class="uc-top-btns">
        <v-btn
          v-model:loading="loadData"
          class="uc-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="refresh()"
        >
          刷新
        </v-btn>
        <v-btn
          :color="batchMode ? 'var(--tgc-od-orange)' : undefined"
          class="uc-top-btn"
          prepend-icon="mdi-playlist-plus"
          variant="elevated"
          @click="toggleBatchMode"
        >
          {{ batchMode ? "取消批量" : "批量养成" }}
        </v-btn>
        <v-btn
          v-if="batchMode"
          :disabled="batchSelectedIds.size === 0"
          class="uc-top-btn"
          prepend-icon="mdi-target"
          variant="elevated"
          @click="showBatchTarget = true"
        >
          设置目标（{{ batchSelectedIds.size }}）
        </v-btn>
        <v-btn
          v-model:loading="loadShare"
          :disabled="enableShare"
          class="uc-top-btn"
          prepend-icon="mdi-share"
          variant="elevated"
          @click="share()"
        >
          分享
        </v-btn>
        <v-btn
          v-model:loading="loadDel"
          :disabled="uidCur === undefined"
          class="uc-top-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteUid()"
        >
          删除
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="uc-extension">
        <div class="uc-select">
          <v-select
            v-model="cardLayout"
            :hide-details="true"
            :items="layoutList"
            class="uc-select-btn"
            density="compact"
            item-title="label"
            item-value="value"
            label="角色卡片布局"
            variant="outlined"
            width="200px"
          />
          <v-select
            :hide-details="true"
            :items="uidList"
            :model-value="uidCur"
            class="uc-select-btn"
            density="compact"
            label="当前UID"
            variant="outlined"
            width="200px"
            @update:model-value="handleUidChange"
          />
        </div>
        <div class="uc-sort">
          <v-btn
            :prepend-icon="getSortIcon(isLevelUp)"
            :title.attr="getSortDesc(isLevelUp)"
            class="uc-top-btn"
            variant="elevated"
            @click="isLevelUp = toggleSort(isLevelUp)"
          >
            等级
          </v-btn>
          <v-btn
            :prepend-icon="getSortIcon(isFetterUp)"
            :title.attr="getSortDesc(isFetterUp)"
            class="uc-top-btn"
            variant="elevated"
            @click="isFetterUp = toggleSort(isFetterUp)"
          >
            好感
          </v-btn>
          <v-btn
            :prepend-icon="getSortIcon(isConstUp)"
            :title.attr="getSortDesc(isConstUp)"
            class="uc-top-btn"
            variant="elevated"
            @click="isConstUp = toggleSort(isConstUp)"
          >
            命座
          </v-btn>
        </div>
      </div>
    </template>
  </v-app-bar>
  <div ref="rolesBox" :class="{ 'uc-box--sharing': loadShare }" class="uc-box">
    <div class="uc-box-info">
      <span>角色详情</span>
      <span>|</span>
      <span>TeyvatGuide v{{ version }}</span>
      <span>|</span>
      <span>更新于 {{ updateTimeText }}</span>
    </div>
    <div class="uc-box-top">
      <div class="uc-box-title">
        <TurRoleInfo v-if="roleRecord && uidCur" :role="roleRecord" :uid="uidCur" />
        <span v-else class="uc-box-uid">UID：{{ uidCur }}</span>
        <span
          v-for="item in roleOverview"
          :key="item.element"
          :title="`${item.label}：${item.cnt}`"
          class="uc-ov-item"
        >
          <img :src="`/icon/element/${item.label}.webp`" alt="element" />
          <template v-if="isSelected">
            <span>{{ selectedElementCnt.get(item.element) ?? 0 }}</span>
            <span class="uc-ov-cnt">/{{ item.cnt }}</span>
          </template>
          <span v-else>{{ item.cnt }}</span>
        </span>
      </div>
      <TuaSelectVals :isConstUp :isFetterUp :isLevelUp :isSelected :selectOpts />
    </div>
    <div class="uc-divider" />
    <div
      v-if="!isEmpty"
      :class="{ 'uc-grid--card': cardLayout === 'card' }"
      :style="cardGridStyle"
      class="uc-grid"
    >
      <div
        v-for="role in displayList"
        :key="role.cid"
        v-memo="[role, batchMode, batchSelectedIds.has(role.cid), cardLayout]"
        :class="{ selected: batchSelectedIds.has(role.cid) }"
        class="uc-avatar-select"
        @click="handleRoleClick(role)"
      >
        <TuaAvatarCard v-if="cardLayout === 'card'" :role />
        <TuaAvatarBox v-else :role />
        <v-checkbox-btn
          v-if="batchMode"
          :model-value="batchSelectedIds.has(role.cid)"
          class="uc-avatar-check"
          color="var(--tgc-od-orange)"
          data-html2canvas-ignore
          density="compact"
          @click.stop="toggleBatchRole(role.cid)"
        />
      </div>
      <div v-if="hasMoreRoles" ref="loadMoreRef" class="uc-load-trigger" />
    </div>
    <div v-else class="uc-empty">
      <img alt="empty" src="/UI/app/empty.webp" />
      <span>DATA NOT FOUND</span>
    </div>
  </div>
  <TuaDetailOverlay
    v-if="dataVal"
    v-model="showOverlay"
    :avatar="dataVal"
    :avatars="selectedList"
    @to-next="handleSwitch"
    @to-avatar="selectRole"
  />
  <UavSelect v-model:show="showSelect" :model-value="selectOpts" @select="handleSelect" />
  <UavBatchTarget
    v-model:show="showBatchTarget"
    :loading="batchSaving"
    :model-value="batchTarget"
    :selected-count="batchSelectedIds.size"
    @confirm="saveBatchToPlan"
  />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TuaAvatarBox from "@comp/userAvatar/tua-avatar-box.vue";
import TuaAvatarCard from "@comp/userAvatar/tua-avatar-card.vue";
import TuaDetailOverlay from "@comp/userAvatar/tua-detail-overlay.vue";
import TuaSelectVals from "@comp/userAvatar/tua-select-vals.vue";
import UavBatchTarget from "@comp/userAvatar/uav-batch-target.vue";
import UavSelect, { type UavSelectModel } from "@comp/userAvatar/uav-select.vue";
import TurRoleInfo from "@comp/userRecord/tur-role-info.vue";
import recordReq from "@req/recordReq.js";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserRecord from "@Sqlm/userRecord.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import { getRfAc } from "@utils/acUtils.js";
import { getUidServerTimezone } from "@utils/cultivationPlan.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import TGShare from "@utils/TGShare.js";
import { getZhElement, timestampToDate } from "@utils/toolFunc.js";
import userCalc from "@utils/userCalc.js";
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

import { AppCharacterData, getWikiCharacterById, wwWeapon } from "@/data/index.js";

type OverviewItem = { element: string; cnt: number; label: string };
type BatchTarget = {
  level: number;
  talentLevel: number;
  ascended: boolean;
  weapon: {
    enabled: boolean;
    level: number;
    ascended: boolean;
  };
};

const BATCH_EXCLUDED_CHARACTER_IDS = new Set([10000005, 10000007, 10000117, 10000118]);
const CHAR_RENDER_SIZE: Readonly<number> = 12;
const CARD_COL_WIDTH: Readonly<number> = 220;
const CARD_MAX_WIDTH: Readonly<number> = 280;
const CARD_MIN_GAP: Readonly<number> = 8;
const CARD_LAYOUT_KEY = "userAvatarCardLayout";
const AvatarCardLayout = <const>{
  Classic: "classic",
  Card: "card",
};
type AvatarCardLayoutEnum = (typeof AvatarCardLayout)[keyof typeof AvatarCardLayout];
type LayoutItem = { label: string; value: AvatarCardLayoutEnum };
const layoutList: Readonly<Array<LayoutItem>> = [
  { label: "经典视图", value: AvatarCardLayout.Classic },
  { label: "新版卡片", value: AvatarCardLayout.Card },
];
const appCharacterMap = new Map(AppCharacterData.map((item) => [item.id, item]));

function readCardLayout(): AvatarCardLayoutEnum {
  if (localStorage.getItem(CARD_LAYOUT_KEY) === AvatarCardLayout.Card) {
    return AvatarCardLayout.Card;
  }
  return AvatarCardLayout.Classic;
}

const { cookie, account } = storeToRefs(useUserStore());

const loadData = ref<boolean>(false);
const loadShare = ref<boolean>(false);
const loadDel = ref<boolean>(false);
const batchMode = ref<boolean>(false);
const batchSaving = ref<boolean>(false);
const batchTarget = ref<BatchTarget>({
  level: 80,
  talentLevel: 8,
  ascended: true,
  weapon: { enabled: false, level: 90, ascended: false },
});
const batchSelectedIds = ref<Set<number>>(new Set());

const version = ref<string>();
const isEmpty = ref<boolean>(true);
const showOverlay = ref<boolean>(false);
const selectIndex = ref<number>(0);
const showSelect = ref<boolean>(false);
const showBatchTarget = ref<boolean>(false);
const uidCur = ref<string>();
const cardLayout = ref<AvatarCardLayoutEnum>(readCardLayout());

// 排序
const isLevelUp = ref<boolean | null>(null);
const isFetterUp = ref<boolean | null>(null);
const isConstUp = ref<boolean | null>(null);
const selectOpts = ref<UavSelectModel>({
  costume: [],
  fetter: [],
  star: [],
  constellation: [],
  level: [],
  weapon: [],
  element: [],
  area: [],
  team: [],
});
const selectedList = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const renderedCount = ref<number>(0);
const rolesBox = useTemplateRef<HTMLElement>("rolesBox");
const loadMoreRef = useTemplateRef<HTMLElement>("loadMoreRef");
const cardColumnGap = ref<number>(CARD_MIN_GAP);
const cardColumnWidth = ref<number>(CARD_COL_WIDTH);
const cardColumns = ref<number>(1);
let loadMoreObserver: IntersectionObserver | undefined;
let cardGridObserver: ResizeObserver | undefined;
let cardGridRafId: number | undefined;
let cardGridWidth = 0;
let loadingMoreRoles = false;

const uidList = shallowRef<Array<string>>([]);
const roleRecord = shallowRef<TGApp.Game.Record.Role | undefined>();
const roleOverview = shallowRef<Array<OverviewItem>>([]);
const roleList = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const dataVal = shallowRef<TGApp.Sqlite.Character.TableTrans>();

let loadRoleSeq = 0;

const enableShare = computed<boolean>(
  () => showOverlay.value || showSelect.value || showBatchTarget.value || loadData.value,
);
const isSelected = computed<boolean>(() => selectedList.value.length !== roleList.value.length);
const updateTimeText = computed<string>(() => {
  if (roleList.value.length === 0) return "";
  let lastUpdateTime = 0;
  for (const role of roleList.value) {
    const updateTime = new Date(role.updated).getTime();
    if (updateTime > lastUpdateTime) lastUpdateTime = updateTime;
  }
  return timestampToDate(lastUpdateTime);
});
const selectedElementCnt = computed<Map<string, number>>(() => {
  const counts = new Map<string, number>();
  for (const role of selectedList.value) {
    counts.set(role.avatar.element, (counts.get(role.avatar.element) ?? 0) + 1);
  }
  return counts;
});
const displayList = computed<Array<TGApp.Sqlite.Character.TableTrans>>(() =>
  selectedList.value.slice(0, renderedCount.value),
);
const hasMoreRoles = computed<boolean>(() => renderedCount.value < selectedList.value.length);
const cardGridStyle = computed<Record<string, string>>(() => ({
  "--uc-card-column-gap": `${cardColumnGap.value}px`,
  "--uc-card-col-width": `${cardColumnWidth.value}px`,
  "--uc-card-columns": String(cardColumns.value),
}));

onMounted(async () => {
  await showLoading.start("正在获取角色数据");
  await TGLogger.Info("[Character][onMounted] 进入角色页面");
  const versionPromise = getVersion();
  await showLoading.update("正在加载角色数据", { timeout: 0 });
  await loadUid();
  version.value = await versionPromise;
  loadData.value = false;
  initLoadMoreObserver();
  await nextTick();
  observeCardGrid();
  await showLoading.end();
});

onBeforeUnmount(() => {
  loadMoreObserver?.disconnect();
  cardGridObserver?.disconnect();
  if (cardGridRafId !== undefined) cancelAnimationFrame(cardGridRafId);
});

watch(
  () => account.value,
  async () => await loadUid(),
);
watch(
  () => [isLevelUp.value, isFetterUp.value, isConstUp.value],
  () => {
    selectedList.value = getOrderedList(selectedList.value);
    clampRenderedRoles();
  },
);
watch(cardLayout, (value) => {
  localStorage.setItem(CARD_LAYOUT_KEY, value);
  updateCardColumnGap();
});
watch(
  () => displayList.value.length,
  () => updateCardColumnGap(),
);

function toggleSort(value: boolean | null): boolean | null {
  switch (value) {
    case true:
      return false;
    case false:
      return null;
    case null:
      return true;
  }
}

function getSortIcon(value: boolean | null): string {
  switch (value) {
    case true:
      return "mdi-arrow-up";
    case false:
      return "mdi-arrow-down";
    default:
      return "mdi-sort";
  }
}

function getSortDesc(value: boolean | null): string {
  switch (value) {
    case true:
      return "升序";
    case false:
      return "降序";
    default:
      return "默认排序";
  }
}

type CardGridMetrics = { columns: number; colWidth: number; gap: number };

function getCardGridMetrics(width: number, itemCount: number): CardGridMetrics {
  return getStretchGridMetrics(width, itemCount, CARD_MIN_GAP);
}

function getStretchGridMetrics(width: number, itemCount: number, minGap: number): CardGridMetrics {
  const columns = Math.max(1, Math.floor((width + minGap) / (CARD_COL_WIDTH + minGap)));
  if (columns <= 1) {
    return { columns: 1, colWidth: Math.min(CARD_MAX_WIDTH, width), gap: minGap };
  }
  if (itemCount < columns) return { columns, colWidth: CARD_COL_WIDTH, gap: minGap };
  const stretched = Math.floor((width - (columns - 1) * minGap) / columns);
  if (stretched <= CARD_MAX_WIDTH) {
    return { columns, colWidth: Math.max(CARD_COL_WIDTH, stretched), gap: minGap };
  }
  return {
    columns,
    colWidth: CARD_MAX_WIDTH,
    gap: Math.floor((width - columns * CARD_MAX_WIDTH) / (columns - 1)),
  };
}

function updateCardColumnGap(): void {
  if (cardGridWidth <= 0) return;
  const next = getCardGridMetrics(cardGridWidth, displayList.value.length);
  if (next.gap !== cardColumnGap.value) cardColumnGap.value = next.gap;
  if (next.colWidth !== cardColumnWidth.value) cardColumnWidth.value = next.colWidth;
  if (next.columns !== cardColumns.value) cardColumns.value = next.columns;
}

function observeCardGrid(): void {
  cardGridObserver?.disconnect();
  cardGridObserver = undefined;
  if (cardGridRafId !== undefined) {
    cancelAnimationFrame(cardGridRafId);
    cardGridRafId = undefined;
  }
  const box = rolesBox.value;
  if (!box) return;
  cardGridObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const width = Math.floor(entry.contentRect.width);
    if (width === cardGridWidth) return;
    cardGridWidth = width;
    if (cardGridRafId !== undefined) cancelAnimationFrame(cardGridRafId);
    cardGridRafId = requestAnimationFrame(() => {
      cardGridRafId = undefined;
      updateCardColumnGap();
    });
  });
  cardGridObserver.observe(box);
}

function resetRenderedRoles(): void {
  loadingMoreRoles = false;
  renderedCount.value = Math.min(CHAR_RENDER_SIZE, selectedList.value.length);
  nextTick(() => observeLoadMore());
}

function clampRenderedRoles(): void {
  renderedCount.value = Math.min(renderedCount.value, selectedList.value.length);
  nextTick(() => observeLoadMore());
}

async function loadMoreRoles(): Promise<void> {
  if (!hasMoreRoles.value || loadingMoreRoles) return;
  loadingMoreRoles = true;
  loadMoreObserver?.disconnect();
  renderedCount.value = Math.min(renderedCount.value + CHAR_RENDER_SIZE, selectedList.value.length);
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  loadingMoreRoles = false;
  observeLoadMore();
}

function initLoadMoreObserver(): void {
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMoreRoles();
    },
    { rootMargin: "180px" },
  );
  observeLoadMore();
}

function observeLoadMore(): void {
  if (!loadMoreObserver || !loadMoreRef.value || loadingMoreRoles) return;
  loadMoreObserver.disconnect();
  if (!hasMoreRoles.value) return;
  loadMoreObserver.observe(loadMoreRef.value);
}

function waitShareLayout(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function waitImageReady(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

async function waitForCardImages(root: HTMLElement): Promise<void> {
  const pending = Array.from(root.querySelectorAll("img"));
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(pending.map((img) => waitImageReady(img))),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 8000);
    }),
  ]);
}

function resetList(): void {
  isLevelUp.value = null;
  isFetterUp.value = null;
  isConstUp.value = null;
  selectOpts.value = {
    costume: [],
    fetter: [],
    star: [],
    constellation: [],
    level: [],
    weapon: [],
    element: [],
    team: [],
    area: [],
  };
  selectedList.value = getOrderedList(roleList.value);
  resetRenderedRoles();
  showSnackbar.success("已重置筛选条件");
  if (!dataVal.value) return;
  selectIndex.value = selectedList.value.indexOf(dataVal.value);
  if (selectIndex.value === -1) {
    dataVal.value = selectedList.value[0];
    selectIndex.value = 0;
  }
}

function toggleBatchMode(): void {
  batchMode.value = !batchMode.value;
  showBatchTarget.value = false;
  batchSelectedIds.value = new Set();
}

function toggleBatchRole(characterId: number): void {
  const next = new Set(batchSelectedIds.value);
  if (next.has(characterId)) next.delete(characterId);
  else next.add(characterId);
  batchSelectedIds.value = next;
}

function handleRoleClick(role: TGApp.Sqlite.Character.TableTrans): void {
  if (batchMode.value) {
    toggleBatchRole(role.cid);
    return;
  }
  selectRole(role);
}

async function createBatchPlanInput(
  role: TGApp.Sqlite.Character.TableTrans,
  target: BatchTarget,
): Promise<TGApp.Sqlite.Cultivation.SaveEntryInput | undefined> {
  if (BATCH_EXCLUDED_CHARACTER_IDS.has(role.cid)) return undefined;
  const wiki = await getWikiCharacterById(role.cid);
  if (!wiki) return undefined;
  const talentSkills = userCalc.recordTalentSkills(role, wiki);
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  const currentTalentLevels = userCalc.recordTalentLevels(role, wiki);
  const currentPromoteLevel = userCalc.resolvePromoteLevel(avatar.level, avatar.promote_level);
  const currentAscended = userCalc.isAscendedAtThreshold(avatar.level, currentPromoteLevel);
  const targetLevel = Math.max(avatar.level, target.level);
  const targetAscended =
    (targetLevel === avatar.level && currentAscended) ||
    (targetLevel === target.level && target.ascended);
  const targetTalentLevel = Math.min(
    target.talentLevel,
    userCalc.avatarTalentMaxLevel(targetLevel, targetAscended),
  );
  const targetTalents = talentSkills.map(({ recordSkill, wikiSkill }, index) => ({
    id: wikiSkill.id,
    name: recordSkill.name,
    level: Math.max(
      Math.min(currentTalentLevels[index] ?? recordSkill.level, 10),
      targetTalentLevel,
    ),
  }));
  const materials = userCalc.avatar(
    role,
    wiki,
    targetLevel,
    targetTalents.map((talent) => talent.level),
    currentPromoteLevel,
    targetAscended,
  );
  if (materials.length === 0) return undefined;
  return {
    allowCrafting: true,
    calculationMode: "bag",
    type: "avatar",
    itemId: role.cid,
    instanceKey: "",
    name: avatar.name,
    icon: `/WIKI/character/${role.cid}.webp`,
    star: wiki.star,
    currentState: {
      level: avatar.level,
      promoteLevel: currentPromoteLevel,
      ascended: currentAscended,
      talents: talentSkills.map(({ recordSkill, wikiSkill }, index) => ({
        id: wikiSkill.id,
        name: recordSkill.name,
        level: Math.min(currentTalentLevels[index] ?? recordSkill.level, 10),
      })),
    },
    targetState: {
      level: targetLevel,
      promoteLevel: userCalc.resolvePromoteLevel(
        targetLevel,
        undefined,
        userCalc.isAscensionLevel(targetLevel) ? targetAscended : undefined,
      ),
      ascended: targetAscended,
      talents: targetTalents,
    },
    items: materials.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
    useDust: false,
    useSolvent: false,
  };
}

function createBatchWeaponPlanInput(
  role: TGApp.Sqlite.Character.TableTrans,
  target: BatchTarget,
): TGApp.Sqlite.Cultivation.SaveEntryInput | undefined {
  const weapon = role.weapon;
  const wiki = wwWeapon.find((item) => item.id === weapon.id);
  if (!wiki) return undefined;
  const currentPromoteLevel = weapon.promote_level;
  const currentAscended = userCalc.isAscendedAtThreshold(weapon.level, currentPromoteLevel);
  const weaponMaxLevel = userCalc.weaponMaxLevel(wiki.star);
  const configuredTargetLevel = Math.min(target.weapon.level, weaponMaxLevel);
  const targetLevel = Math.max(weapon.level, configuredTargetLevel);
  const targetAscended =
    (targetLevel === weapon.level && currentAscended) ||
    (targetLevel === target.weapon.level && target.weapon.ascended);
  const materials = userCalc.weapon(
    wiki,
    weapon.level,
    currentPromoteLevel,
    targetLevel,
    targetAscended,
  );
  if (materials.length === 0) return undefined;
  return {
    allowCrafting: true,
    calculationMode: "bag",
    type: "weapon",
    itemId: weapon.id,
    instanceKey: `role-${role.cid}-${weapon.id}`,
    name: weapon.name,
    icon: `/WIKI/weapon/${weapon.id}.webp`,
    star: wiki.star,
    currentState: {
      level: weapon.level,
      promoteLevel: currentPromoteLevel,
      ascended: currentAscended,
      talents: [],
    },
    targetState: {
      level: targetLevel,
      promoteLevel: userCalc.resolvePromoteLevel(
        targetLevel,
        undefined,
        userCalc.isAscensionLevel(targetLevel) ? targetAscended : undefined,
      ),
      ascended: targetAscended,
      talents: [],
    },
    items: materials.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
    useDust: false,
    useSolvent: false,
  };
}

async function saveBatchToPlan(target: BatchTarget): Promise<void> {
  if (!uidCur.value || batchSelectedIds.value.size === 0 || batchSaving.value) return;
  const uid = Number(uidCur.value);
  batchTarget.value = target;
  batchSaving.value = true;
  try {
    const rolesToSave = roleList.value.filter((role) => batchSelectedIds.value.has(role.cid));
    const avatarInputs = (
      await Promise.all(rolesToSave.map(async (role) => await createBatchPlanInput(role, target)))
    ).filter((input): input is TGApp.Sqlite.Cultivation.SaveEntryInput => input !== undefined);
    const weaponInputs = target.weapon.enabled
      ? rolesToSave
          .map((role) => createBatchWeaponPlanInput(role, target))
          .filter((input): input is TGApp.Sqlite.Cultivation.SaveEntryInput => input !== undefined)
      : [];
    const inputs = [...avatarInputs, ...weaponInputs];
    if (inputs.length === 0) {
      showSnackbar.warn("所选角色与武器已达到养成目标，或暂不支持加入计划");
      return;
    }
    const project = await TSCultivationPlan.ensureCurrentProject(uid, getUidServerTimezone(uid));
    await TSCultivationPlan.saveEntries(project.id, inputs);
    const savedTargets: Array<string> = [];
    if (avatarInputs.length > 0) savedTargets.push(`${avatarInputs.length} 个角色`);
    if (weaponInputs.length > 0) savedTargets.push(`${weaponInputs.length} 件武器`);
    showSnackbar.success(`已将 ${savedTargets.join("、")}加入“${project.name}”`);
    showBatchTarget.value = false;
    batchMode.value = false;
    batchSelectedIds.value = new Set();
  } catch (error) {
    showSnackbar.error(`批量加入养成计划失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    batchSaving.value = false;
  }
}

function getOrderedList(
  data: Array<TGApp.Sqlite.Character.TableTrans>,
): Array<TGApp.Sqlite.Character.TableTrans> {
  return [...data].sort((a, b) => {
    if (a.avatar.actived_constellation_num !== b.avatar.actived_constellation_num) {
      if (isConstUp.value === true) {
        return a.avatar.actived_constellation_num - b.avatar.actived_constellation_num;
      } else if (isConstUp.value === false) {
        return b.avatar.actived_constellation_num - a.avatar.actived_constellation_num;
      }
    }
    if (a.avatar.fetter !== b.avatar.fetter) {
      if (isFetterUp.value === true) {
        return a.avatar.fetter - b.avatar.fetter;
      } else if (isFetterUp.value === false) {
        return b.avatar.fetter - a.avatar.fetter;
      }
    }
    if (a.avatar.level !== b.avatar.level) {
      if (isLevelUp.value === true) {
        return a.avatar.level - b.avatar.level;
      } else if (isLevelUp.value === false) {
        return b.avatar.level - a.avatar.level;
      }
    }
    if (a.avatar.rarity !== b.avatar.rarity) return b.avatar.rarity - a.avatar.rarity;
    if (a.avatar.element === b.avatar.element) return a.cid - b.cid;
    return a.avatar.element.localeCompare(b.avatar.element);
  });
}

function getOverview(data: Array<TGApp.Sqlite.Character.TableTrans>): Array<OverviewItem> {
  const counts = new Map<string, number>();
  for (const role of data) {
    counts.set(role.avatar.element, (counts.get(role.avatar.element) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([element, cnt]) => ({ element, cnt, label: `${getZhElement(element)}元素` }))
    .sort((a, b) => b.cnt - a.cnt);
}

async function hideAllOverlay(): Promise<void> {
  if (showBatchTarget.value) {
    showBatchTarget.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
  if (showSelect.value) {
    showSelect.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
  if (showOverlay.value) {
    showOverlay.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
}

function applyLoadedRoles(
  roleData: Array<TGApp.Sqlite.Character.TableTrans>,
  record: TGApp.Game.Record.Role | undefined,
): void {
  const ordered = getOrderedList(roleData);
  roleRecord.value = record;
  roleList.value = ordered;
  roleOverview.value = getOverview(ordered);
  selectedList.value = ordered;
  isEmpty.value = ordered.length === 0;
  resetRenderedRoles();
  if (ordered.length === 0) {
    dataVal.value = undefined;
    return;
  }
  const currentId = dataVal.value?.cid;
  const currentIndex =
    currentId === undefined ? -1 : ordered.findIndex((role) => role.cid === currentId);
  if (currentIndex >= 0) {
    selectIndex.value = currentIndex;
    dataVal.value = ordered[currentIndex];
    return;
  }
  const nextIndex = Math.min(Math.max(selectIndex.value, 0), ordered.length - 1);
  selectIndex.value = nextIndex;
  dataVal.value = ordered[nextIndex];
}

async function loadUid(): Promise<void> {
  await hideAllOverlay();
  uidList.value = await TSUserAvatar.getAllUid();
  if (uidList.value.length === 0) uidList.value = [account.value.gameUid];
  if (uidList.value.includes(account.value.gameUid)) {
    uidCur.value = account.value.gameUid;
  } else {
    uidList.value = [account.value.gameUid, ...uidList.value];
    uidCur.value = uidList.value[0];
  }
  await loadRole();
}

async function handleUidChange(uid: unknown): Promise<void> {
  if (typeof uid !== "string" || uid === uidCur.value) return;
  uidCur.value = uid;
  await hideAllOverlay();
  await showLoading.start("正在加载角色数据");
  try {
    await loadRole();
    await nextTick();
  } finally {
    await showLoading.end();
  }
}

async function loadRole(): Promise<void> {
  const seq = ++loadRoleSeq;
  const uid = uidCur.value;
  if (!uid) {
    isEmpty.value = true;
    return;
  }
  const [roleData, gameRole] = await Promise.all([
    TSUserAvatar.getAvatars(Number(uid)),
    TSUserRecord.getRecord(Number(uid)),
  ]);
  if (seq !== loadRoleSeq || uidCur.value !== uid) return;
  applyLoadedRoles(roleData, gameRole === false ? undefined : gameRole.role);
  await TGLogger.Info(`[Character][loadRole][${uid}] 成功加载角色数据`);
  await TGLogger.Info(`[Character][loadRole][${uid}] 共获取到${roleData.length}个角色`);
  showSnackbar.success(`成功加载${roleData.length}个角色`);
}

async function refresh(): Promise<void> {
  const refreshData = await getRfAc(uidCur.value, account.value, cookie.value, "Character.refresh");
  if (!refreshData) return;
  const { account: rfAccount, cookie: rfCk } = refreshData;
  await hideAllOverlay();
  await TGLogger.Info(`[Character][refresh][${rfAccount.gameUid}] 正在更新角色数据`);
  loadData.value = true;
  try {
    await showLoading.start(`正在更新${rfAccount.gameUid}的角色数据`);
    await showLoading.update("正在获取首页与角色列表", { timeout: 0 });
    const [indexResp, listResp] = await Promise.all([
      recordReq.index(rfCk!, rfAccount, 1),
      recordReq.character.list(rfCk!, rfAccount),
    ]);
    if (indexResp.retcode !== 0) {
      showSnackbar.error(`[${indexResp.retcode}] ${indexResp.message}`);
      await TGLogger.Warn(`[Characters][refresh] ${indexResp.retcode}-${indexResp.message}`);
      return;
    }
    if (listResp.retcode !== 0) {
      showSnackbar.error(`[${listResp.retcode}] ${listResp.message}`);
      await TGLogger.Warn(`[Character][refresh][${rfAccount.gameUid}] 获取角色列表失败`);
      await TGLogger.Warn(
        `[Character][refresh][${rfAccount.gameUid}] ${listResp.retcode} ${listResp.message}`,
      );
      return;
    }
    const idList = listResp.data.list.map((item) => item.id.toString());
    await showLoading.update(`共${idList.length}个角色，正在获取角色详情`);
    let details: Array<TGApp.Game.Avatar.AvatarDetail> = [];
    if (idList.length > 0) {
      const detailResp = await recordReq.character.detail(rfCk!, rfAccount, idList);
      if (detailResp.retcode !== 0) {
        showSnackbar.error(`[${detailResp.retcode}] ${detailResp.message}`);
        await TGLogger.Warn(`[Character][refresh][${rfAccount.gameUid}] 获取角色数据失败`);
        await TGLogger.Warn(
          `[Character][refresh][${rfAccount.gameUid}] ${detailResp.retcode} ${detailResp.message}`,
        );
        return;
      }
      details = detailResp.data.list;
    }
    await showLoading.update("正在保存角色数据", { timeout: 0 });
    const savedRoles = await TSUserAvatar.saveAvatars(rfAccount.gameUid, details);
    await TGLogger.Info(`[Character][refreshRoles][${rfAccount.gameUid}] 成功更新角色数据`);
    await TGLogger.Info(
      `[Character][refreshRoles][${rfAccount.gameUid}] 共更新${details.length}个角色`,
    );
    if (!uidList.value.includes(rfAccount.gameUid)) {
      uidList.value = [...uidList.value, rfAccount.gameUid];
    }
    uidCur.value = rfAccount.gameUid;
    applyLoadedRoles(savedRoles, indexResp.data.role);
    showSnackbar.success(`成功加载${savedRoles.length}个角色`);
    await nextTick();
  } catch (error) {
    const errMsg = TGHttps.getErrMsg(error);
    showSnackbar.error(`刷新角色数据异常: ${errMsg}`);
    await TGLogger.Error(`[Character][refresh][${rfAccount.gameUid}] 刷新角色数据异常`);
    await TGLogger.Error(`[Character][refresh][${rfAccount.gameUid}] ${error}`);
  } finally {
    await showLoading.end();
    loadData.value = false;
  }
}

async function share(): Promise<void> {
  if (!uidCur.value || isEmpty.value) {
    showSnackbar.warn("暂无数据");
    return;
  }
  await TGLogger.Info(`[Character][share][${uidCur.value}] 正在生成分享图片`);
  const box = rolesBox.value;
  if (!box) {
    showSnackbar.error("未找到角色列表");
    return;
  }
  if (selectedList.value.length > CHAR_RENDER_SIZE) {
    const confirmed = await showDialog.check(
      "角色较多",
      `将渲染 ${selectedList.value.length} 个角色生成分享图，可能较慢，是否继续？`,
    );
    if (!confirmed) {
      showSnackbar.cancel("已取消分享");
      return;
    }
  }
  const fileName = `角色列表_${uidCur.value}`;
  const prevCount = renderedCount.value;
  const total = selectedList.value.length;
  let progressAt = 0;

  function reportShareProgress(progress: {
    phase: "snapshot" | "bake" | "capture";
    current: number;
    total: number;
  }): void {
    const isTail = progress.current >= progress.total;
    const now = performance.now();
    if (!isTail && now - progressAt < 80) return;
    progressAt = now;
    if (progress.phase === "snapshot") {
      void showLoading.update("正在截取背景", { title: "正在烘焙毛玻璃", timeout: 0 });
      return;
    }
    if (progress.phase === "bake") {
      void showLoading.update(`${progress.current}/${progress.total}`, {
        title: "正在烘焙毛玻璃",
        timeout: 0,
      });
      return;
    }
    void showLoading.update(`${progress.current}/${progress.total}`, {
      title: "正在生成图片",
      timeout: 0,
    });
  }

  await showLoading.start("正在准备角色卡片", fileName, 0);
  loadShare.value = true;
  try {
    let nextCount = Math.min(Math.max(prevCount, CHAR_RENDER_SIZE), total);
    renderedCount.value = nextCount;
    await nextTick();
    await waitShareLayout();
    while (nextCount < total) {
      nextCount = Math.min(nextCount + CHAR_RENDER_SIZE, total);
      renderedCount.value = nextCount;
      await showLoading.update(`正在渲染角色 ${nextCount}/${total}`, { timeout: 0 });
      await nextTick();
      await waitShareLayout();
    }
    await waitForCardImages(box);
    await showLoading.update("正在生成图片", { timeout: 0 });
    await TGShare.modern(fileName, box, 1, false, {
      bakeBackdrop: true,
      onProgress: reportShareProgress,
    });
    await TGLogger.Info(`[Character][share][${uidCur.value}] 生成分享图片成功`);
  } finally {
    loadShare.value = false;
    renderedCount.value = prevCount;
    await nextTick();
    observeLoadMore();
    await showLoading.end();
  }
}

async function deleteUid(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar.warn("未找到当前UID");
    return;
  }
  const delCheck = await showDialog.check("确定删除？", `将删除${uidCur.value}对应的角色数据`);
  if (!delCheck) {
    showSnackbar.cancel("已取消删除");
    return;
  }
  await TSUserAvatar.deleteUid(uidCur.value);
  showSnackbar.success(`成功删除${uidCur.value}的角色数据`);
  await loadUid();
}

function selectRole(role: TGApp.Sqlite.Character.TableTrans): void {
  dataVal.value = role;
  selectIndex.value = selectedList.value.indexOf(role);
  if (!showOverlay.value) showOverlay.value = true;
}

function handleSelect(val: UavSelectModel): void {
  const filterC = roleList.value.filter((role) => {
    const info = appCharacterMap.get(role.cid);
    if (val.star.length > 0 && !val.star.includes(role.avatar.rarity.toString())) return false;
    if (
      val.constellation.length > 0 &&
      !val.constellation.includes(role.avatar.actived_constellation_num.toString())
    )
      return false;
    if (
      val.level.length > 0 &&
      !val.level.some((level) => isLevelMatched(level, role.avatar.level))
    )
      return false;
    if (val.fetter.length > 0) {
      if (!val.fetter.includes("true") && role.avatar.fetter === 10) return false;
      if (!val.fetter.includes("false") && role.avatar.fetter !== 10) return false;
    }
    if (val.weapon.length > 0 && !val.weapon.includes(role.weapon.type_name)) return false;
    if (val.element.length > 0 && !val.element.includes(getZhElement(role.avatar.element)))
      return false;
    if (val.area.length > 0 && !val.area.includes(info?.area ?? "")) return false;
    if (val.costume.length > 0) {
      if (val.costume.length === 2) return true;
      const hasCostume = role.costumes.some((c) =>
        info?.costumes.find((i) => i.id === c.id && !i.isDefault),
      );
      if (val.costume.includes("true")) return hasCostume;
      if (val.costume.includes("false")) return !hasCostume;
    }
    if (val.team.length > 0) {
      if (val.team.length === 3) return true;
      return info?.team.some((t) => val.team.includes(t.toString()));
    }
    return true;
  });
  if (filterC.length === 0) {
    showSnackbar.warn("未找到符合条件的角色");
    return;
  }
  selectOpts.value = val;
  showSnackbar.success(`筛选出符合条件的角色 ${filterC.length} 个`);
  selectedList.value = getOrderedList(filterC);
  resetRenderedRoles();
  if (!dataVal.value) return;
  if (!selectedList.value.includes(dataVal.value)) {
    dataVal.value = selectedList.value[0];
    selectIndex.value = 0;
  } else selectIndex.value = selectedList.value.indexOf(dataVal.value);
}

function isLevelMatched(filterLevel: string, avatarLevel: number): boolean {
  if (filterLevel === "true") return avatarLevel >= 70;
  if (filterLevel === "false") return avatarLevel < 70;
  return avatarLevel === Number(filterLevel);
}

function handleSwitch(next: boolean): void {
  if (next) {
    selectIndex.value += 1;
    if (selectIndex.value >= selectedList.value.length) selectIndex.value = 0;
  } else {
    selectIndex.value -= 1;
    if (selectIndex.value < 0) selectIndex.value = selectedList.value.length - 1;
  }
  dataVal.value = selectedList.value[selectIndex.value];
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.uc-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.uc-extension {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-right: 16px;
  margin-bottom: 4px;
  margin-left: 16px;
}

.uc-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;

  :deep(.v-input__control) {
    width: 200px;
  }
}

.uc-select-btn {
  position: relative;
  display: flex;
  width: 200px;
  height: 40px;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
}

.uc-sort {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.uc-box {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  gap: 8px;
}

.uc-box-top {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  row-gap: 8px;
}

.uc-divider {
  position: relative;
  width: 100%;
  height: 1px;
  border-radius: 1px;
  background: var(--common-shadow-2);
}

.uc-box-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.uc-box-uid {
  @include github-styles.github-tag-dark-gen(#ffcd0c);

  padding: 2px 4px;
  border-radius: 4px;
}

.uc-ov-item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 18px;
  gap: 4px;

  img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.uc-ov-cnt {
  position: relative;
  top: 4px;
  left: -4px;
  color: var(--tgc-od-white);
  font-size: 12px;
}

.uc-box-info {
  position: absolute;
  z-index: -1;
  top: 2px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  font-size: 14px;
  opacity: 0.8;
}

.uc-top-btns {
  display: flex;
  align-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.uc-top-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.uc-grid {
  display: grid;
  justify-content: start;
  gap: 8px var(--uc-card-column-gap, 8px);
  grid-template-columns: repeat(var(--uc-card-columns, 1), var(--uc-card-col-width, 220px));
}

.uc-avatar-select {
  position: relative;
  width: 100%;
  min-width: 0;
  contain-intrinsic-size: auto 230px;
  content-visibility: auto;
  cursor: pointer;

  &.selected {
    :deep(.tua-ab-box),
    :deep(.tua-ac) {
      border-color: var(--tgc-od-orange);
    }
  }
}

.uc-grid--card .uc-avatar-select {
  contain-intrinsic-size: auto 270px;
}

.uc-box--sharing .uc-avatar-select {
  content-visibility: visible;
}

.uc-load-trigger {
  width: 100%;
  height: 1px;
  grid-column: 1 / -1;
}

.uc-avatar-check {
  position: absolute;
  z-index: 2;
  top: 1px;
  left: 1px;
  border-radius: 4px;
  background: var(--box-bg-1);
  box-shadow: 2px 2px 4px var(--common-shadow-2);

  :deep(.v-selection-control) {
    --v-selection-control-size: 20px;
  }

  :deep(.v-selection-control__input) {
    border-radius: 4px;
  }

  :deep(.v-icon) {
    font-size: 16px;
  }
}

.uc-empty {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
