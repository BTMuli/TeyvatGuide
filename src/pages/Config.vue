<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header"> 应用信息 </v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
      <template #prepend>
        <img class="config-icon" src="/platforms/tauri.webp" alt="Tauri" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <img class="config-icon" src="/icon.webp" alt="App" />
      </template>
      <v-list-item-title>
        应用版本
        <v-btn
          class="card-btn"
          size="small"
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
        <img class="config-icon" src="../assets/icons/achievements.svg" alt="Achievements" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ achievementsStore.lastVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="登录信息">
      <v-list-item-subtitle v-show="userInfo.nickname !== '未登录'">
        {{ userInfo.nickname }} uid:{{ userInfo.uid }}
      </v-list-item-subtitle>
      <v-list-item-subtitle v-show="userInfo.nickname === '未登录'">
        未登录，请输入 Cookie 登录！
      </v-list-item-subtitle>
      <template #prepend>
        <img class="config-icon" :src="userInfo.avatar" alt="Login" />
      </template>
      <template #append>
        <v-btn class="card-btn" @click="tryConfirm('refreshUser')">
          <template #prepend>
            <img src="../assets/icons/circle-check.svg" alt="check" />
            刷新数据
          </template>
        </v-btn>
      </template>
    </v-list-item>
    <v-list-subheader :inset="true" class="config-header"> 系统信息 </v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
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
        <v-list-item-subtitle>{{
          dbInfo.find((item) => item.key === "dataUpdated")?.value
        }}</v-list-item-subtitle>
      </template>
      <v-list-item-subtitle
        >更新于
        {{ dbInfo.find((item) => item.key === "dataUpdated")?.updated }}</v-list-item-subtitle
      >
    </v-list-item>
    <v-list-item title="数据库版本" prepend-icon="mdi-database">
      <template #append>
        <v-list-item-subtitle>{{
          dbInfo.find((item) => item.key === "appVersion")?.value
        }}</v-list-item-subtitle>
      </template>
      <v-list-item-subtitle
        >更新于
        {{ dbInfo.find((item) => item.key === "appVersion")?.updated }}</v-list-item-subtitle
      >
    </v-list-item>
    <v-list-subheader :inset="true" class="config-header"> 设置 </v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item>
      <template #prepend>
        <v-icon>mdi-view-dashboard</v-icon>
      </template>
      <v-select
        v-model="showHome"
        :items="homeStore.getShowItems()"
        label="首页显示组件"
        :multiple="true"
        :chips="true"
      />
      <template #append>
        <v-btn class="card-btn" @click="submitHome">
          <template #prepend>
            <img src="../assets/icons/circle-check.svg" alt="check" />
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
    <v-list-subheader :inset="true" class="config-header"> 调试 </v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item v-if="appStore.devEnv" title="调试模式" subtitle="开启后将显示调试信息">
      <template #prepend>
        <v-icon>mdi-bug</v-icon>
      </template>
      <template #append>
        <v-switch
          v-model="appStore.devMode"
          :label="appStore.devMode ? '开启' : '关闭'"
          :inset="true"
          color="#FAC51E"
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
        <v-icon
          style="cursor: pointer"
          @click="toOuter('https://github.com/BTMuli/Tauri.Genshin/issues/18')"
        >
          mdi-help-circle-outline
        </v-icon>
      </template>
    </v-list-item>
    <v-list-item title="重置数据库" prepend-icon="mdi-delete" @click="tryConfirm('resetDB')" />
    <v-list-item
      title="检测 SQLite 数据库完整性"
      prepend-icon="mdi-database-check"
      @click="tryConfirm('checkDB')"
    />
    <v-list-subheader :inset="true" class="config-header"> 路径 </v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
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
  <ToConfirm
    v-model="confirmShow"
    :model-input="confirmInput"
    :title="confirmText"
    :subtitle="confirmSub"
    :is-input="isConfirmInput"
    @confirm="doConfirm(confirmOper)"
  />
</template>

<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../components/overlay/to-loading.vue";
import ToConfirm from "../components/overlay/to-confirm.vue";
// tauri
import { app, fs, os } from "@tauri-apps/api";
// store
import { useAppStore } from "../store/modules/app";
import { useHomeStore } from "../store/modules/home";
import { useAchievementsStore } from "../store/modules/achievements";
import { useUserStore } from "../store/modules/user";
// utils
import { backupUiafData, restoreUiafData } from "../utils/UIAF";
import { backupAbyssData, backupCookieData } from "../web/utils/backupData";
import { restoreAbyssData, restoreCookieData } from "../web/utils/restoreData";
import TGSqlite from "../plugins/Sqlite";
import TGRequest from "../web/request/TGRequest";

// Store
const appStore = useAppStore();
const userStore = useUserStore();
const homeStore = useHomeStore();
const achievementsStore = useAchievementsStore();

