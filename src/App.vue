<!--主界面 -->
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
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import OtherApi from "@req/otherReq.js";
import type { FeedbackInternalOptions, Integration } from "@sentry/core";
import * as Sentry from "@sentry/vue";
import { commands } from "@skipperndt/plugin-machine-uid";
import TGSqlite from "@Sql/index.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { app, core, event, webviewWindow } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { type CliMatches, getMatches } from "@tauri-apps/plugin-cli";
import { mkdir } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import TGLogger from "@utils/TGLogger.js";
import { getWindowSize, resizeWindow } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { theme, needResize, deviceInfo, isLogin, userDir, buildTime, closeToTray, showFeedback } =
  storeToRefs(useAppStore());
const { uid, briefInfo, account, cookie } = storeToRefs(useUserStore());

const isMain = ref<boolean>(false);
const vuetifyTheme = computed<string>(() => (theme.value === "dark" ? "dark" : "light"));

let themeListener: UnlistenFn | null = null;
let dpListener: UnlistenFn | null = null;
let resizeListener: UnlistenFn | null = null;
let yaeListener: UnlistenFn | null = null;
let closeListener: UnlistenFn | null = null;
let textScaleListener: UnlistenFn | null = null;
let yaeFlag: Array<string> = [];

onMounted(async () => {
  const win = getCurrentWindow();
  isMain.value = win.label === "TeyvatGuide";
  if (isMain.value) {
    const title = "Teyvat Guide v" + (await app.getVersion()) + " Beta";
    await win.setTitle(title);
    await listenOnInit();
    dpListener = await event.listen<string>("active_deep_link", handleDpListen);
    yaeListener = await event.listen<TGApp.Plugins.Yae.RsEvent>("yae_read", handleYaeListen);
    closeListener = await event.listen("main-window-close-requested", handleWindowClose);
    await nextTick();
    await core.invoke("init_app");
  }
  if (needResize.value !== "false") await resizeWindow();
  document.documentElement.className = theme.value;
  themeListener = await event.listen<string>("readTheme", handleThemeListen);
  resizeListener = await event.listen<string>("needResize", handleResizeListen);
  textScaleListener = await event.listen<void>("text_scale_change", resizeWindow);
  const isShow = await win.isVisible();
  if (!isShow) {
    await win.center();
    await win.show();
  }
  if (showFeedback.value) {
    Sentry.addIntegration(getSentryFeedback());
  }
});

onUnmounted(() => {
  if (dpListener !== null) {
    dpListener();
    dpListener = null;
  }
  if (yaeListener !== null) {
    yaeListener();
    yaeListener = null;
  }
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
  if (resizeListener !== null) {
    resizeListener();
    resizeListener = null;
  }
  if (closeListener !== null) {
    closeListener();
    closeListener = null;
  }
  if (textScaleListener !== null) {
    textScaleListener();
    textScaleListener = null;
  }
});

function getSentryFeedback(): Integration {
  return Sentry.feedbackAsyncIntegration(<FeedbackInternalOptions>{
    // 🌗 主题与注入行为
    colorScheme: "system",
    autoInject: true,
    triggerLabel: "",

    // 📝 表单标题与按钮文案
    formTitle: "问题反馈",
    cancelButtonLabel: "取消",
    submitButtonLabel: "提交反馈",
    successMessageText: "感谢您的反馈，我们将尽快处理。",

    // 🧑 用户信息字段
    nameLabel: "反馈人",
    namePlaceholder: "请输入您的姓名或昵称",
    emailLabel: "电子邮箱",
    emailPlaceholder: "请输入您的邮箱地址，以便我们与您联系",

    // 🐛 问题描述字段
    messageLabel: "问题描述",
    messagePlaceholder: "请详细描述您遇到的问题及复现步骤",
    isRequiredLabel: "（必填）",

    // 📸 截图工具相关
    addScreenshotButtonLabel: "添加当前页面截图",
    removeScreenshotButtonLabel: "移除截图",
    highlightToolText: "标记重点区域",
    removeHighlightText: "移除标记",
    hideToolText: "遮挡敏感信息",
  });
}

/**
 * 自定义URL协议监听处理
 * @param {Event<string>} event - 事件
 * @returns {Promise<void>}
 */
