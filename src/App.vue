<template>
  <v-app :theme="vuetifyTheme">
    <TSidebar v-if="isMain" />
    <v-main>
      <v-container :fluid="true" class="app-container">
        <router-view />
      </v-container>
    </v-main>
    <TBackTop />
  </v-app>
</template>

<script lang="ts" setup>
import { app, event, fs, tauri, window as TauriWindow } from "@tauri-apps/api";
import { UnlistenFn } from "@tauri-apps/api/helpers/event";
import { storeToRefs } from "pinia";
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import TBackTop from "./components/app/t-backTop.vue";
import TSidebar from "./components/app/t-sidebar.vue";
import showConfirm from "./components/func/confirm";
import showSnackbar from "./components/func/snackbar";
import TGSqlite from "./plugins/Sqlite";
import { useAppStore } from "./store/modules/app";
import { useUserStore } from "./store/modules/user";
import { getBuildTime } from "./utils/TGBuild";
import TGLogger from "./utils/TGLogger";
import TGRequest from "./web/request/TGRequest";

const appStore = useAppStore();
const userStore = storeToRefs(useUserStore());
const isMain = ref<boolean>(false);
const theme = ref<string>(appStore.theme);
const router = useRouter();
const vuetifyTheme = computed(() => {
  return appStore.theme === "dark" ? "dark" : "light";
});

let themeListener: UnlistenFn;
let urlListener: UnlistenFn;

onBeforeMount(async () => {
  const win = TauriWindow.getCurrent();
  isMain.value = win.label === "TeyvatGuide";
  if (isMain.value) {
    const title = "Teyvat Guide v" + (await app.getVersion()) + " Beta";
    await win.setTitle(title);
    await listenOnInit();
    await tauri.invoke("init_app");
    urlListener = await getDeepLink();
  }
});

onMounted(async () => {
  document.documentElement.className = theme.value;
  themeListener = await event.listen("readTheme", async (e) => {
    const themeGet = <string>e.payload;
    if (theme.value !== themeGet) {
      theme.value = themeGet;
      document.documentElement.className = theme.value;
    }
  });
});

// 启动后只执行一次的监听
async function listenOnInit(): Promise<void> {
  await event.listen("initApp", async () => {
    await tauri.invoke("register_deep_link");
    await checkAppLoad();
    await checkDeviceFp();
    try {
      await checkUserLoad();
    } catch (e) {
      if (e instanceof Error) {
        await TGLogger.Error(`[App][listenOnInit] ${e.name}: ${e.message}`);
      } else console.error(e);
    }
    await checkUpdate();
  });
  return;
}

async function checkAppLoad(): Promise<void> {
  let checkDB = false;
  try {
    checkDB = await TGSqlite.check();
  } catch (error) {
    if (error instanceof Error) {
      await TGLogger.Error(`[App][checkAppLoad] ${error.name}: ${error.message}`);
    } else console.error(error);
  }
  if (!checkDB) await resetDB();
  else await TGLogger.Info("[App][checkAppLoad] 数据库已成功加载！");
}

async function resetDB(): Promise<void> {
  await TGSqlite.reset();
  showSnackbar({
    text: "检测到数据库不完整！已重置数据库！",
    color: "error",
    timeout: 3000,
  });
  appStore.loading = true;
  await TGLogger.Info("[App][resetDB] 数据库已重置！");
}

// 检测 deviceFp
async function checkDeviceFp(): Promise<void> {
  const appData = await TGSqlite.getAppData();
  const deviceInfo = appData.find((item) => item.key === "deviceInfo")?.value;
  const deviceLocal = appStore.deviceInfo;
  if (deviceInfo === undefined) {
    if (deviceLocal.device_fp === "0000000000000")
      appStore.deviceInfo = await TGRequest.Device.getFp(appStore.deviceInfo);
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(deviceLocal));
    return;
  }
  if (JSON.parse(deviceInfo) !== deviceLocal) appStore.deviceInfo = JSON.parse(deviceInfo);
}