// About App
const versionApp = ref<string>("");
const versionTauri = ref<string>("");
const buildTime = computed(() => appStore.buildTime);

// About OS
const osPlatform = ref<string>("");
const osVersion = ref<string>("");
const dbInfo = ref<Array<{ key: string; value: string; updated: string }>>([]);

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载...");

// data
const showHome = ref<string[]>(homeStore.getShowValue());
const userInfo = computed(() => {
  const info = userStore.getBriefInfo();
  return {
    nickname: info.nickname || "未登录",
    uid: info.uid || "-1",
    desc: info.desc || "未登录",
    avatar: info.avatar || "/source/UI/defaultUser.webp",
  };
});

// snackbar
const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarColor = ref<string>("success");

// confirm
const confirmText = ref<string>("");
const isConfirmInput = ref<boolean>(false);
const confirmInput = ref<string>("");
const confirmSub = ref<string>("");
const confirmOper = ref<string>("");
const confirmShow = ref<boolean>(false);

// load version
onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  osPlatform.value = `${await os.platform()}`;
  osVersion.value = await os.version();
  try {
    dbInfo.value = await TGSqlite.getAppData();
    const ck = dbInfo.value.find((v) => v.key === "cookie");
    if (ck) {
      userStore.cookie = JSON.parse(ck.value);
    }
  } catch (e) {
    snackbarText.value = "读取数据库失败！";
    snackbarColor.value = "warn";
    snackbar.value = true;
  }
  loading.value = false;
});

// 打开外部链接
function toOuter(url: string): void {
  window.open(url);
}

// open confirm
function tryConfirm(oper: string): void {
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
    case "refreshUser":
      confirmText.value = "确认刷新用户信息吗？";
      confirmSub.value = "将会重新获取用户信息";
      confirmOper.value = "refreshUser";
      confirmShow.value = true;
      break;
  }
}

// transfer confirm oper
async function doConfirm(oper: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
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
    case "checkDB":
      await checkDB();
      break;
    case "resetDB":
      await resetDB();
      break;
    case "updateDB":
      await updateDB();
      break;
    case "refreshUser":
      await refreshUser();
      break;
    default:
      break;
  }
}

// confirmOper
async function backupData(): Promise<void> {
  loadingTitle.value = "正在备份数据...";
  loading.value = true;
  const achievements = await TGSqlite.getUIAF();
  await backupUiafData(achievements);
  const cookie = await TGSqlite.getCookie();
  await backupCookieData(cookie);
  const abyss = await TGSqlite.getAbyss();
  await backupAbyssData(abyss);
  loading.value = false;
  snackbarText.value = "数据已备份!";
  snackbarColor.value = "success";
  snackbar.value = true;
}

async function restoreData(): Promise<void> {
  loadingTitle.value = "正在恢复数据...";
  loading.value = true;
  const fail = [];
  let res = await restoreUiafData();
  if (!res) {
    fail.push("成就数据");
  }
  res = await restoreCookieData();
  if (!res) {
    fail.push("Cookie");
  }
  res = await restoreAbyssData();
  if (!res) {
    fail.push("深渊数据");
  }
  if (fail.length > 0) {
    snackbarText.value = `${fail.join("、")} 恢复失败!`;
    snackbarColor.value = "error";
  } else {
    snackbarText.value = "数据已恢复!";
    snackbarColor.value = "success";
  }
  const cookie = await TGSqlite.getCookie();
  userStore.initCookie(cookie);
  loading.value = false;
}