async function handleDpListen(event: Event<string>): Promise<void> {
  const windowGet = new webviewWindow.WebviewWindow("TeyvatGuide");
  if (await windowGet.isMinimized()) await windowGet.unminimize();
  if (!(await windowGet.isVisible())) await windowGet.show();
  await windowGet.setFocus();
  const payload = await parseDeepLink(event.payload);
  if (payload === false) {
    showSnackbar.error("无效的 deep link！", 3000);
    await TGLogger.Error(`[App][getDeepLink] 无效的 deep link！ ${JSON.stringify(event.payload)}`);
    return;
  }
  await TGLogger.Info(`[App][getDeepLink] ${event.payload}`);
  await handleDeepLink(payload);
}

/**
 * Yae监听处理
 * @param {Event<TGApp.Plugins.Yae.RsEvent>} event
 * @returns {Promise<void>}
 */
async function handleYaeListen(event: Event<TGApp.Plugins.Yae.RsEvent>): Promise<void> {
  if (event.payload.type === "achievement") {
    await loadYaeAchi(event.payload.uid, JSON.parse(event.payload.data));
    if (!yaeFlag.includes("achievement")) yaeFlag.push("achievement");
  } else if (event.payload.type === "store") {
    await loadYaeBag(event.payload.uid, JSON.parse(event.payload.data));
    if (!yaeFlag.includes("store")) yaeFlag.push("store");
  } else if (event.payload.type === "prop") {
    await loadYaeProp(event.payload.uid, JSON.parse(event.payload.data));
    if (!yaeFlag.includes("prop")) yaeFlag.push("prop");
  }
  if (yaeFlag.length === 3) {
    yaeFlag = [];
    showSnackbar.success(`导入Yae数据完成，即将刷新页面`);
    await showLoading.end();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    window.location.reload();
  }
}

/**
 * 导入成就
 * @param {string} uid - 存档UID
 * @param {TGApp.Plugins.Yae.AchiListRes} data - 成就数据
 * @returns {Promise<void>}
 */
async function loadYaeAchi(uid: string, data: TGApp.Plugins.Yae.AchiListRes): Promise<void> {
  console.warn("成就数据", data);
  await showLoading.start("正在导入成就数据", `UID:${uid},数量:${data.length}`);
  await TGLogger.Info(`[App][loadYaeAchi] 开始处理 ${uid} 的 ${data.length} 条成就数据`);
  try {
    await TSUserAchi.mergeUiaf(data, Number(uid));
    showSnackbar.success(`成功导入 ${uid} 的 ${data.length}条成就数据`);
    await TGLogger.Info(`[App][loadYaeAchi] 成功导入 ${uid} 的 ${data.length} 条成就数据`);
  } catch (e) {
    console.error(e);
    await TGLogger.Error(`[App][loadYaeAchi] 成就导入失败：${e}`);
  }
}

/**
 * 导入材料
 * @param {string} uid
 * @param {TGApp.Plugins.Yae.BagListRes} data - 背包数据
 * @returns {Promise<void>}
 */
async function loadYaeBag(uid: string, data: TGApp.Plugins.Yae.BagListRes): Promise<void> {
  const listM = data.filter((i) => i.kind === "material");
  const listW = data.filter((i) => i.kind === "weapon");
  const listR = data.filter((i) => i.kind === "reliquary");
  await TGLogger.Info(`[App][loadYaeBag] 接收到 ${uid} 的背包数据`);
  await TGLogger.Info(
    `[App][loadYaeBag] 材料：${listM.length},武器：${listW.length},圣遗物：${listR.length}`,
  );
  await showLoading.start("正在导入材料数据", `UID:${uid},数量:${listM.length}`);
  try {
    const now = new Date();
    const skip = await TSUserBagMaterial.saveYaeData(Number(uid), listM);
    const cost = new Date().getTime() - now.getTime();
    await TGLogger.Info(`[App][loadYaeBag] Skip: ${skip}`);
    if (skip === 0) {
      showSnackbar.success(`成功导入 ${listM.length} 条数据，耗时 ${Math.floor(cost / 1000)}s`);
    } else if (skip === listM.length) {
      showSnackbar.success(`未检测到数据更新，耗时 ${Math.floor(cost / 1000)}s`);
    } else {
      showSnackbar.success(
        `成功更新 ${listM.length - skip} 条数据，耗时 ${Math.floor(cost / 1000)}s`,
      );
    }
  } catch (e) {
    console.error(e);
    await TGLogger.Error(`[App][loadYaeBag] 导入材料失败：${e}`);
  }
}

