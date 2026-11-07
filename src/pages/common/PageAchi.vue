<!-- 成就页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="achi-prepend">
        <img alt="icon" src="../../assets/icons/achievements.svg" />
        <span>我的成就</span>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :item-title="uidItemTitle"
          :item-value="uidItemValue"
          :items="uidList"
          density="compact"
          label="存档UID"
          variant="outlined"
          width="200px"
        >
          <template #selection="{ item }">
            <span>{{ maskUidTail(item) }}</span>
          </template>
        </v-select>
        <span>{{ title }}</span>
      </div>
    </template>
    <template #append>
      <div class="achi-append">
        <v-btn
          v-if="searchQuery"
          aria-label="重置搜索"
          class="top-btn"
          icon="mdi-restart"
          rounded="sm"
          size="40"
          title="重置搜索"
          variant="elevated"
          @click="resetSearch"
        />
        <v-text-field
          v-model="searchDraft"
          :hide-details="true"
          append-inner-icon="mdi-magnify"
          autocomplete="off"
          class="achi-search-field"
          density="compact"
          label="搜索"
          variant="outlined"
          @click:append-inner="submitSearch"
          @keydown.enter="submitSearch"
        />
      </div>
    </template>
    <template #extension>
      <div class="top-extension">
        <v-btn
          class="top-btn"
          prepend-icon="mdi-view-grid-outline"
          variant="elevated"
          @click="showOverview = true"
        >
          成就概览
        </v-btn>
        <v-btn class="top-btn" prepend-icon="mdi-import" variant="elevated" @click="importJson()">
          导入
        </v-btn>
        <v-btn class="top-btn" prepend-icon="mdi-export" variantelevated @click="exportJson()">
          导出
        </v-btn>
        <v-btn class="top-btn" prepend-icon="mdi-plus" variant="elevated" @click="createUid()">
          新建存档
        </v-btn>
        <v-btn
          class="top-btn danger-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteUid()"
        >
          删除存档
        </v-btn>
        <div class="top-switch" @click="switchHideFin">
          <v-icon v-if="hideFin" color="var(--tgc-od-green)">
            mdi-checkbox-marked-circle-outline
          </v-icon>
          <v-icon v-else color="var(--tgc-od-white)">mdi-circle</v-icon>
          <span>隐藏已完成</span>
        </div>
      </div>
      <div class="top-extension-actions">
        <TuaRecentMenu :items="recentAchievements" @select="handleRecentSelect" />
        <v-btn
          class="top-link top-btn"
          prepend-icon="mdi-import"
          title="通过Yae导入（请确保导入前游戏未启动）"
          variant="elevated"
          @click="toYae()"
        >
          YAE
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="wrap">
    <div class="left-wrap">
      <TuaSeries
        v-for="item in categoryList"
        :key="item.id"
        :cur="activeSeries"
        :hideFin
        :hiddenFilter="getHiddenFilter(item.id)"
        :searchCount="searchQuery ? (searchCounts.get(item.id) ?? 0) : undefined"
        :series="item"
        :showHiddenFilter="hiddenAchievementCategoryIds.has(item.id)"
        :uid="uidCur"
        @selected="handleSeriesSelect"
        @switch-hidden-filter="switchHiddenFilter(item.id)"
      />
    </div>
    <TuaAchiList
      ref="achiList"
      :achievements="visibleAchievements"
      :hideFin
      :hiddenFilter="activeHiddenFilter"
      :recentAchievements
      :searching="searchQuery !== ''"
      :series="activeSeries"
      :uid="uidCur"
      @select-series="handleOverlaySeriesSelect"
      @updated="loadAchievements(false)"
    />
  </div>
  <TuaOverview v-model="showOverview" :uid="uidCur" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TuaAchiList from "@comp/userAchi/tua-achi-list.vue";
import TuaOverview from "@comp/userAchi/tua-overview.vue";
import TuaRecentMenu from "@comp/userAchi/tua-recent-menu.vue";
import TuaSeries from "@comp/userAchi/tua-series.vue";
import TSUserAchi from "@Sqlm/userAchi.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { path } from "@tauri-apps/api";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  maskUid,
  maskUidName,
  maskUidTail,
  uidItemTitle,
  uidItemValue,
} from "@utils/display/TGUid.js";
import {
  getUiafHeader,
  readUiafData,
  verifyUiafData,
  verifyUiafDataClipboard,
} from "@utils/gacha/UIAF.js";
import { tryCallYae } from "@utils/game/TGGame.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AppAchiData } from "@/data/index.js";

type HiddenFilter = "all" | "hidden" | "visible";

const RECENT_ACHIEVEMENT_LIMIT = 50;

