<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-app-bar>
    <div class="top-title" @click="switchHideFin">{{ title }}</div>
    <template #append>
      <div class="achi-search">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="搜索"
          :hide-details="true"
          :single-line="true"
        />
      </div>
    </template>
    <template #extension>
      <v-btn prepend-icon="mdi-import" class="top-btn" @click="importJson()">导入</v-btn>
      <v-btn prepend-icon="mdi-export" class="top-btn" @click="exportJson()">导出</v-btn>
      <div class="uid-select">
        <v-select
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          label="存档UID"
        />
      </div>
      <v-btn prepend-icon="mdi-plus" class="top-btn" @click="createUid()">新建存档</v-btn>
      <v-btn prepend-icon="mdi-delete" class="top-btn" @click="deleteUid()">删除存档</v-btn>
      <v-spacer />
    </template>
  </v-app-bar>
  <div class="wrap">
    <!-- 左侧菜单 -->
    <div class="left-wrap" v-if="uidCur">
      <TuaSeries
        v-for="(series, index) in seriesList"
        :key="index"
        @click="selectSeries(series)"
        v-model:cur="selectedSeries"
        :uid="uidCur"
        :series="series"
      />
    </div>
    <TuaAchiList
      v-if="uidCur"
      :uid="uidCur"
      :hideFin="hideFin"
      v-model:series="selectedSeries"
      v-model:search="search"
    />
  </div>
</template>

