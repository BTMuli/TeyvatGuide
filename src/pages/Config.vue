<template>
  <div v-if="loading">
    <TLoading :title="loadingTitle" />
  </div>
  <div v-else>
    <v-list class="config-list">
      <v-list-subheader inset class="config-header">
        应用信息
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
        <template #prepend>
          <img class="config-icon" src="/platforms/tauri.webp" alt="Tauri">
        </template>
        <template #append>
          <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <img class="config-icon" src="/icon.webp" alt="App">
        </template>
        <v-list-item-title>
          应用版本
          <v-btn
            class="card-btn" size="small"
            @click="toOuter('https://github.com/BTMuli/Tauri.Genshin/releases/latest')"
          >
            Alpha
          </v-btn>
        </v-list-item-title>
        <template #append>
          <v-list-item-subtitle>{{ versionApp }}.{{ buildTime }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="成就版本">
        <template #prepend>
          <img class="config-icon" src="../assets/icons/achievements.svg" alt="Achievements">
        </template>
        <template #append>
          <v-list-item-subtitle>{{ achievementsStore.lastVersion }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-subheader inset class="config-header">
        系统信息
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item title="系统平台">
        <template #prepend>
          <v-icon>mdi-desktop-classic</v-icon>
        </template>
        <template #append>
          <v-list-item-subtitle>{{ osPlatform }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="系统版本">
        <template #prepend>
          <v-icon>mdi-desktop-classic</v-icon>
        </template>
        <template #append>
          <v-list-item-subtitle>{{ osVersion }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-subheader inset class="config-header">
        设置
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item prepend-icon="mdi-content-save" title="数据备份" @click="tryConfirm('backup')" />
      <v-list-item prepend-icon="mdi-content-save" title="数据恢复" @click="tryConfirm('restore')" />
      <v-list-item prepend-icon="mdi-delete" title="清除用户缓存" @click="tryConfirm('delUser')" />
      <v-list-item prepend-icon="mdi-delete" title="清除临时数据" @click="tryConfirm('delTemp')" />
      <v-list-item prepend-icon="mdi-cog" title="恢复默认设置" @click="tryConfirm('delApp')" />
      <v-list-subheader inset class="config-header">
        调试
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item title="开发者模式" subtitle="开启后将显示调试信息">
        <template #prepend>
          <v-icon>mdi-bug</v-icon>
        </template>
        <template #append>
          <v-switch
            v-model="appStore.devMode" :label="appStore.devMode ? '开启' : '关闭'" inset color="#FAC51E"
            @click="submitDevMode"
          />
        </template>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <v-icon>mdi-view-dashboard</v-icon>
        </template>
        <v-select v-model="showHome" :items="homeStore.getShowItems()" label="首页显示组件" multiple chips />
        <template #append>
          <v-btn class="card-btn" @click="submitHome">
            <template #prepend>
              <img src="../assets/icons/circle-check.svg" alt="check">
              提交
            </template>
          </v-btn>
        </template>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <v-icon>mdi-cookie</v-icon>
        </template>
        <v-list-item-title style="cursor: pointer;" @click="tryConfirm('getCookie')">
          重新获取 Cookie
        </v-list-item-title>
        <template #append>
          <v-btn class="card-btn" @click="showCookie()">
            <template #prepend>
              <img src="../assets/icons/circle-check.svg" alt="check">
              查看 Cookie
            </template>
          </v-btn>
        </template>
      </v-list-item>
      <v-list-item title="删除 IndexedDB" prepend-icon="mdi-delete" @click="tryConfirm('delDB')" />
      <v-list-item title="检测 SQLite 数据库完整性" prepend-icon="mdi-database-check" @click="tryConfirm('checkDB')" />
      <v-list-item title="重置 SQLite 数据库" prepend-icon="mdi-database-remove" @click="tryConfirm('resetDB')" />
      <v-list-subheader inset class="config-header">
        路径
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item prepend-icon="mdi-database">
        <v-list-item-title>本地数据库路径</v-list-item-title>
        <v-list-item-subtitle>{{ appStore.dataPath.dbDataPath }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item prepend-icon="mdi-folder">
        <v-list-item-title>本地临时数据路径</v-list-item-title>
        <v-list-item-subtitle>{{ appStore.dataPath.tempDataDir }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item prepend-icon="mdi-folder">
        <v-list-item-title>本地用户数据路径</v-list-item-title>
        <v-list-item-subtitle>{{ appStore.dataPath.userDataDir }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <!-- 弹窗提示条 -->
    <v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
    <!-- 确认弹窗 -->
    <TConfirm v-model="confirmShow" :title="confirmText" @confirm="doConfirm(confirmOper)" />
  </div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { getBuildTime } from "../utils/TGBuild";
import TLoading from "../components/t-loading.vue";
import TConfirm from "../components/t-confirm.vue";
// tauri
import { fs, app, os, tauri } from "@tauri-apps/api";
// store
import { useAppStore } from "../store/modules/app";
import { useHomeStore } from "../store/modules/home";
import { useHk4eStore } from "../store/modules/hk4e";
import { useAchievementsStore } from "../store/modules/achievements";
// utils
import { backupUiafData, restoreUiafData } from "../utils/UIAF";
import TGSqlite from "../utils/TGSqlite";

// Store
const appStore = useAppStore();
const homeStore = useHomeStore();
const achievementsStore = useAchievementsStore();

// About App
const versionApp = ref("" as string);
const versionTauri = ref("" as string);
const buildTime = ref(getBuildTime());

// About OS
const osPlatform = ref("" as string);
const osVersion = ref("" as string);

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载..." as string);

// data
const showHome = ref(homeStore.getShowValue() as string[]);
const hk4eStore = useHk4eStore();

// snackbar
const snackbar = ref(false as boolean);
const snackbarText = ref("" as string);
const snackbarColor = ref("success" as string);

// confirm
const confirmText = ref("" as string);
const confirmOper = ref("" as string);
const confirmShow = ref(false as boolean);

// load version
onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  osPlatform.value = `${await os.platform()}`;
  osVersion.value = await os.version();
  setTimeout(() => {
    loading.value = false;
  }, 1000);
});

// 打开外部链接
function toOuter (url: string) {
  window.open(url);
}

// open confirm
function tryConfirm (oper: string) {
  switch (oper) {
    case "backup":
      confirmText.value = "确认备份数据吗？";
      confirmOper.value = "backup";
      confirmShow.value = true;
      break;
    case "restore":
      confirmText.value = "确认恢复数据吗？";
      confirmOper.value = "restore";
      confirmShow.value = true;
      break;
    case "delTemp":
      confirmText.value = "确认清除临时数据吗？";
      confirmOper.value = "delTemp";
      confirmShow.value = true;
      break;
    case "delUser":
      confirmText.value = "确认清除用户缓存吗？";
      confirmOper.value = "delUser";
      confirmShow.value = true;
      break;
    case "delApp":
      confirmText.value = "确认恢复默认设置吗？";
      confirmOper.value = "delApp";
      confirmShow.value = true;
      break;
    case "getCookie":
      confirmText.value = "请根据新窗口的提示操作。";
      confirmOper.value = "getCookie";
      confirmShow.value = true;
      break;
    case "readCookie":
      confirmText.value = "请确认已经获取到Cookie。";
      confirmOper.value = "readCookie";
      confirmShow.value = true;
      break;
    case "delDB":
      confirmText.value = "确认清除 IndexedDB 吗？";
      confirmOper.value = "delDB";
      confirmShow.value = true;
      break;
    case "checkDB":
      confirmText.value = "请确认已经备份关键数据。";
      confirmOper.value = "checkDB";
      confirmShow.value = true;
      break;
    case "resetDB":
      confirmText.value = "确认重置 SQlite 数据库吗？";
      confirmOper.value = "resetDB";
      confirmShow.value = true;
      break;
  }
}

// transfer confirm oper
async function doConfirm (oper: string) {
  switch (oper) {
    case "backup":
      await backupData();
      break;
    case "restore":
      await restoreData();
      break;
    case "delTemp":
      await delTempData();
      break;
    case "delUser":
      await delUserData();
      break;
    case "delApp":
      initAppData();
      break;
    case "getCookie":
      await tauri.invoke("mys_login");
      tryConfirm("readCookie");
      break;
    case "readCookie":
      await readCookie();
      break;
    case "delDB":
      delDB();
      break;
    case "checkDB":
      await checkDB();
      break;
    case "resetDB":
      await resetDB();
      break;
    default:
      break;
  }
}

// confirmOper
async function backupData () {
  loadingTitle.value = "正在备份数据...";
  loading.value = true;
  const achievements = await TGSqlite.getUIAF();
  await backupUiafData(achievements);
  loading.value = false;
  snackbarText.value = "数据已备份!";
  snackbarColor.value = "success";
  snackbar.value = true;
}

async function restoreData () {
  loadingTitle.value = "正在恢复数据...";
  loading.value = true;
  const res = await restoreUiafData();
  loading.value = false;
  if (res !== false) {
    snackbarText.value = "数据已恢复!";
    snackbarColor.value = "success";
    snackbar.value = true;
  } else {
    snackbarText.value = "未检测到备份数据!";
    snackbarColor.value = "error";
    snackbar.value = true;
  }
}

async function delTempData () {
  await fs.removeDir("tempData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
  snackbarText.value = "临时数据已删除!";
  snackbar.value = true;
}

async function delUserData () {
  await fs.removeDir("userData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  snackbarText.value = "用户数据已删除!";
  snackbar.value = true;
  achievementsStore.init();
  await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData });
}

// 恢复默认配置
function initAppData () {
  appStore.init();
  homeStore.init();
  achievementsStore.init();
  snackbarText.value = "已恢复默认配置!即将刷新页面...";
  snackbar.value = true;
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 开启 dev 模式
function submitDevMode () {
  appStore.devMode ? (snackbarText.value = "已关闭 dev 模式!") : (snackbarText.value = "已开启 dev 模式!");
  snackbarColor.value = "success";
  snackbar.value = true;
}

// 修改首页显示
function submitHome () {
  // 获取已选
  const show = showHome.value;
  if (show.length < 1) {
    snackbarText.value = "请至少选择一个!";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  // 设置
  homeStore.setShowValue(show);
  snackbarText.value = "已修改!";
  snackbarColor.value = "success";
  snackbar.value = true;
}

async function showCookie () {
  const cookie = hk4eStore.getCookie();
  alert(`Cookie 获取成功！\n\n${cookie}`);
}

// 获取 Cookie
async function readCookie () {
  const cookie = hk4eStore.getCookie();
  const tryReadCookie = await tauri.invoke("read_cookie") as string || cookie;
  if (cookie === null || tryReadCookie === "") {
    snackbarText.value = "Cookie 为空!";
    snackbarColor.value = "error";
    snackbar.value = true;
  } else {
    snackbarText.value = "Cookie 获取成功!";
    snackbarColor.value = "success";
    snackbar.value = true;
    hk4eStore.setCookie(tryReadCookie);
    alert(`Cookie 获取成功！\n\n${tryReadCookie}`);
  }
}

// 删除 IndexedDB
function delDB () {
  window.indexedDB.deleteDatabase("TGData");
  snackbarText.value = "IndexedDB 已清除!若无法正常使用，请初始化配置。";
  snackbarColor.value = "success";
  snackbar.value = true;
}

// 检查 SQLite 数据库
async function checkDB () {
  loadingTitle.value = "正在检查数据库表单完整性...";
  const res = await TGSqlite.check();
  if (!res) {
    confirmOper.value = "resetDB";
    confirmText.value = "数据库表单不完整，是否重置数据库？";
    loading.value = false;
    confirmShow.value = true;
  } else {
    loadingTitle.value = "正在更新数据库表单...";
    await TGSqlite.update();
    loading.value = false;
    snackbarText.value = "数据库已是最新!";
    snackbarColor.value = "success";
    snackbar.value = true;
  }
}

// 重置 SQLite 数据库
async function resetDB () {
  loadingTitle.value = "正在重置数据库...";
  loading.value = true;
  await TGSqlite.reset();
  loading.value = false;
  snackbarText.value = "数据库已重置!请载入备份数据。";
  snackbarColor.value = "success";
  snackbar.value = true;
}
</script>

<style lang="css" scoped>
.config-list {
  margin: 10px;
  font-family: Genshin-Light, serif;
  background: var(--content-bg-2);
  color: var(--content-text-3);
  border-radius: 10px;
}

.config-header {
  margin-top: 10px;
  font-family: Genshin, serif;
  background: var(--content-bg-2);
  color: #fec90b;
  font-size: large;
}

.config-icon {
  width: 40px;
  height: 40px;
  margin-right: 15px;
  padding: 5px;
  background: var(--content-bg-3);
  border-radius: 10px;
}
</style>