const categoryList = AppAchiData.categories;
const hiddenAchievementCategoryIds = new Set<number>(
  categoryList
    .filter((category) => category.achievements.some((achievement) => achievement.hidden))
    .map((category) => category.id),
);

const route = useRoute();
const router = useRouter();
const { isLogin } = storeToRefs(useAppStore());
const { account } = storeToRefs(useUserStore());

let achiListener: UnlistenFn | null = null;
let overviewRequestId = 0;
let recentRequestId = 0;
let achievementRequestId = 0;

const searchDraft = ref<string>("");
const searchQuery = ref<string>("");
const showOverview = ref<boolean>(false);
const hideFin = ref<boolean>(false);
const hiddenFilters = ref<Partial<Record<number, HiddenFilter>>>({});
const uidList = ref<Array<number>>([]);
const uidCur = ref<number>(0);
const selectedSeries = ref<number>(-1);
const overview = shallowRef<TGApp.App.Achievement.Overview>({ fin: 0, total: 1 });
const achievements = shallowRef<Array<TGApp.App.Achievement.RenderItem>>();
const recentAchievements = shallowRef<Array<TGApp.App.Achievement.RenderItem>>([]);
const achiList = useTemplateRef<InstanceType<typeof TuaAchiList>>("achiList");
const title = computed<string>(() => {
  const percentage = ((overview.value.fin * 100) / overview.value.total).toFixed(2);
  return `${overview.value.fin}/${overview.value.total} ${percentage}%`;
});
const browseSeries = computed<number>(() => (searchQuery.value ? -1 : selectedSeries.value));
const searchCounts = computed<Map<number, number>>(() => {
  const counts = new Map<number, number>();
  if (!searchQuery.value || achievements.value === undefined) return counts;
  for (const item of achievements.value) {
    if (hideFin.value && item.isCompleted) continue;
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
  }
  return counts;
});
const activeSeries = computed<number>(() => {
  // 筛选后当前系列可能没有结果，暂时展示全部命中，保留重置搜索后的系列选择。
  if (searchQuery.value && !searchCounts.value.has(selectedSeries.value)) return -1;
  return selectedSeries.value;
});
const visibleAchievements = computed<Array<TGApp.App.Achievement.RenderItem> | undefined>(() => {
  const series = activeSeries.value;
  if (!searchQuery.value || series === -1) return achievements.value;
  return achievements.value?.filter((item) => item.categoryId === series);
});
const activeHiddenFilter = computed<HiddenFilter>(() => getHiddenFilter(activeSeries.value));

onMounted(async () => {
  await showLoading.start("正在加载成就数据");
  await TGLogger.Info("[Achievements][onMounted] 打开成就页面");
  await showLoading.update("正在读取UID列表");
  await reloadUid();
  await showLoading.update("正在获取成就概况");
  await refreshOverview();
  await refreshRecent();
  await showLoading.end();
  if (route.query.app && typeof route.query.app === "string") {
    await handleImportOuter(route.query.app);
  }
  achiListener = await listen<void>("updateAchi", async () => {
    await Promise.all([refreshOverview(), refreshRecent()]);
  });
});

onUnmounted(async () => {
  if (achiListener !== null) {
    achiListener();
    achiListener = null;
  }
});

watch(
  () => uidCur.value,
  async () => {
    recentAchievements.value = [];
    await Promise.all([refreshOverview(), refreshRecent()]);
  },
);

watch(
  [uidCur, searchQuery, browseSeries],
  ([uid, query], [previousUid, previousQuery]) => {
    if (uid !== previousUid || query !== previousQuery) achievements.value = undefined;
    return loadAchievements();
  },
  { immediate: true },
);

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserAchi.getAllUid();
  if (uidList.value.includes(Number(account.value.gameUid))) {
    uidCur.value = Number(account.value.gameUid);
  } else if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [Number(account.value.gameUid)];
    uidCur.value = Number(account.value.gameUid);
  } else uidCur.value = 0;
}

function switchHideFin(): void {
  const text = hideFin.value ? "显示已完成" : "隐藏已完成";
  hideFin.value = !hideFin.value;
  showSnackbar.success(`已${text}`);
}

function handleSeriesSelect(id: number): void {
  selectedSeries.value = activeSeries.value === id ? -1 : id;
}

function handleOverlaySeriesSelect(id: number): void {
  if (activeSeries.value === id) {
    showSnackbar.warn("已经选中当前系列");
    return;
  }
  if (searchQuery.value && !searchCounts.value.has(id)) resetSearch();
  selectedSeries.value = id;
}

async function submitSearch(): Promise<void> {
  const query = searchDraft.value.trim();
  if (!query) {
    if (searchQuery.value) resetSearch();
    else showSnackbar.warn("请输入搜索内容");
    return;
  }
  selectedSeries.value = -1;
  if (query === searchQuery.value) {
    await loadAchievements();
    return;
  }
  searchQuery.value = query;
}

