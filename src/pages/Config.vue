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
      <v-list-item title="数据库更新时间" prepend-icon="mdi-database">
        <template #append>
          <v-list-item-subtitle>{{ dbInfo.find(item => item.key === "dataUpdated")?.value }}</v-list-item-subtitle>
        </template>
        <v-list-item-subtitle>更新于 {{ dbInfo.find(item => item.key === "dataUpdated")?.updated }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item title="数据库版本" prepend-icon="mdi-database">
        <template #append>
          <v-list-item-subtitle>{{ dbInfo.find(item => item.key === "appVersion")?.value }}</v-list-item-subtitle>
        </template>
        <v-list-item-subtitle>更新于 {{ dbInfo.find(item => item.key === "appVersion")?.updated }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-subheader inset class="config-header">
        设置
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item>
        <template #prepend>
          <v-icon>mdi-view-dashboard</v-icon>
        </template>
        <v-select v-model="showHome" :items="homeStore.getShowItems()" label="首页显示组件" multiple chips />
        <template #append>
          <v-btn class="card-btn" @click="submitHome">
            <template #prepend>
              <img src="../assets/icons/circle-check.svg" alt="check">
              确定
            </template>
          </v-btn>
        </template>
      </v-list-item>
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
          <v-icon>mdi-cookie</v-icon>
        </template>
        <template #title>
          <span style="cursor: pointer" @click="tryConfirm('inputCookie')">手动输入 Cookie</span>
        </template>
        <template #append>
          <div style="cursor: pointer" @click="toOuter('https://github.com/BTMuli/Tauri.Genshin/issues/18')">
            <span>如何获取 Cookie</span>
            <v-icon @click="">
              mdi-help-circle-outline
            </v-icon>
          </div>
        </template>
      </v-list-item>
      <v-list-item title="删除 IndexedDB" prepend-icon="mdi-delete" @click="tryConfirm('delDB')" />
      <v-list-item title="重置数据库" prepend-icon="mdi-delete" @click="tryConfirm('resetDB')" />
      <v-list-item title="检测 SQLite 数据库完整性" prepend-icon="mdi-database-check" @click="tryConfirm('checkDB')" />
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
    <TConfirm v-model:model-value="confirmShow" v-model:model-input="confirmInput" :title="confirmText" :subtitle="confirmSub" :is-input="isConfirmInput" @confirm="doConfirm(confirmOper)" />
  </div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { getBuildTime } from "../utils/TGBuild";
import TLoading from "../components/t-loading.vue";
import TConfirm from "../components/t-confirm.vue";
// tauri
import { fs, app, os } from "@tauri-apps/api";
// store
import { useAppStore } from "../store/modules/app";
import { useHomeStore } from "../store/modules/home";
import { useAchievementsStore } from "../store/modules/achievements";
// utils
import { backupUiafData, restoreUiafData } from "../utils/UIAF";
import TGSqlite from "../utils/TGSqlite";
import TGRequest from "../web/request/TGRequest";

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
const dbInfo = ref([] as { key: string, value: string, updated: string }[]);

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载..." as string);

// data
const showHome = ref(homeStore.getShowValue() as string[]);

// snackbar
const snackbar = ref(false as boolean);
const snackbarText = ref("" as string);
const snackbarColor = ref("success" as string);

// confirm
const confirmText = ref("" as string);
const isConfirmInput = ref(false as boolean);
const confirmInput = ref("" as string);
const confirmSub = ref("" as string);
const confirmOper = ref("" as string);
const confirmShow = ref(false as boolean);

// load version
onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  osPlatform.value = `${await os.platform()}`;
  osVersion.value = await os.version();
  dbInfo.value = await TGSqlite.getAppData();
  loading.value = false;
});

// 打开外部链接
function toOuter (url: string) {
  window.open(url);
}