async function delTempData(): Promise<void> {
  await fs.removeDir("tempData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
  snackbarText.value = "临时数据已删除!";
  snackbar.value = true;
}

async function delUserData(): Promise<void> {
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
function initAppData(): void {
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
function submitDevMode(): void {
  appStore.devMode
    ? (snackbarText.value = "已关闭 dev 模式!")
    : (snackbarText.value = "已开启 dev 模式!");
  snackbarColor.value = "success";
  snackbar.value = true;
}

// 修改首页显示
function submitHome(): void {
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

// 刷新用户数据
async function refreshUser(): Promise<void> {
  const ck = userStore.cookie;
  // ck = {}
  if (Object.keys(ck).length < 1) {
    snackbarText.value = "请先输入 Cookie!";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  let failCount = 0;
  loadingTitle.value = "正在验证 ltoken...";
  loading.value = true;
  const verifyLTokenRes = await TGRequest.User.byLToken.verify(ck.ltoken, ck.ltuid);
  if (typeof verifyLTokenRes === "string") {
    loadingTitle.value = "验证成功!正在刷新 cookie_token";
  } else {
    console.error(verifyLTokenRes);
    loadingTitle.value = "验证失败!正在重新获取 ltoken";
    const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.stuid, ck.stoken);
    if (typeof ltokenRes === "string") {
      ck.ltoken = ltokenRes;
      await TGSqlite.saveAppData("cookie", JSON.stringify(ck));
      userStore.initCookie(ck);
      loadingTitle.value = "刷新成功!正在获取用户头像、昵称信息";
    } else {
      console.error(ltokenRes);
      loadingTitle.value = "刷新失败!正在获取用户头像、昵称信息";
      failCount++;
    }
  }
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.stuid, ck.stoken);
  if (typeof cookieTokenRes === "string") {
    ck.cookie_token = cookieTokenRes;
    await TGSqlite.saveAppData("cookie", JSON.stringify(ck));
    userStore.initCookie(ck);
    console.log(JSON.stringify(ck));
    loadingTitle.value = "刷新成功!正在获取用户头像、昵称信息";
  } else {
    console.error(cookieTokenRes);
    loadingTitle.value = "刷新失败!正在获取用户头像、昵称信息";
    failCount++;
  }
  const infoRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("nickname" in infoRes) {
    userStore.setBriefInfo(infoRes);
    loadingTitle.value = "获取成功!正在获取用户游戏账号信息";
  } else {
    console.error(infoRes);
    loadingTitle.value = "获取失败!正在获取用户游戏账号信息";
    failCount++;
  }
  const accountRes = await TGRequest.User.byCookie.getAccounts(ck.cookie_token, ck.account_id);
  if (Array.isArray(accountRes)) {
    loadingTitle.value = "获取成功!正在保存到数据库!";
    await TGSqlite.saveAccount(accountRes);
  } else {
    console.error(accountRes);
    loadingTitle.value = "获取失败!";
    failCount++;
  }
  if (failCount > 0) {
    snackbarText.value = "刷新失败!请重新输入 cookie!";
    snackbarColor.value = "error";
    snackbar.value = true;
  } else {
    snackbarText.value = "刷新成功!";
    snackbarColor.value = "success";
    snackbar.value = true;
  }
  loading.value = false;
}

// 输入 Cookie
async function inputCookie(): Promise<void> {
  const cookie = confirmInput.value;
  if (cookie === "") {
    snackbarText.value = "Cookie 为空!";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  loadingTitle.value = "正在获取 tokens...";
  const cookieObj = cookie
    .trim()
    .split(";")
    .map((item) => item.trim().split("="));
  const ticket = cookieObj.find((item) => item[0] === "login_ticket")?.[1];
  const uid = cookieObj.find((item) => item[0] === "login_uid")?.[1];
  // 如果两者不存在
  if (!ticket || !uid) {
    snackbarText.value = "Cookie 无效!";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  try {
    await TGRequest.User.init(ticket, uid);
    const ck = await TGSqlite.getCookie();
    userStore.initCookie(ck);
    loadingTitle.value = "正在获取用户信息...";
    const cookie_token = userStore.getCookieItem("cookie_token");
    const resUser = await TGRequest.User.byCookie.getUserInfo(cookie_token, uid);
    if ("nickname" in resUser) {
      userStore.setBriefInfo(resUser);
      appStore.isLogin = true;
    }
    const resAccounts = await TGRequest.User.byCookie.getAccounts(cookie_token, uid);
    if (Array.isArray(resAccounts)) {
      await TGSqlite.saveAccount(resAccounts);
    }
    loading.value = false;
    snackbarText.value = "Cookie 已保存!";
    snackbarColor.value = "success";
    snackbar.value = true;
  } catch (err) {
    loading.value = false;
    snackbarText.value = "Cookie 无效!";
    snackbarColor.value = "error";
    snackbar.value = true;
  }
}

// 检查 SQLite 数据库
async function checkDB(): Promise<void> {
  loadingTitle.value = "正在检查数据库表单完整性...";
  loading.value = true;
  const res = await TGSqlite.check();
  await new Promise((resolve) => setTimeout(resolve, 1000));
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
      if (!dbUpdatedTime || dbUpdatedTime.startsWith("dev") || dbUpdatedTime < buildTime.value) {
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
async function resetDB(): Promise<void> {
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
async function updateDB(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  loadingTitle.value = "正在更新数据库...";
  loading.value = true;
  await TGSqlite.update();
  achievementsStore.lastVersion = await TGSqlite.getLatestAchievementVersion();
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
  border-radius: 10px;
  margin: 10px;
  background: var(--content-bg-2);
  color: var(--content-text-3);
  font-family: Genshin-Light, serif;
}

.config-header {
  margin-top: 10px;
  background: var(--content-bg-2);
  color: #fec90b;
  font-family: Genshin, serif;
  font-size: large;
}

.config-icon {
  width: 40px;
  height: 40px;
  padding: 5px;
  border-radius: 10px;
  margin-right: 15px;
  background: var(--content-bg-3);
}
</style>