function resetSearch(): void {
  searchDraft.value = "";
  searchQuery.value = "";
  showSnackbar.success("已重置搜索");
}

async function loadAchievements(showFeedback: boolean = true): Promise<void> {
  const requestId = ++achievementRequestId;
  const uid = uidCur.value;
  const query = searchQuery.value;
  const series = browseSeries.value;
  const items = query
    ? await TSUserAchi.searchAchi(uid, query)
    : await TSUserAchi.getAchievements(uid, series);
  if (
    requestId !== achievementRequestId ||
    uid !== uidCur.value ||
    query !== searchQuery.value ||
    series !== browseSeries.value
  ) {
    return;
  }
  achievements.value = items;
  if (!showFeedback) return;
  if (query && items.length === 0) showSnackbar.warn("未搜索到相关成就");
  else showSnackbar.success(`已获取 ${items.length} 条成就数据`);
}

function getHiddenFilter(seriesId: number): HiddenFilter {
  return hiddenFilters.value[seriesId] ?? "all";
}

function switchHiddenFilter(seriesId: number): void {
  const current = getHiddenFilter(seriesId);
  let next: HiddenFilter = "all";
  if (current === "all") next = "hidden";
  else if (current === "hidden") next = "visible";
  hiddenFilters.value = { ...hiddenFilters.value, [seriesId]: next };
  selectedSeries.value = seriesId;
}

async function refreshOverview(): Promise<void> {
  const uid = uidCur.value;
  const requestId = ++overviewRequestId;
  const nextOverview = await TSUserAchi.getOverview(uid);
  if (requestId !== overviewRequestId || uid !== uidCur.value) return;
  overview.value = nextOverview;
}

async function refreshRecent(): Promise<void> {
  const uid = uidCur.value;
  const requestId = ++recentRequestId;
  if (uid === 0) {
    recentAchievements.value = [];
    return;
  }
  const achievements = await TSUserAchi.getAchievements(uid);
  if (requestId !== recentRequestId || uid !== uidCur.value) return;
  recentAchievements.value = achievements
    .filter((item) => item.isCompleted && Number.isFinite(Date.parse(item.completedTime)))
    .sort(compareRecentAchievements)
    .slice(0, RECENT_ACHIEVEMENT_LIMIT);
}

function compareRecentAchievements(
  first: TGApp.App.Achievement.RenderItem,
  second: TGApp.App.Achievement.RenderItem,
): number {
  const firstTime = Date.parse(first.completedTime);
  const secondTime = Date.parse(second.completedTime);
  if (firstTime !== secondTime) return secondTime - firstTime;
  if (first.categoryId !== second.categoryId) return first.categoryId - second.categoryId;
  if (first.order !== second.order) return first.order - second.order;
  return first.id - second.id;
}

function handleRecentSelect(achievement: TGApp.App.Achievement.RenderItem): void {
  achiList.value?.selectRecentAchievement(achievement);
}

