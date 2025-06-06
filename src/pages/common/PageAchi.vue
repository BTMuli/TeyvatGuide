<template>
  <v-app-bar>
    <template #prepend>
      <div class="achi-prepend">
        <img alt="icon" src="../../assets/icons/achievements.svg" />
        <span>我的成就</span>
        <v-select
          density="compact"
          v-model="uidCur"
          :hide-details="true"
          :items="uidList"
          label="存档UID"
          variant="outlined"
          width="200px"
        />
        <span>{{ title }}</span>
      </div>
    </template>
    <template #append>
      <div class="achi-append">
        <v-text-field
          density="compact"
          v-model="search"
          :hide-details="true"
          :single-line="true"
          append-inner-icon="mdi-magnify"
          label="搜索"
          @keydown.enter="isSearch = true"
        />
      </div>
    </template>
    <template #extension>
      <div class="top-extension">
        <v-btn class="top-btn" prepend-icon="mdi-import" @click="importJson()">导入</v-btn>
        <v-btn class="top-btn" prepend-icon="mdi-export" @click="exportJson()">导出</v-btn>
        <v-btn class="top-btn" prepend-icon="mdi-plus" @click="createUid()">新建存档</v-btn>
        <v-btn class="top-btn" prepend-icon="mdi-delete" @click="deleteUid()">删除存档</v-btn>
        <div class="top-switch" @click="switchHideFin">
          <v-icon v-if="hideFin" color="var(--tgc-od-green)">
            mdi-checkbox-marked-circle-outline
          </v-icon>
          <v-icon v-else color="var(--tgc-od-white)">mdi-circle</v-icon>
          <span>隐藏已完成</span>
        </div>
      </div>
      <div class="top-link" title="使用Yae导入" @click="toYae()">
        <v-icon>mdi-comment-question-outline</v-icon>
      </div>
    </template>
  </v-app-bar>
  <div class="wrap">
    <v-virtual-scroll :items="seriesList" class="left-wrap" item-height="60">
      <template #default="{ item }">
        <TuaSeries
          class="left-item"
          v-model:cur="selectedSeries"
          :series="item"
          :uid="uidCur"
          @click="selectedSeries = item"
        />
      </template>
    </v-virtual-scroll>
    <TuaAchiList
      v-model:isSearch="isSearch"
      v-model:search="search"
      v-model:series="selectedSeries"
      :hideFin="hideFin"
      :uid="uidCur"
    />
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TuaAchiList from "@comp/userAchi/tua-achi-list.vue";
import TuaSeries from "@comp/userAchi/tua-series.vue";
import TSUserAchi from "@Sqlm/userAchi.js";
import { path } from "@tauri-apps/api";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import TGLogger from "@utils/TGLogger.js";
import {
  getUiafHeader,
  readUiafData,
  verifyUiafData,
  verifyUiafDataClipboard,
} from "@utils/UIAF.js";
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AppAchievementSeriesData } from "@/data/index.js";

const seriesList = AppAchievementSeriesData.sort((a, b) => a.order - b.order).map((s) => s.id);
const route = useRoute();
const router = useRouter();
let achiListener: UnlistenFn | null = null;

const search = ref<string>("");
const isSearch = ref<boolean>(false);
const hideFin = ref<boolean>(false);
const uidList = ref<number[]>([]);
const uidCur = ref<number>(0);
const selectedSeries = ref<number>(-1);
const overview = shallowRef<TGApp.Sqlite.Achievement.Overview>({ fin: 0, total: 1 });
const title = computed<string>(() => {
  const percentage = ((overview.value.fin * 100) / overview.value.total).toFixed(2);
  return `${overview.value.fin}/${overview.value.total} ${percentage}%`;
});

onMounted(async () => {
  await showLoading.start("正在加载成就数据");
  await TGLogger.Info("[Achievements][onMounted] 打开成就页面");
  await showLoading.update("正在读取UID列表");
  uidList.value = await TSUserAchi.getAllUid();
  if (uidList.value.length === 0) uidList.value = [0];
  uidCur.value = uidList.value[0];
  await showLoading.update("正在获取成就概况");
  await refreshOverview();
  await showLoading.end();
  if (route.query.app && typeof route.query.app === "string") {
    await handleImportOuter(route.query.app);
  }
  achiListener = await listen<void>("updateAchi", async () => await refreshOverview());
});

watch(() => uidCur.value, refreshOverview);

function switchHideFin(): void {
  const text = hideFin.value ? "显示已完成" : "隐藏已完成";
  hideFin.value = !hideFin.value;
  showSnackbar.success(`已${text}`);
}

async function refreshOverview(): Promise<void> {
  overview.value = await TSUserAchi.getOverview(uidCur.value);
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
  await showLoading.start("正在导入数据", `存档UID：${uidInput}`);
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
  const fileName = `UIAF_${UiafData.info.export_app}_${UiafData.info.export_app_version}_${uidCur.value}`;
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
  const importCheck = await showDialog.check("是否导入祈愿数据？", `来源APP：${app}`, false);
  if (!importCheck) {
    showSnackbar.cancel("已取消导入");
    return;
  }
  await showLoading.start("正在导入数据", "正在读取剪贴板");
  const clipboard = await window.navigator.clipboard.readText();
  await showLoading.update("正在验证数据");
  const check = await verifyUiafDataClipboard();
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
  const data: TGApp.Plugins.UIAF.Data = JSON.parse(clipboard);
  await showLoading.start("正在导入数据", `存档UID：${uidInput}`);
  await TSUserAchi.mergeUiaf(data.list, Number(uidInput));
  await showLoading.end();
  showSnackbar.success("导入成功，即将刷新页面");
  await TGLogger.Info("[Achievements][handleImportOuter] 导入成功");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  await router.push("/achievements");
  window.location.reload();
}

async function createUid(): Promise<void> {
  const uidInput = await showDialog.input("请输入新存档UID", "UID:");
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
  showSnackbar.success(`切换到新存档 ${Number(uidInput)}`);
}

async function deleteUid(): Promise<void> {
  const delCheck = await showDialog.check(
    "确定删除该存档?",
    `确认则清空存档-${uidCur.value}对应数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消删除存档");
    return;
  }
  await TSUserAchi.delUid(uidCur.value);
  uidList.value = uidList.value.filter((e) => e !== uidCur.value);
  if (uidList.value.length === 0) uidList.value = [0];
  uidCur.value = uidList.value[0];
}

async function toYae(): Promise<void> {
  await openUrl("https://github.com/HolographicHat/Yae");
}

onUnmounted(async () => {
  if (achiListener !== null) {
    achiListener();
    achiListener = null;
  }
});
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
  display: flex;
  width: 400px;
  height: 50px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin: 0 10px;
  color: var(--box-text-1);
}

.top-extension {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin-left: 8px;
  column-gap: 8px;
}

.top-btn {
  height: 40px;
  border: 1px solid var(--common-shadow-2);
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
  margin-left: auto;
  color: var(--tgc-od-white);
  cursor: pointer;

  &:hover {
    color: var(--tgc-od-orange);
  }
}

.wrap {
  display: flex;
  height: calc(100vh - 144px);
  column-gap: 8px;
}

.left-wrap {
  position: relative;
  width: 332px;
  height: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  padding-right: 8px;
  overflow-y: auto;
}

:deep(.v-virtual-scroll__item + .v-virtual-scroll__item) {
  margin-top: 8px;
}
</style>
