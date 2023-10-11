<template>
  <v-app>
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
import { onBeforeMount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import TBackTop from "./components/app/t-backTop.vue";
import TSidebar from "./components/app/t-sidebar.vue";
import showSnackbar from "./components/func/snackbar";
import { getEmojis } from "./plugins/Mys/request/getEmojis";
import TGSqlite from "./plugins/Sqlite";
import { useAppStore } from "./store/modules/app";
import { useUserStore } from "./store/modules/user";

const appStore = useAppStore();
const isMain = ref<boolean>(false);
const theme = ref<string>(appStore.theme);
const router = useRouter();

onBeforeMount(async () => {
  // 获取当前窗口
  const win = TauriWindow.getCurrent();
  isMain.value = win.label === "TeyvatGuide";
  if (isMain.value) {
    const title = "Teyvat Guide v" + (await app.getVersion()) + " Beta";
    await win.setTitle(title);
    await listenOnInit();
    await tauri.invoke("init_app");
  }
});

onMounted(async () => {
  // 获取当前主题
  document.documentElement.className = theme.value;
  await listenOnTheme();
});

// 监听主题变化
async function listenOnTheme(): Promise<void> {
  await event.listen("readTheme", (e) => {
    const themeGet = <string>e.payload;
    if (theme.value !== themeGet) {
      theme.value = themeGet;
      document.documentElement.className = theme.value;
    }
  });
}

// 启动后只执行一次的监听
async function listenOnInit(): Promise<void> {
  await event.listen("initApp", async () => {
    await tauri.invoke("register_deep_link");
    await getDeepLink();
    await emojiLoad();
    await checkAppLoad();
    await checkUserLoad();
  });
  return;
}

async function emojiLoad(): Promise<void> {
  const res = await getEmojis();
  if ("retcode" in res) {
    console.error(res);
    showSnackbar({
      text: "表情包加载失败！",
      color: "error",
      timeout: 3000,
    });
  } else {
    localStorage.setItem("emojis", JSON.stringify(res));
  }
}

async function checkAppLoad(): Promise<void> {
  if (appStore.loading) {
    console.info("数据已加载！");
    return;
  }
  await createDataDir();
  await initData();
  appStore.loading = true;
  console.info("数据加载完成！");
}

// 检测 ck,info 数据
async function checkUserLoad(): Promise<void> {
  const userStore = useUserStore();
  const ckLocal = userStore.cookie;
  const ckDB = await TGSqlite.getCookie();
  if (JSON.stringify(ckLocal) !== JSON.stringify(ckDB)) {
    userStore.cookie = ckDB;
    console.info("cookie 数据已更新！");
  } else if (JSON.stringify(ckLocal) === "{}") {
    await new Promise((resolve) => {
      setTimeout(() => {
        showSnackbar({
          text: "获取 Cookie 失败！请重新登录！",
          color: "error",
          timeout: 3000,
        });
        resolve(true);
      }, 3000);
    });
  } else {
    console.info("cookie 数据已加载！");
  }
  const infoLocal = userStore.briefInfo;
  const appData = await TGSqlite.getAppData();
  const infoDB = appData.find((item) => item.key === "userInfo")?.value;
  if (infoDB === undefined && JSON.stringify(infoLocal) !== "{}") {
    await TGSqlite.saveAppData("userInfo", JSON.stringify(infoLocal));
  } else if (infoDB !== undefined && infoLocal !== JSON.parse(infoDB)) {
    userStore.setBriefInfo(JSON.parse(infoDB));
    console.info("briefInfo 数据已更新！");
  } else {
    console.info("briefInfo 数据已加载！");
  }
  const accountLocal = userStore.getCurAccount();
  const accountDB = await TGSqlite.getCurAccount();
  if (accountDB === false) {
    showSnackbar({
      text: "获取 GameAccount 失败！请尝试更新数据库！",
      color: "error",
      timeout: 3000,
    });
    return;
  }
  if (accountDB !== accountLocal) {
    userStore.setCurAccount(accountDB);
    console.info("curAccount 数据已更新！");
  } else {
    console.info("curAccount 数据已加载！");
  }
}

// 创建数据文件夹
async function createDataDir(): Promise<void> {
  if (!(await fs.exists("userData", { dir: fs.BaseDirectory.AppLocalData }))) {
    await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
  }
  console.info("数据文件夹创建完成！");
}

// 初始化数据库
async function initData(): Promise<void> {
  if (import.meta.env.MODE === "development") {
    console.info("开发环境，跳过数据库初始化！");
    return;
  }
  await TGSqlite.reset();
  showSnackbar({
    text: "已成功初始化数据库！",
  });
  console.info("已成功初始化数据库！");
}

async function getDeepLink(): Promise<void> {
  await event.listen("active_deep_link", async (e) => {
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
      return;
    }
    if (e.payload === "") return;
    // 导入格式: teyvatguide://import_uigf?app=appName
    // 跳转格式: localhost:4000/achievements/?app=appName
    if (e.payload.startsWith("teyvatguide://import_uigf")) {
      const param = (<string>e.payload).split("teyvatguide://import_uigf/?")[1];
      let appName = "";
      if (param) {
        appName = param.split("app=")[1];
      }
      if (appName === "") {
        await router.push("/achievements");
      } else {
        await router.push("/achievements/?app=" + appName);
      }
    } else {
      showSnackbar({
        text: "无效的 deep link！",
        color: "error",
        timeout: 3000,
      });
    }
  });
}
</script>
<style lang="css">
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