async function importJson(): Promise<void> {
  await TGLogger.Info("[Achievements][importJson] 导入 UIAF 数据");
  const selectedFile = await open({
    title: "选择 UIAF 数据文件",
    multiple: false,
    filters: [{ name: "UIAF JSON", extensions: ["json"] }],
    defaultPath: await path.downloadDir(),
    directory: false,
  });
  if (selectedFile === null) {
    showSnackbar.cancel("已取消文件选择");
    await TGLogger.Info("[Achievements][importJson] 已取消文件选择");
    return;
  }
  await showLoading.start("正在导入数据", "正在验证数据");
  const check = await verifyUiafData(selectedFile);
  if (!check) {
    await showLoading.end();
    return;
  }
  await showLoading.end();
  let uidInput = await showDialog.input("请输入存档UID", "UID:", uidCur.value.toString());
  if (uidInput === false) {
    showSnackbar.cancel("已取消存档导入");
    return;
  }
  if (uidInput === undefined) uidInput = uidCur.value.toString();
  else if (isNaN(Number(uidInput))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  await showLoading.start("正在导入数据", `存档UID：${maskUid(uidInput)}`);
  const remoteRaw = await readUiafData(selectedFile);
  await TSUserAchi.mergeUiaf(remoteRaw.list, Number(uidInput));
  await showLoading.end();
  showSnackbar.success("导入成功，即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

async function exportJson(): Promise<void> {
  await TGLogger.Info("[Achievements][exportJson] 导出 UIAF 数据");
  if (overview.value.fin === 0) {
    showSnackbar.warn("没有可导出的数据");
    await TGLogger.Warn("[Achievements][exportJson] 没有可导出的数据");
    return;
  }
  const UiafData = {
    info: await getUiafHeader(),
    list: await TSUserAchi.getUiafData(uidCur.value),
  };
  const fileName = `UIAF_${UiafData.info.export_app}_${UiafData.info.export_app_version}_${maskUidName(uidCur.value)}`;
  const isSave = await save({
    title: "导出 UIAF 数据",
    filters: [{ name: "UIAF JSON", extensions: ["json"] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}${fileName}.json`,
  });
  if (isSave === null) {
    showSnackbar.cancel("已取消导出");
    await TGLogger.Info("[Achievements][exportJson] 已取消导出");
    return;
  }
  await writeTextFile(isSave, JSON.stringify(UiafData));
  showSnackbar.success("导出成功");
  await TGLogger.Info("[Achievements][exportJson] 导出成功");
  await TGLogger.Info(`[Achievements][exportJson] 导出路径：${isSave}`);
}

async function handleImportOuter(app: string): Promise<void> {
  await TGLogger.Info(`[Achievements][handleImportOuter] 导入来源：${app}`);
  const importCheck = await showDialog.check("是否导入成就数据？", `来源APP：${app}`, false);
  if (!importCheck) {
    showSnackbar.cancel("已取消导入");
    return;
  }
  await showLoading.start("正在导入数据", "正在读取剪贴板");
  let clipboard: string;
  try {
    clipboard = await window.navigator.clipboard.readText();
    await showLoading.update("正在验证数据");
    const check = await verifyUiafDataClipboard(clipboard);
    if (!check) return;
  } catch (error) {
    if (isClipboardAccessDenied(error)) {
      showSnackbar.warn("无法读取剪贴板，请授予权限并保持窗口聚焦后重试");
      return;
    }
    await TGLogger.Error(`[Achievements][handleImportOuter] 读取剪贴板失败 ${error}`);
    showSnackbar.error("读取剪贴板失败，请稍后重试");
    return;
  } finally {
    await showLoading.end();
  }
  let uidInput = await showDialog.input("请输入存档UID", "UID:", uidCur.value.toString());
  if (uidInput === false) {
    showSnackbar.cancel("已取消存档导入");
    return;
  }
  if (uidInput === undefined) uidInput = uidCur.value.toString();
  else if (isNaN(Number(uidInput))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  const data: TGApp.Plugins.UIAF.Data = JSON.parse(clipboard);
  await showLoading.start("正在导入数据", `存档UID：${maskUid(uidInput)}`);
  try {
    await TSUserAchi.mergeUiaf(data.list, Number(uidInput));
  } catch (error) {
    await TGLogger.Error(`[Achievements][handleImportOuter] 导入失败 ${error}`);
    showSnackbar.error("导入失败，请稍后重试");
    return;
  } finally {
    await showLoading.end();
  }
  showSnackbar.success("导入成功，即将刷新页面");
  await TGLogger.Info("[Achievements][handleImportOuter] 导入成功");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  await router.push("/achievements");
  window.location.reload();
}

function isClipboardAccessDenied(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

async function createUid(): Promise<void> {
  let uidDefault: string = "";
  if (account.value && !uidList.value.includes(Number(account.value.gameUid))) {
    uidDefault = account.value.gameUid;
  }
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
  uidCur.value = Number(uidInput);
  showSnackbar.success(`切换到新存档 ${maskUid(Number(uidInput))}`);
}

async function deleteUid(): Promise<void> {
  const delCheck = await showDialog.check(
    "确定删除该存档?",
    `确认则清空存档-${maskUidTail(uidCur.value)}对应数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消删除存档");
    return;
  }
  await TSUserAchi.delUid(uidCur.value);
  await reloadUid();
}

async function toYae(): Promise<void> {
  await tryCallYae(uidCur.value.toString());
}
</script>
<style lang="scss" scoped>
.achi-prepend {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
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

.achi-append {
  position: relative;
  display: grid;
  width: 400px;
  height: 50px;
  align-items: center;
  margin: 0 10px;
  color: var(--box-text-1);
  gap: 8px;
  grid-template-columns: 40px minmax(0, 1fr);
}

.achi-search-field {
  grid-column: 2;
}

.top-extension {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.top-extension-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  column-gap: 8px;
}

.top-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.top-switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 18px;
}

.top-link {
  margin-right: 16px;
  margin-bottom: 4px;
  margin-left: 0;
}

.wrap {
  display: flex;
  height: calc(100vh - 144px);
  column-gap: 8px;
}

.left-wrap {
  position: relative;
  display: flex;
  width: 332px;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  row-gap: 8px;
}

:deep(.v-virtual-scroll__item + .v-virtual-scroll__item) {
  margin-top: 8px;
}

.danger-btn {
  color: var(--tgc-od-red);
}
</style>
