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
import { app, event, core, webviewWindow, window as TauriWindow } from "@tauri-apps/api";
import { PhysicalSize } from "@tauri-apps/api/dpi";
import { UnlistenFn, Event } from "@tauri-apps/api/event";
import { mkdir } from "@tauri-apps/plugin-fs";
import { storeToRefs } from "pinia";
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import TBackTop from "./components/app/t-backTop.vue";
import TSidebar from "./components/app/t-sidebar.vue";
import showConfirm from "./components/func/confirm.js";
import showSnackbar from "./components/func/snackbar.js";
import TGSqlite from "./plugins/Sqlite/index.js";
import { useAppStore } from "./store/modules/app.js";
import { useUserStore } from "./store/modules/user.js";
import { getBuildTime } from "./utils/TGBuild.js";
import TGLogger from "./utils/TGLogger.js";
import TGRequest from "./web/request/TGRequest.js";

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
  const win = webviewWindow.getCurrentWebviewWindow();
  isMain.value = win.label === "TeyvatGuide";
  if (isMain.value) {
    const title = "Teyvat Guide v" + (await app.getVersion()) + " Beta";
    await win.setTitle(title);
    listenOnInit();
    await core.invoke("init_app");
    urlListener = await getDeepLink();
  }
  if (appStore.needResize === undefined) appStore.needResize = true;
  if (appStore.needResize) await checkResize();
  await win.show();
});

async function checkResize(): Promise<void> {
  const screen = await TauriWindow.currentMonitor();
  if (screen === null) {
    showSnackbar({
      text: "获取屏幕信息失败！",
      color: "error",
      timeout: 3000,
    });
    return;
  }
  const windowCur = await webviewWindow.getCurrentWebviewWindow();
  if (await windowCur.isMaximized()) return;
  const designSize = getSize(windowCur.label);
  const widthScale = screen.size.width / 1920;
  const heightScale = screen.size.height / 1080;
  await windowCur.setSize(
    new PhysicalSize(
      Math.round(designSize.width * widthScale),
      Math.round(designSize.height * heightScale),
    ),
  );
  await windowCur.setZoom((1 / screen.scaleFactor) * Math.min(widthScale, heightScale));
  await windowCur.center();
  return;
}

function getSize(label: string): PhysicalSize {
  if (label === "TeyvatGuide") return new PhysicalSize(1600, 900);
  if (label === "Sub_Window" || label === "Dev_JSON") return new PhysicalSize(960, 720);
  return new PhysicalSize(1280, 720);
}

onMounted(() => {
  document.documentElement.className = theme.value;
  themeListener = event.listen("readTheme", async (e: Event<string>) => {
    const themeGet = e.payload;
    if (theme.value !== themeGet) {
      theme.value = themeGet;
      document.documentElement.className = theme.value;
    }
  });
});

// 启动后只执行一次的监听
function listenOnInit(): void {
  console.info("[App][listenOnInit] 监听初始化事件！");
  event.listen("initApp", async () => {
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
  const deviceLocal = appStore.deviceInfo;
  const deviceFind = appData.find((item) => item.key === "deviceInfo");
  if (typeof deviceFind === "undefined") {
    if (deviceLocal.device_fp === "0000000000000") {
      appStore.deviceInfo = await TGRequest.Device.getFp(appStore.deviceInfo);
    }
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(deviceLocal));
    return;
  }
  if (JSON.parse(deviceFind.value) !== deviceLocal) {
    appStore.deviceInfo = JSON.parse(deviceFind.value);
  }
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
  if (typeof infoDB === "undefined" && JSON.stringify(infoLocal) !== "{}") {
    await TGSqlite.saveAppData("userInfo", JSON.stringify(infoLocal));
  } else if (typeof infoDB !== "undefined" && infoLocal !== JSON.parse(infoDB)) {
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
  if (typeof userDir === "undefined") {
    await TGSqlite.saveAppData("userDir", appStore.userDir);
    return;
  }
  if (userDir !== appStore.userDir) appStore.userDir = userDir;
  await mkdir(appStore.userDir, { recursive: true });
}

async function getDeepLink(): Promise<UnlistenFn> {
  return await event.listen("active_deep_link", async (e: Event<string>) => {
    const windowGet = new webviewWindow.WebviewWindow("TeyvatGuide");
    if (await windowGet.isMinimized()) {
      await windowGet.unminimize();
    }
    await windowGet.setFocus();
    const payload = parseDeepLink(e.payload);
    if (payload === false) {
      showSnackbar({
        text: "无效的 deep link！",
        color: "error",
        timeout: 3000,
      });
      await TGLogger.Error(`[App][getDeepLink] 无效的 deep link！ ${JSON.stringify(e.payload)}`);
      return;
    }
    await TGLogger.Info(`[App][getDeepLink] ${e.payload}`);
    await handleDeepLink(payload);
  });
}

function parseDeepLink(payload: string | string[]): string | false {
  try {
    if (typeof payload === "string") return payload;
    if (payload.length < 2) return "teyvatguide://";
    return payload[1];
  } catch (e) {
    if (e instanceof Error) {
      TGLogger.Error(`[App][parseDeepLink] ${e.name}: ${e.message}`);
    } else console.error(e);
    return false;
  }
}

async function handleDeepLink(payload: string): Promise<void> {
  if (payload === "" || payload === "teyvatguide://") return;
  if (
    payload.startsWith("teyvatguide://import_uigf") ||
    payload.startsWith("teyvatguide://import_uiaf")
  ) {
    await toUIAF(payload);
    return;
  }
  if (payload.startsWith("router?path=")) {
    const routerPath = payload.replace("router?path=", "");
    if (router.currentRoute.value.path === routerPath) {
      showSnackbar({
        text: "已在当前页面！",
        color: "warn",
        timeout: 3000,
      });
      return;
    }
    await router.push(routerPath);
    return;
  }
}

async function toUIAF(link: string) {
  const url = new URL(link);
  const app = url.searchParams.get("app");
  if (app == null || app === "") {
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
      return;
    }
    appStore.buildTime = getBuildTime();
    await TGSqlite.update();
    showSnackbar({
      text: "数据库已更新！",
      color: "success",
      timeout: 3000,
    });
    window.open("https://app.btmuli.ink/docs/Changelogs.html");
  }
}

onUnmounted(() => {
  if (themeListener) themeListener();
  if (urlListener) urlListener();
});
</script>
<style lang="css" scoped>
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
