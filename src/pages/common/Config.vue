<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <ToGameLogin v-model="scan" />
  <div class="config-box">
    <v-list class="config-list">
      <v-list-subheader :inset="true" class="config-header" title="应用信息" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
        <template #prepend>
          <img class="config-icon" src="/platforms/tauri.webp" alt="Tauri" />
        </template>
        <template #append>
          <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="成就版本">
        <template #prepend>
          <img class="config-icon" src="../../assets/icons/achievements.svg" alt="Achievements" />
        </template>
        <template #append>
          <v-list-item-subtitle>{{ achievementsStore.lastVersion }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="登录信息">
        <v-list-item-subtitle v-show="userInfo?.nickname !== '未登录'">
          {{ userInfo?.nickname }} uid:{{ userInfo?.uid }}
        </v-list-item-subtitle>
        <v-list-item-subtitle v-show="userInfo?.nickname === '未登录'">
          未登录，请扫码登录！
        </v-list-item-subtitle>
        <template #prepend>
          <img class="config-icon" :src="userInfo?.avatar" alt="Login" />
        </template>
        <template #append>
          <v-btn class="config-btn" @click="confirmScanLogin">扫码登录</v-btn>
          <v-btn class="config-btn" @click="confirmRefreshUser"> 刷新数据</v-btn>
        </template>
      </v-list-item>
      <v-list-subheader :inset="true" class="config-header" title="系统信息" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item title="系统平台" prepend-icon="mdi-microsoft-windows">
        <template #append>
          <v-list-item-subtitle>{{ osPlatform }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="系统版本" prepend-icon="mdi-monitor-dashboard">
        <template #append>
          <v-list-item-subtitle>{{ osVersion }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="数据库更新时间" prepend-icon="mdi-database-sync">
        <template #append>
          <v-list-item-subtitle
            >{{ dbInfo.find((item) => item.key === "dataUpdated")?.value }}
          </v-list-item-subtitle>
        </template>
        <v-list-item-subtitle
          >更新于
          {{ dbInfo.find((item) => item.key === "dataUpdated")?.updated }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item title="数据库版本" prepend-icon="mdi-database-search">
        <template #append>
          <v-list-item-subtitle
            >{{ dbInfo.find((item) => item.key === "appVersion")?.value }}
          </v-list-item-subtitle>
        </template>
        <v-list-item-subtitle
          >更新于
          {{ dbInfo.find((item) => item.key === "appVersion")?.updated }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-subheader :inset="true" class="config-header" title="设置" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item prepend-icon="mdi-camera-iris">
        <v-select
          v-model="showHome"
          :items="homeStore.getShowItems()"
          label="首页显示组件"
          :multiple="true"
          :chips="true"
          :theme="vuetifyTheme"
        />
        <template #append>
          <v-btn class="config-btn" @click="submitHome"> 确定</v-btn>
        </template>
      </v-list-item>
      <v-list-item prepend-icon="mdi-database-export" title="数据备份" @click="confirmBackup" />
      <v-list-item prepend-icon="mdi-database-import" title="数据恢复" @click="confirmRestore" />
      <v-list-item prepend-icon="mdi-database-arrow-up" title="数据更新" @click="confirmUpdate()" />
      <v-list-subheader :inset="true" class="config-header" title="调试" @click="tryShowReset" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item
        v-if="isDevEnv"
        title="调试模式"
        subtitle="开启后将显示调试信息"
        prepend-icon="mdi-bug-play"
      >
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
      <v-list-item prepend-icon="mdi-refresh" title="刷新设备信息" @click="confirmUpdateDevice" />
      <v-list-item prepend-icon="mdi-database-remove" title="清除缓存" @click="confirmDelCache" />
      <v-list-item
        v-show="showReset"
        title="重置数据库"
        prepend-icon="mdi-database-settings"
        @click="confirmResetDB()"
      />
      <v-list-item prepend-icon="mdi-cog-sync" title="恢复默认设置" @click="confirmResetApp" />
      <v-list-subheader :inset="true" class="config-header" title="路径" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item
        prepend-icon="mdi-folder-key"
        title="本地数据库路径"
        :subtitle="appStore.dataPath.dbDataPath"
      />
      <v-list-item
        prepend-icon="mdi-folder-account"
        title="本地用户数据路径"
        :subtitle="appStore.dataPath.userDataDir"
      />
    </v-list>
    <div class="config-app">
      <img class="config-app-icon" src="/icon.webp" alt="App" />
      <div
        class="config-app-info click"
        title="点击前往 Github Release"
        @click="toOuter('https://github.com/BTMuli/TeyvatGuide/releases/latest')"
      >
        TeyvatGuide Beta
      </div>
      <div class="config-app-info">
        v{{ versionApp }}.{{ buildTime === "" ? "Dev" : buildTime }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { app, fs, invoke, os, process as TauriProcess } from "@tauri-apps/api";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import ToGameLogin from "../../components/overlay/to-gameLogin.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TGSqlite from "../../plugins/Sqlite";
import { useAchievementsStore } from "../../store/modules/achievements";
import { useAppStore } from "../../store/modules/app";
import { useHomeStore } from "../../store/modules/home";
import { useUserStore } from "../../store/modules/user";
import { getBuildTime } from "../../utils/TGBuild";
import { bytesToSize, getCacheDir, getDeviceInfo } from "../../utils/toolFunc";
import { backupUiafData, restoreUiafData } from "../../utils/UIAF";
import { getDeviceFp } from "../../web/request/getDeviceFp";
import TGRequest from "../../web/request/TGRequest";
import { backupAbyssData, backupCookieData } from "../../web/utils/backupData";
import { restoreAbyssData, restoreCookieData } from "../../web/utils/restoreData";

// Store
const appStore = useAppStore();
const userStore = storeToRefs(useUserStore());
const homeStore = useHomeStore();
const achievementsStore = useAchievementsStore();

const isDevEnv = ref<boolean>(import.meta.env.MODE === "development");

// About App
const versionApp = ref<string>("");
const versionTauri = ref<string>("");
const buildTime = computed(() => appStore.buildTime);

// About OS
const osPlatform = ref<string>("");
const osVersion = ref<string>("");
const dbInfo = ref<
  Array<{
    key: string;
    value: string;
    updated: string;
  }>
>([]);

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载...");
const loadingSub = ref<string>("");
const scan = ref<boolean>(false);
const showReset = ref<boolean>(false);

// data
const showHome = ref<string[]>(homeStore.getShowValue());
const userInfo = computed(() => {
  const info = userStore.briefInfo;
  if (info.value && info.value.nickname) {
    return {
      nickname: info.value.nickname,
      uid: info.value.uid,
      desc: info.value.desc,
      avatar: info.value.avatar,
    };
  }
  return {
    nickname: "未登录",
    uid: "-1",
    desc: "请扫码登录",
    avatar: "/source/UI/defaultUser.webp",
  };
});
const vuetifyTheme = computed(() => {
  return appStore.theme === "dark" ? "dark" : "light";
});

// load version
onMounted(async () => {
  loadingSub.value = "正在获取应用版本";
  versionApp.value = await app.getVersion();
  loadingSub.value = "正在获取 Tauri 版本";
  versionTauri.value = await app.getTauriVersion();
  loadingSub.value = "正在获取系统信息";
  osPlatform.value = `${await os.platform()}`;
  loadingSub.value = "正在获取系统版本";
  osVersion.value = await os.version();
  loadingSub.value = "正在获取数据库信息";
  try {
    dbInfo.value = await TGSqlite.getAppData();
  } catch (e) {
    showSnackbar({
      text: "加载数据库错误，请重置数据库!",
      color: "error",
    });
  }
  loadingSub.value = "";
  loading.value = false;
});

// 打开外部链接
function toOuter(url: string): void {
  window.open(url);
}

// 扫码登录
async function confirmScanLogin(): Promise<void> {
  scan.value = true;
}

// 刷新用户信息
async function confirmRefreshUser(): Promise<void> {
  const res = await showConfirm({
    title: "确认刷新用户信息吗？",
    text: "将会重新获取用户信息",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消刷新",
    });
    return;
  }
  if (!userStore.cookie) {
    showSnackbar({
      color: "error",
      text: "请先登录",
    });
    return;
  }
  const ck = userStore.cookie.value;
  if (ck === undefined || JSON.stringify(ck) === "{}") {
    showSnackbar({
      color: "error",
      text: "扫码登录后才能刷新用户信息!",
    });
    appStore.isLogin = false;
    return;
  }
  const deviceInfo = appStore.deviceInfo;
  if (deviceInfo.device_fp === "00000000000") {
    appStore.deviceInfo = await getDeviceFp(appStore.deviceInfo);
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
    const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.mid, ck.stoken);
    if (typeof ltokenRes === "string") {
      ck.ltoken = ltokenRes;
      loadingTitle.value = "刷新成功!正在获取用户头像、昵称信息";
    } else {
      console.error(ltokenRes);
      loadingTitle.value = "刷新失败!正在获取用户头像、昵称信息";
      failCount++;
    }
  }
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.mid, ck.stoken);
  if (typeof cookieTokenRes === "string") {
    ck.cookie_token = cookieTokenRes;
    console.log(JSON.stringify(ck));
    loadingTitle.value = "刷新成功!正在获取用户头像、昵称信息";
  } else {
    console.error(cookieTokenRes);
    loadingTitle.value = "刷新失败!正在获取用户头像、昵称信息";
    failCount++;
  }
  userStore.cookie.value = ck;
  await TGSqlite.saveAppData("cookie", JSON.stringify(ck));
  const infoRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("retcode" in infoRes) {
    console.error(infoRes);
    loadingTitle.value = "获取失败!正在获取用户游戏账号信息";
    failCount++;
  } else {
    const briefInfo: TGApp.App.Account.BriefInfo = {
      nickname: infoRes.nickname,
      uid: infoRes.uid,
      avatar: infoRes.avatar_url,
      desc: infoRes.introduce,
    };
    userStore.briefInfo.value = briefInfo;
    await TGSqlite.saveAppData("userInfo", JSON.stringify(briefInfo));
    loadingTitle.value = "获取成功!正在获取用户游戏账号信息";
  }
  const accountRes = await TGRequest.User.byCookie.getAccounts(ck.cookie_token, ck.account_id);
  if (Array.isArray(accountRes)) {
    loadingTitle.value = "获取成功!正在保存到数据库!";
    await TGSqlite.saveAccount(accountRes);
    const curAccount = await TGSqlite.getCurAccount();
    if (curAccount) userStore.account.value = curAccount;
  } else {
    console.error(accountRes);
    loadingTitle.value = "获取失败!";
    failCount++;
  }
  loading.value = false;
  if (failCount > 0) {
    showSnackbar({
      color: "error",
      text: "刷新失败!重试或者重新扫码登录！",
    });
  } else {
    showSnackbar({ text: "刷新成功!" });
    appStore.isLogin = true;
  }
}

// 备份数据
async function confirmBackup(): Promise<void> {
  const res = await showConfirm({
    title: "确认备份数据吗？",
    text: "若已备份将会被覆盖，祈愿数据备份请到对应页面执行",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消备份",
    });
    return;
  }
  loadingTitle.value = "正在备份数据...";
  loading.value = true;
  if (!(await fs.exists("userData", { dir: fs.BaseDirectory.AppLocalData }))) {
    await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
  }
  console.info("数据文件夹创建完成！");
  loadingSub.value = "正在获取成就数据";
  const achievements = await TGSqlite.getUIAF();
  loadingSub.value = "正在备份成就数据";
  await backupUiafData(achievements);
  loadingSub.value = "正在获取 Cookie";
  const cookie = await TGSqlite.getCookie();
  loadingSub.value = "正在备份 Cookie";
  await backupCookieData(cookie);
  loadingSub.value = "正在获取深渊数据";
  const abyss = await TGSqlite.getAbyss();
  loadingSub.value = "正在备份深渊数据";
  await backupAbyssData(abyss);
  loadingSub.value = "";
  loading.value = false;
  showSnackbar({ text: "数据已备份!" });
}

// 恢复数据
async function confirmRestore(): Promise<void> {
  const resConfirm = await showConfirm({
    title: "确认恢复数据吗？",
    text: "请确保存在备份数据，祈愿数据恢复请到对应页面执行",
  });
  if (!resConfirm) {
    showSnackbar({
      color: "grey",
      text: "已取消恢复",
    });
    return;
  }
  loadingTitle.value = "正在恢复数据...";
  loading.value = true;
  if (!(await fs.exists("userData", { dir: fs.BaseDirectory.AppLocalData }))) {
    showSnackbar({
      color: "error",
      text: "数据文件夹不存在！",
    });
    return;
  }
  const fail: string[] = [];
  let res: boolean;
  loadingSub.value = "正在恢复成就数据";
  res = await restoreUiafData();
  if (!res) {
    fail.push("成就数据");
  }
  loadingSub.value = "正在恢复祈愿数据";
  res = await restoreCookieData();
  userStore.cookie.value = await TGSqlite.getCookie();
  if (!res) {
    fail.push("Cookie");
  }
  loadingSub.value = "正在恢复深渊数据";
  res = await restoreAbyssData();
  if (!res) {
    fail.push("深渊数据");
  }
  fail.length > 0
    ? showSnackbar({ text: `${fail.join("、")} 恢复失败!`, color: "error" })
    : showSnackbar({ text: "数据已恢复!" });
  loading.value = false;
}

// 更新数据
async function confirmUpdate(title?: string): Promise<void> {
  const res = await showConfirm({
    title: title ?? "确认更新数据吗？",
    text: "请确保存在备份数据",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消更新数据库",
    });
    return;
  }
  loadingTitle.value = "正在更新数据库...";
  loading.value = true;
  await TGSqlite.update();
  achievementsStore.lastVersion = await TGSqlite.getLatestAchievementVersion();
  appStore.buildTime = getBuildTime();
  loading.value = false;
  showSnackbar({
    text: "数据库已更新!",
  });
  // 刷新
  window.location.reload();
}

// 更新设备信息
async function confirmUpdateDevice(): Promise<void> {
  const localFp = getDeviceInfo("device_fp");
  if (localFp !== "0000000000000") {
    const res = await showConfirm({
      title: "确认更新设备信息吗？",
      text: `DeviceFp:${localFp}`,
    });
    if (res === false) {
      showSnackbar({
        text: "已取消更新设备信息",
        color: "cancel",
      });
      return;
    }
  }
  appStore.deviceInfo = await TGRequest.Device.getFp(appStore.deviceInfo);
  showSnackbar({
    text: "设备信息已更新! DeviceFp: " + appStore.deviceInfo.device_fp,
  });
  await TGSqlite.saveAppData("deviceInfo", JSON.stringify(appStore.deviceInfo));
}

// 清除用户缓存
async function confirmDelCache(): Promise<void> {
  const CacheDir = await getCacheDir();
  if (CacheDir === false) {
    showSnackbar({
      color: "error",
      text: "不支持的平台!",
    });
    return;
  }
  let cacheBSize: number = 0;
  loadingTitle.value = "正在检测缓存...";
  loadingSub.value = "耗时较久，请稍作等候";
  loading.value = true;
  const timeStart = Date.now();
  for (const dir of CacheDir) {
    const size: number = await invoke("get_dir_size", { path: dir });
    cacheBSize += size;
  }
  const cacheSize = bytesToSize(cacheBSize);
  loading.value = false;
  const timeEnd = Date.now();
  const res = await showConfirm({
    title: "确认清除缓存吗？",
    text: `当前缓存大小为 ${cacheSize}，耗时 ${timeEnd - timeStart} 毫秒`,
  });
  if (res === false) {
    showSnackbar({
      color: "grey",
      text: "已取消清除缓存",
    });
    return;
  }
  for (const dir of CacheDir) {
    await fs.removeDir(dir, { recursive: true });
  }
  showSnackbar({
    text: "缓存已清除!请重新启动应用！",
  });
  await new Promise(() => {
    setTimeout(async () => {
      await TauriProcess.exit();
    }, 1500);
  });
}

// 恢复默认设置
async function confirmResetApp(): Promise<void> {
  const res = await showConfirm({
    title: "确认恢复默认设置吗？",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消恢复默认设置",
    });
    return;
  }
  appStore.init();
  homeStore.init();
  achievementsStore.init();
  showSnackbar({ text: "已恢复默认配置!即将刷新页面..." });
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 前置
async function tryShowReset(): Promise<void> {
  const res = await showConfirm({
    title: "请输入验证 Code",
    text: "请联系开发者获取",
    mode: "input",
  });
  if (res === false) {
    showSnackbar({
      color: "grey",
      text: "已取消",
    });
    return;
  }
  const time = getBuildTime();
  const code = time.startsWith("dev.") ? "dev" : time;
  if (res === code || res === "reset1128") {
    showReset.value = true;
    showSnackbar({
      text: "已开启重置数据库选项",
    });
  } else {
    showSnackbar({
      color: "error",
      text: "验证失败",
    });
  }
}

// 重置数据库
async function confirmResetDB(title?: string): Promise<void> {
  const res = await showConfirm({
    title: title ?? "确认重置数据库吗？",
    text: "请确认已经备份关键数据",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消重置数据库",
    });
    return;
  }
  loadingTitle.value = "正在重置数据库...";
  loading.value = true;
  await TGSqlite.reset();
  loading.value = false;
  showSnackbar({
    text: "数据库已重置!请进行再次检查。",
  });
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 开启 dev 模式
function submitDevMode(): void {
  appStore.devMode
    ? showSnackbar({ text: "已关闭 dev 模式!" })
    : showSnackbar({ text: "已开启 dev 模式!" });
}

// 修改首页显示
function submitHome(): void {
  // 获取已选
  const show = showHome.value;
  if (show.length < 1) {
    showSnackbar({
      color: "error",
      text: "请至少选择一个!",
    });
    return;
  }
  // 设置
  homeStore.setShowValue(show);
  showSnackbar({ text: "已修改!" });
}
</script>

<style lang="css" scoped>
.config-box {
  position: relative;
  display: compact;
}

.config-list {
  border-radius: 10px;
  margin-right: 220px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-family: var(--font-text);
}

.config-header {
  margin-top: 10px;
  color: var(--common-text-title);
  font-family: Genshin, serif;
  font-size: large;
}

.config-icon {
  width: 40px;
  height: 40px;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 10px;
  margin-right: 15px;
  background:
    linear-gradient(to bottom, rgb(255 255 255 / 15%) 0%, rgb(0 0 0 / 15%) 100%),
    radial-gradient(at top center, rgb(255 255 255 / 40%) 0%, rgb(0 0 0 / 40%) 120%) #989898;
  background-blend-mode: multiply, multiply;
}

.config-btn {
  width: 100px;
  margin-left: 20px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.config-app {
  position: fixed;
  top: 16px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background-image: linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%);
  box-shadow: 0 0 5px var(--common-shadow-4);
}

.config-app-icon {
  width: 200px;
  aspect-ratio: 1 / 1;
}

.config-app-info {
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 14px;
  text-align: center;
  text-shadow: 0 0 5px var(--common-shadow-4);
}

.config-app-info.click {
  border-bottom: 1px inset var(--tgc-white-4);
  cursor: pointer;
}
</style>