/**
 * 处理属性
 * @param uid - 用户UID
 * @param data - 属性数据
 * @returns 无返回值
 */
async function loadYaeProp(uid: string, data: TGApp.Plugins.Yae.PropRes): Promise<void> {
  for (const [k, v] of Object.entries(data)) {
    await TSUserBagMaterial.saveYaeCoin(Number(uid), Number(k), v);
  }
}

/**
 * 主题监听处理
 * @param {Event<string>} event - 事件
 * @returns {void}
 */
function handleThemeListen(event: Event<string>): void {
  theme.value = event.payload;
  document.documentElement.className = theme.value;
}

/**
 * 窗口适配监听处理
 * @param {Event<string>} event 事件
 * @returns {Promise<void>}
 */
async function handleResizeListen(event: Event<string>): Promise<void> {
  const win = getCurrentWindow();
  const webview = webviewWindow.getCurrentWebviewWindow();
  if (event.payload !== "false") {
    await resizeWindow();
  } else {
    const size = getWindowSize(webview.label);
    await win.setSize(new LogicalSize(size.width, size.height));
    await webview.setZoom(1);
  }
  await win.center();
}

// 启动后只执行一次的监听
async function listenOnInit(): Promise<void> {
  console.info("[App][listenOnInit] 监听初始化事件！");
  await event.listen<void>("initApp", async () => {
    await setSentryUser();
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
    try {
      await handleCommands(await getMatches());
    } catch (e) {
      console.error("获取启动参数异常");
      console.error(e);
    }
  });
}

async function setSentryUser(): Promise<void> {
  const deviceRes = await commands.getMachineUid();
  if (deviceRes.status === "ok") Sentry.setUser({ id: deviceRes.data.id! });
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

async function parseDeepLink(payload: string | Array<string>): Promise<string | false> {
  try {
    if (typeof payload === "string") return payload;
    if (payload.length < 2) return "teyvatguide://";
    return payload[1];
  } catch (e) {
    if (e instanceof Error) {
      await TGLogger.Error(`[App][parseDeepLink] ${e.name}: ${e.message}`);
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
    // @ts-expect-error import.meta
    buildTime.value = import.meta.env.VITE_BUILD_TIME;
    await TGSqlite.update();
    showSnackbar.success("数据库已更新！", 3000);
    await openUrl("https://app.btmuli.ink/docs/TeyvatGuide/changelogs.html");
  }
}

/**
 * 处理主窗口关闭请求
 * @since Beta v0.8.8
 * @returns {Promise<void>}
 */
async function handleWindowClose(): Promise<void> {
  try {
    // 根据用户设置决定是隐藏到托盘还是退出应用
    if (closeToTray.value) {
      await core.invoke("hide_main_window");
    } else {
      await core.invoke("quit_app");
    }
  } catch (e) {
    if (e instanceof Error) {
      await TGLogger.Error(`[App][handleWindowClose] ${e.name}: ${e.message}`);
    } else console.error(e);
  }
}

// 处理命令行参数
async function handleCommands(cmds: CliMatches): Promise<void> {
  if (cmds.subcommand === null) return;
  Sentry.logger.info(`捕获到启动参数:${JSON.stringify(cmds)}`);
  // 用户脚本
  if (cmds.subcommand.name === "us") {
    const usMatch = cmds.subcommand.matches;
    await router.push({
      name: "实用脚本",
      query: {
        auto: "true",
        uids: <Array<string>>usMatch.args.uids.value ?? [],
        exit: `${usMatch.args.exit.value ?? false}`,
        skip: `${usMatch.args.skip.value ?? false}`,
      },
    });
  } else if (cmds.subcommand.name === "srs") {
    needResize.value = "true";
  }
}
</script>
<style lang="css" scoped>
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