// 检测 ck,info 数据
async function checkUserLoad(): Promise<void> {
  const ckDB = await TGSqlite.getCookie();
  if (JSON.stringify(ckDB) === "{}" && appStore.isLogin) {
    showSnackbar({
      text: "获取 Cookie 失败！请重新登录！",
      color: "error",
      timeout: 3000,
    });
    appStore.isLogin = false;
    await TGLogger.Error("[App][checkUserLoad] 获取 Cookie 失败！");
    return;
  }
  if (JSON.stringify(ckDB) !== "{}" && !appStore.isLogin) appStore.isLogin = true;
  const ckLocal = userStore.cookie;
  if (JSON.stringify(ckLocal) !== JSON.stringify(ckDB)) userStore.cookie.value = ckDB;
  const infoLocal = userStore.briefInfo.value;
  const appData = await TGSqlite.getAppData();
  const infoDB = appData.find((item) => item.key === "userInfo")?.value;
  if (infoDB === undefined && JSON.stringify(infoLocal) !== "{}") {
    await TGSqlite.saveAppData("userInfo", JSON.stringify(infoLocal));
  } else if (infoDB !== undefined && infoLocal !== JSON.parse(infoDB)) {
    userStore.briefInfo.value = JSON.parse(infoDB);
    console.info("briefInfo 数据已更新！");
  }
  const accountLocal = userStore.account.value;
  const accountDB = await TGSqlite.getCurAccount();
  if (accountDB === false) {
    if (!appStore.isLogin) return;
    showSnackbar({
      text: "获取 GameAccount 失败！请尝试更新数据库！",
      color: "error",
      timeout: 3000,
    });
    await TGLogger.Error("[App][checkUserLoad] 获取 GameAccount 失败！");
    return;
  }
  if (accountDB !== accountLocal) userStore.account.value = accountDB;
  const userDir = appData.find((item) => item.key === "userDir")?.value;
  if (userDir === undefined) {
    await TGSqlite.saveAppData("userDir", appStore.userDir);
    return;
  }
  if (userDir !== appStore.userDir) appStore.userDir = userDir;
  await fs.createDir(appStore.userDir, { recursive: true });
}

async function getDeepLink(): Promise<UnlistenFn> {
  return await event.listen("active_deep_link", async (e) => {
    const windowGet = new TauriWindow.WebviewWindow("TeyvatGuide");
    if (await windowGet.isMinimized()) {
      await windowGet.unminimize();
    }
    await windowGet.setFocus();
    if (typeof e.payload !== "string") {
      showSnackbar({
        text: "无效的 deep link！",
        color: "error",
        timeout: 3000,
      });
      await TGLogger.Error(`[App][getDeepLink] 无效的 deep link！ ${JSON.stringify(e)}`);
      return;
    }
    await TGLogger.Info(`[App][getDeepLink] ${e.payload}`);
    if (e.payload === "") return;
    if (
      e.payload.startsWith("teyvatguide://import_uigf") ||
      e.payload.startsWith("teyvatguide://import_uiaf")
    ) {
      await toUIAF(e.payload);
    } else {
      showSnackbar({
        text: "无效的 deep link！",
        color: "error",
        timeout: 3000,
      });
    }
  });
}

async function toUIAF(link: string) {
  const url = new URL(link);
  const app = url.searchParams.get("app");
  if (app === null) {
    await router.push("/achievements");
  } else {
    await router.push("/achievements/?app=" + app);
  }
}

// 检测更新
async function checkUpdate(): Promise<void> {
  const isProdEnv = import.meta.env.MODE === "production";
  const needUpdate = await TGSqlite.checkUpdate();
  if (needUpdate && isProdEnv) {
    await TGLogger.Info("[App][checkUpdate] 检测到版本更新！");
    const confirm = await showConfirm({
      title: "检测到版本更新",
      text: "是否更新数据库数据？",
    });
    if (!confirm) {
      showSnackbar({
        text: "请到设置页手动更新数据库！",
        color: "error",
        timeout: 3000,
      });
      window.open("https://app.btmuli.ink/docs/Changelogs.html");
      return;
    }
    appStore.buildTime = getBuildTime();
    await TGSqlite.update();
    showSnackbar({
      text: "数据库已更新！",
      color: "success",
      timeout: 3000,
    });
  }
}

onUnmounted(() => {
  if (themeListener) themeListener();
  if (urlListener) urlListener();
});
</script>
<style lang="css">
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