<script lang="ts" setup>
import { path } from "@tauri-apps/api";
import { UnlistenFn, listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { onMounted, ref, watch, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import showConfirm from "../../components/func/confirm.js";
import showSnackbar from "../../components/func/snackbar.js";
import ToLoading from "../../components/overlay/to-loading.vue";
import TuaAchiList from "../../components/userAchi/tua-achi-list.vue";
import TuaSeries from "../../components/userAchi/tua-series.vue";
import { AppAchievementSeriesData } from "../../data/index.js";
import TSUserAchi from "../../plugins/Sqlite/modules/userAchi.js";
import TGLogger from "../../utils/TGLogger.js";
import {
  getUiafHeader,
  readUiafData,
  verifyUiafData,
  verifyUiafDataClipboard,
} from "../../utils/UIAF.js";

const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载数据");
const search = ref<string>("");
const hideFin = ref<boolean>(false);

const uidList = ref<number[]>([]);
const uidCur = ref<number>(0);
const overview = ref<TGApp.Sqlite.Achievement.Overview>({ fin: 0, total: 1 });
const seriesList = AppAchievementSeriesData.sort((a, b) => a.order - b.order).map((s) => s.id);
const selectedSeries = ref<number>(-1);

const title = computed<string>(() => {
  const percentage = ((overview.value.fin * 100) / overview.value.total).toFixed(2);
  return `${overview.value.fin}/${overview.value.total} ${percentage}%`;
});

const route = useRoute();
const router = useRouter();

let achiListener: UnlistenFn | null = null;

async function switchHideFin() {
  const text = hideFin.value ? "显示已完成" : "隐藏已完成";
  hideFin.value = !hideFin.value;
  showSnackbar({ text: `已${text}`, color: "success" });
}

onMounted(async () => {
  await TGLogger.Info("[Achievements][onMounted] 打开成就页面");
  loading.value = true;
  uidList.value = await TSUserAchi.getAllUid();
  if (uidList.value.length === 0) uidList.value = [0];
  uidCur.value = uidList.value[0];
  await refreshOverview();
  loading.value = false;
  if (route.query.app && typeof route.query.app === "string") {
    await handleImportOuter(route.query.app);
  }
  achiListener = await listen<number>("updateAchi", async () => await refreshOverview());
});

watch(
  () => uidCur.value,
  async () => await refreshOverview(),
);

onUnmounted(async () => {
  if (achiListener !== null) {
    achiListener();
    achiListener = null;
  }
});

async function refreshOverview(): Promise<void> {
  overview.value = await TSUserAchi.getOverview(uidCur.value);
}

function selectSeries(series: number): void {
  selectedSeries.value = series;
}

async function importJson(): Promise<void> {
  await TGLogger.Info("[Achievements][importJson] 导入 UIAF 数据");
  const selectedFile = await open({
    title: "选择 UIAF 数据文件",
    multiple: false,
    filters: [
      {
        name: "UIAF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: await path.downloadDir(),
    directory: false,
  });
  if (selectedFile === null) {
    showSnackbar({
      color: "cancel",
      text: "已取消文件选择",
    });
    await TGLogger.Info("[Achievements][importJson] 已取消文件选择");
    return;
  }
  const check = await verifyUiafData(selectedFile);
  if (!check) return;
  let uidInput = await showConfirm({
    mode: "input",
    title: "请输入存档UID",
    text: "UID:",
    input: uidCur.value.toString(),
  });
  if (uidInput === false) {
    showSnackbar({ text: "已取消存档导入!", color: "cancel" });
    return;
  }
  if (uidInput === undefined) uidInput = uidCur.value.toString();
  else if (isNaN(Number(uidInput))) {
    showSnackbar({ text: "请输入合法数字", color: "warn" });
    return;
  }
  const remoteRaw = await readUiafData(selectedFile);
  await TGLogger.Info("[Achievements][importJson] 读取 UIAF 数据成功");
  await TGLogger.Info(`[Achievements][importJson] 导入来源：${remoteRaw.info.export_app}`);
  await TGLogger.Info(`[Achievements][importJson] 导入版本：${remoteRaw.info.export_app_version}`);
  await TGLogger.Info(`[Achievements][importJson] 导入时间：${remoteRaw.info.export_timestamp}`);
  await TGLogger.Info(`[Achievements][importJson] 导入数据：${remoteRaw.list.length} 条`);
  await TGLogger.Info(`[Achievements][importJson] 导入存档：${uidInput}`);
  loadingTitle.value = "正在解析数据";
  loading.value = true;
  loadingTitle.value = "正在合并成就数据";
  await TSUserAchi.mergeUiaf(remoteRaw.list, Number(uidInput));
  loadingTitle.value = "即将刷新页面";
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

async function exportJson(): Promise<void> {
  await TGLogger.Info("[Achievements][exportJson] 导出 UIAF 数据");
  if (overview.value.fin === 0) {
    showSnackbar({ color: "error", text: "没有可导出的数据" });
    await TGLogger.Warn("[Achievements][exportJson] 没有可导出的数据");
    return;
  }
  const UiafData = {
    info: await getUiafHeader(),
    list: await TSUserAchi.getUiafData(uidCur.value),
  };
  const fileName = `UIAF_${UiafData.info.export_app}_${UiafData.info.export_app_version}_${uidCur.value}`;
  const isSave = await save({
    title: "导出 UIAF 数据",
    filters: [
      {
        name: "UIAF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: `${await path.downloadDir()}${path.sep()}${fileName}.json`,
  });
  if (isSave === null) {
    showSnackbar({ color: "warn", text: "已取消导出" });
    await TGLogger.Info("[Achievements][exportJson] 已取消导出");
    return;
  }
  await writeTextFile(isSave, JSON.stringify(UiafData));
  showSnackbar({ text: "导出成功", color: "success" });
  await TGLogger.Info("[Achievements][exportJson] 导出成功");
  await TGLogger.Info(`[Achievements][exportJson] 导出路径：${isSave}`);
}

async function handleImportOuter(app: string): Promise<void> {
  await TGLogger.Info(`[Achievements][handleImportOuter] 导入来源：${app}`);
  const confirm = await showConfirm({
    title: "是否导入祈愿数据？",
    text: `来源APP：${app}`,
  });
  if (!confirm) {
    showSnackbar({
      color: "warn",
      text: "已取消导入",
    });
    await TGLogger.Info("[Achievements][handleImportOuter] 已取消导入");
    return;
  }
  // 读取 剪贴板
  const clipboard = await window.navigator.clipboard.readText();
  const check = await verifyUiafDataClipboard();
  if (!check) return;
  let uidInput = await showConfirm({
    mode: "input",
    title: "请输入存档UID",
    text: "UID:",
    input: uidCur.value.toString(),
  });
  if (uidInput === false) {
    showSnackbar({ text: "已取消存档导入!", color: "cancel" });
    return;
  }
  if (uidInput === undefined) uidInput = uidCur.value.toString();
  else if (isNaN(Number(uidInput))) {
    showSnackbar({ text: "请输入合法数字", color: "warn" });
    return;
  }
  const data: TGApp.Plugins.UIAF.Data = JSON.parse(clipboard);
  loadingTitle.value = "正在导入数据";
  loading.value = true;
  await TSUserAchi.mergeUiaf(data.list, Number(uidInput));
  loading.value = false;
  showSnackbar({ color: "success", text: "导入成功，即将刷新页面" });
  await TGLogger.Info("[Achievements][handleImportOuter] 导入成功");
  setTimeout(async () => {
    await router.push("/achievements");
  }, 1500);
}

async function createUid(): Promise<void> {
  // todo
}

async function deleteUid(): Promise<void> {
  // todo
}
</script>
<!-- 顶部栏跟 wrap 大概布局 -->
<style lang="css" scoped>
.achi-search {
  position: relative;
  display: flex;
  width: 400px;
  height: 50px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin: 0 10px;
  color: var(--box-text-1);
}

.top-title {
  margin-left: 15px;
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 18px;
}

.top-btn {
  height: 40px;
  border: 1px solid var(--common-shadow-2);
  margin-left: 15px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.uid-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  margin-left: 15px;
  gap: 10px;
}

/* 内容区域 */
.wrap {
  display: flex;
  height: calc(100vh - 150px);
  column-gap: 10px;
}

/* 左侧系列 */
.left-wrap {
  display: flex;
  width: 400px;
  height: 100%;
  flex-direction: column;
  padding-right: 10px;
  overflow-y: auto;
  row-gap: 10px;
}
</style>