// open confirm
function tryConfirm (oper: string) {
  confirmSub.value = "";
  isConfirmInput.value = false;
  switch (oper) {
    case "backup":
      confirmText.value = "确认备份数据吗？";
      confirmSub.value = "若已备份将会被覆盖";
      confirmOper.value = "backup";
      confirmShow.value = true;
      break;
    case "restore":
      confirmText.value = "确认恢复数据吗？";
      confirmSub.value = "请确保存在备份数据";
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
      confirmSub.value = "备份数据也将被清除";
      confirmOper.value = "delUser";
      confirmShow.value = true;
      break;
    case "delApp":
      confirmText.value = "确认恢复默认设置吗？";
      confirmOper.value = "delApp";
      confirmShow.value = true;
      break;
    case "inputCookie":
      isConfirmInput.value = true;
      confirmText.value = "请输入 Cookie";
      confirmSub.value = "Cookie 用于获取用户信息";
      confirmOper.value = "inputCookie";
      confirmShow.value = true;
      break;
    case "delDB":
      confirmText.value = "确认清除 IndexedDB 吗？";
      confirmSub.value = "Alpha v0.1.4 后不再支持 IndexedDB";
      confirmOper.value = "delDB";
      confirmShow.value = true;
      break;
    case "checkDB":
      confirmText.value = "将检测数据库表单完整性";
      confirmSub.value = "数据库版本与更新时间也会进行检测";
      confirmOper.value = "checkDB";
      confirmShow.value = true;
      break;
    case "resetDB":
      confirmText.value = "确认重置数据库吗？";
      confirmSub.value = "请确认已经备份关键数据";
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
    case "inputCookie":
      await inputCookie();
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
    case "updateDB":
      await updateDB();
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
  if (res) {
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

// 输入 Cookie
async function inputCookie () {
  // 将 Cookie 从 string 转为 object
  const cookie = confirmInput.value;
  if (cookie === "") {
    snackbarText.value = "Cookie 为空!";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  loadingTitle.value = "正在保存 Cookie...";
  loading.value = true;
  const cookieObj: any = {};
  cookie.replace(/\s+/g, "").split(";").forEach((item) => {
    const itemArr = item.split("=");
    cookieObj[itemArr[0]] = itemArr[1];
  });
  const saveCookie:BTMuli.User.Base.Cookie = {
    account_id: cookieObj.account_id || "",
    cookie_token: cookieObj.cookie_token || "",
    ltoken: cookieObj.ltoken || "",
    ltuid: cookieObj.ltuid || "",
    mid: cookieObj.mid || "",
    stoken: cookieObj.stoken || "",
    stuid: cookieObj.stuid || "",
    login_ticket: cookieObj.login_ticket || "",
    login_uid: cookieObj.login_uid || "",
  };
  // 保存到数据库
  await TGSqlite.inputCookie(JSON.stringify(saveCookie));
  // 保存到 store
  localStorage.setItem("cookie", JSON.stringify(saveCookie));
  if (saveCookie.stoken === "") {
    loadingTitle.value = "正在获取 tokens...";
    const tokenRes = await TGRequest.User.byLoginTicket.getLTokens(cookie, cookieObj.login_ticket, cookieObj.login_uid);
    if (Array.isArray(tokenRes)) {
      loadingTitle.value = "正在保存 tokens...";
      const lToken = tokenRes.find((item) => item.name === "ltoken");
      const sToken = tokenRes.find((item) => item.name === "stoken");
      if (lToken) await TGSqlite.saveAppData("ltoken", lToken.token);
      if (sToken) await TGSqlite.saveAppData("stoken", sToken.token);
      loading.value = false;
      snackbarText.value = "Cookie 已保存!";
      snackbarColor.value = "success";
      snackbar.value = true;
    } else {
      loading.value = false;
      snackbarText.value = "Cookie 无效!";
      snackbarColor.value = "error";
      snackbar.value = true;
    }
  } else {
    await TGSqlite.saveAppData("ltoken", saveCookie.ltoken);
    await TGSqlite.saveAppData("stoken", saveCookie.stoken);
    loading.value = false;
    snackbarText.value = "Cookie 已保存!";
    snackbarColor.value = "success";
    snackbar.value = true;
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
  loading.value = true;
  const res = await TGSqlite.check();
  if (!res) {
    confirmOper.value = "resetDB";
    confirmText.value = "数据库表单不完整，是否重置数据库？";
    loading.value = false;
    confirmShow.value = true;
  } else {
    const appVersion = await app.getVersion();
    const dbVersion = dbInfo.value.find((item) => item.key === "appVersion")?.value;
    const dbUpdatedTime = dbInfo.value.find((item) => item.key === "dataUpdated")?.value;
    if (!dbVersion || dbVersion < appVersion) {
      confirmOper.value = "updateDB";
      confirmText.value = "数据库版本过低，是否更新数据库？";
      loading.value = false;
      confirmShow.value = true;
      return;
    } else if (!buildTime.value.startsWith("dev")) {
      if (!dbUpdatedTime || dbUpdatedTime < buildTime.value) {
        confirmOper.value = "updateDB";
        confirmText.value = "数据库可能过时，是否更新数据库？";
        loading.value = false;
        confirmShow.value = true;
        return;
      }
    }
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
  snackbarText.value = "数据库已重置!请进行再次检查。";
  snackbarColor.value = "success";
  snackbar.value = true;
  // 刷新
  window.location.reload();
}

// 更新 SQLite 数据库
async function updateDB () {
  loadingTitle.value = "正在更新数据库...";
  loading.value = true;
  await TGSqlite.update();
  loading.value = false;
  snackbarText.value = "数据库已是最新！";
  snackbarColor.value = "success";
  snackbar.value = true;
  // 刷新
  window.location.reload();
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
