<template>
  <v-app v-model:theme="vuetifyTheme">
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
import TBackTop from "@comp/app/t-backTop.vue";
import TSidebar from "@comp/app/t-sidebar.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import OtherApi from "@req/otherReq.js";
import TGSqlite from "@Sql/index.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { app, core, event, webviewWindow } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { mkdir } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getBuildTime } from "@utils/TGBuild.js";
import TGLogger from "@utils/TGLogger.js";
import { getWindowSize, resizeWindow } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { theme, needResize, deviceInfo, isLogin, userDir, buildTime } = storeToRefs(useAppStore());
const { uid, briefInfo, account, cookie } = storeToRefs(useUserStore());
const isMain = ref<boolean>(false);
const vuetifyTheme = computed<string>(() => (theme.value === "dark" ? "dark" : "light"));

let themeListener: UnlistenFn | null = null;
let urlListener: UnlistenFn | null = null;
let resizeListener: UnlistenFn | null = null;

onMounted(async () => {
  const win = getCurrentWindow();
  isMain.value = win.label === "TeyvatGuide";
  if (isMain.value) {
    const title = "Teyvat Guide v" + (await app.getVersion()) + " Beta";
    await win.setTitle(title);
    await listenOnInit();
    await core.invoke("init_app");
    urlListener = await getDeepLink();
  }
  if (needResize.value !== "false") await resizeWindow();
  document.documentElement.className = theme.value;
  themeListener = await event.listen<string>("readTheme", (e: Event<string>) => {
    theme.value = e.payload;
    document.documentElement.className = theme.value;
  });
  resizeListener = await event.listen<string>("needResize", async (e: Event<string>) => {
    console.log(needResize.value);
    const windowCur = webviewWindow.getCurrentWebviewWindow();
    if (e.payload !== "false") {
      await resizeWindow();
    } else {
      const size = getWindowSize(windowCur.label);
      await windowCur.setSize(new LogicalSize(size.width, size.height));
      await windowCur.setZoom(1);
    }
    await windowCur.center();
  });
  await getCurrentWindow().show();
});

// 启动后只执行一次的监听
async function listenOnInit(): Promise<void> {
  console.info("[App][listenOnInit] 监听初始化事件！");
  await event.listen<void>("initApp", async () => {
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
  if (!checkDB) await TGSqlite.update();
  else await TGLogger.Info("[App][checkAppLoad] 数据库已成功加载！");
}

// 检测 deviceFp
async function checkDeviceFp(): Promise<void> {
  const appData = await TGSqlite.getAppData();
  const deviceFind = appData.find((item) => item.key === "deviceInfo");
  if (typeof deviceFind === "undefined") {
    if (deviceInfo.value.device_fp === "0000000000000") {
      deviceInfo.value = await OtherApi.fp(deviceInfo.value);
    }
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(deviceInfo.value));
    return;
  }
  if (JSON.parse(deviceFind.value) !== deviceInfo.value) {
    deviceInfo.value = JSON.parse(deviceFind.value);
  }
}

async function checkUserLoad(): Promise<void> {
  // 检测用户数据目录
  const appData = await TGSqlite.getAppData();
  const userDirGet = appData.find((item) => item.key === "userDir")?.value;
  if (typeof userDirGet === "undefined") await TGSqlite.saveAppData("userDir", userDir.value);
  else if (userDirGet !== userDir.value) userDir.value = userDirGet;
  await mkdir(userDir.value, { recursive: true });
  // 检测用户数据
  const uidDB = await TSUserAccount.account.getAllUid();
  if (uidDB.length === 0 && isLogin.value) {
    showSnackbar.warn("未检测到可用UID，请重新登录！");
    isLogin.value = false;
    return;
  }
  if (!isLogin.value) isLogin.value = true;
  // 然后获取最近的UID
  if (uid.value === undefined || !uidDB.includes(uid.value)) {
    uid.value = uidDB[0];
  }
  const curAccount = await TSUserAccount.account.getAccount(uid.value);
  if (curAccount === false) {
    showSnackbar.error(`未获取到${uid.value}的账号数据！`);
    await TGLogger.Error(`[App][listenOnInit] 获取${uid.value}账号数据失败`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  } else {
    briefInfo.value = curAccount.brief;
    cookie.value = curAccount.cookie;
  }
  const curGameAccount = await TSUserAccount.game.getCurAccount(uid.value);
  if (curGameAccount !== false) {
    account.value = curGameAccount;
    return;
  }
  showSnackbar.error(`未获取到${uid.value}的游戏数据！`);
  await TGLogger.Error(`[App][listenOnInit] 获取${uid.value}游戏数据失败`);
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));
}

async function getDeepLink(): Promise<UnlistenFn> {
  return await event.listen<string>("active_deep_link", async (e: Event<string>) => {
    const windowGet = new webviewWindow.WebviewWindow("TeyvatGuide");
    if (await windowGet.isMinimized()) await windowGet.unminimize();
    await windowGet.setFocus();
    const payload = parseDeepLink(e.payload);
    if (payload === false) {
      showSnackbar.error("无效的 deep link！", 3000);
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
    const curPath = router.currentRoute.value.path;
    if (curPath === routerPath) {
      showSnackbar.warn("已在当前页面！", 3000);
      return;
    }
    await router.push({ path: routerPath, query: {} });
    window.location.pathname = routerPath;
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
  // @ts-expect-error-next-line
  const isProdEnv = import.meta.env.MODE === "production";
  const needUpdate = await TGSqlite.checkUpdate();
  if (needUpdate && isProdEnv) {
    await TGLogger.Info("[App][checkUpdate] 检测到版本更新！");
    const updateCheck = await showDialog.check("检测到版本更新", "是否更新数据库数据？");
    if (!updateCheck) {
      showSnackbar.error("请到设置页手动更新数据库！", 3000);
      return;
    }
    buildTime.value = getBuildTime();
    await TGSqlite.update();
    showSnackbar.success("数据库已更新！", 3000);
    await openUrl("https://app.btmuli.ink/docs/TeyvatGuide/changelogs.html");
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
  if (resizeListener !== null) {
    resizeListener();
    resizeListener = null;
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
