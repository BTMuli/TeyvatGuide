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
import TSUserAccount from "./plugins/Sqlite/modules/userAccount.js";
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

let themeListener: UnlistenFn | null = null;
let urlListener: UnlistenFn | null = null;

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
  if (appStore.needResize !== "false") await checkResize();
  await win.show();
});

async function checkResize(): Promise<void> {
  const screen = await TauriWindow.currentMonitor();
  if (screen === null) {
    showSnackbar({ text: "获取屏幕信息失败！", color: "error", timeout: 3000 });
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
  if (label === "Sub_window" || label === "Dev_JSON") return new PhysicalSize(960, 720);
  return new PhysicalSize(1280, 720);
}

onMounted(async () => {
  document.documentElement.className = theme.value;
  themeListener = await event.listen("readTheme", async (e: Event<string>) => {
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

async function checkUserLoad(): Promise<void> {
  // 检测用户数据目录
  const appData = await TGSqlite.getAppData();
  const userDir = appData.find((item) => item.key === "userDir")?.value;
  if (typeof userDir === "undefined") await TGSqlite.saveAppData("userDir", appStore.userDir);
  else if (userDir !== appStore.userDir) appStore.userDir = userDir;
  await mkdir(appStore.userDir, { recursive: true });
  // 检测用户数据
  const uidDB = await TSUserAccount.account.getAllUid();
  if (uidDB.length === 0) {
    showSnackbar({ text: "未检测到可用UID，请重新登录!", color: "warn" });
    return;
  }
  // 然后获取最近的UID
  if (userStore.uid.value === undefined || !uidDB.includes(userStore.uid.value)) {
    userStore.uid.value = uidDB[0];
  }
  const curAccount = await TSUserAccount.account.getAccount(userStore.uid.value);
  if (curAccount === false) {
    showSnackbar({ text: `未获取到${userStore.uid.value}账号数据`, color: "error" });
    await TGLogger.Error(`[App][listenOnInit] 获取${userStore.uid.value}账号数据失败`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } else {
    userStore.briefInfo.value = curAccount.brief;
    userStore.cookie.value = curAccount.cookie;
  }
  const curGameAccount = await TSUserAccount.game.getCurAccount(userStore.uid.value);
  if (curGameAccount === false) {
    showSnackbar({ text: `未获取到${userStore.uid.value}游戏数据`, color: "error" });
    await TGLogger.Error(`[App][listenOnInit] 获取${userStore.uid.value}游戏数据失败`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } else {
    userStore.account.value = curGameAccount;
  }
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
      showSnackbar({ text: "无效的 deep link！", color: "error", timeout: 3000 });
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
      showSnackbar({ text: "已在当前页面！", color: "warn", timeout: 3000 });
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
      text: "是否更新数据库数据？（请确保成就数据已导出）",
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
    showSnackbar({ text: "数据库已更新！", color: "success", timeout: 3000 });
    // todo 6.0发版时取消注释
    // window.open("https://app.btmuli.ink/docs/Changelogs.html");
  }
}

onUnmounted(() => {
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
  if (urlListener !== null) {
    urlListener();
    urlListener = null;
  }
});
</script>
<style lang="css" scoped>
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
