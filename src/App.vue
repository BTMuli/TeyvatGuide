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
import { storeToRefs } from "pinia";
import { computed, onBeforeMount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import TBackTop from "./components/app/t-backTop.vue";
import TSidebar from "./components/app/t-sidebar.vue";
import showConfirm from "./components/func/confirm";
import showSnackbar from "./components/func/snackbar";
import TGSqlite from "./plugins/Sqlite";
import { useAppStore } from "./store/modules/app";
import { useUserStore } from "./store/modules/user";
import { getBuildTime } from "./utils/TGBuild";
import TGRequest from "./web/request/TGRequest";

const appStore = useAppStore();
const userStore = storeToRefs(useUserStore());
const isMain = ref<boolean>(false);
const theme = ref<string>(appStore.theme);
const router = useRouter();
const vuetifyTheme = computed(() => {
  return appStore.theme === "dark" ? "dark" : "light";
});

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
    await checkAppLoad();
    await checkDeviceFp();
    try {
      await checkUserLoad();
    } catch (error) {
      console.error(error);
    }
    await checkUpdate();
  });
  return;
}

async function checkAppLoad(): Promise<void> {
  if (!appStore.loading) {
    await resetDB();
    return;
  }
  let checkDB = false;
  try {
    checkDB = await TGSqlite.check();
  } catch (error) {
    console.error(error);
  }
  if (!checkDB) {
    await resetDB();
  } else {
    console.info("数据库已加载！");
  }
}

async function resetDB(): Promise<void> {
  await TGSqlite.reset();
  showSnackbar({
    text: "检测到数据库不完整！已重置数据库！",
    color: "error",
    timeout: 3000,
  });
  await createDataDir();
  appStore.loading = true;
}

// 检测 deviceFp
async function checkDeviceFp(): Promise<void> {
  const appData = await TGSqlite.getAppData();
  const deviceInfo = appData.find((item) => item.key === "deviceInfo")?.value;
  const deviceLocal = appStore.deviceInfo;
  if (deviceInfo === undefined) {
    if (deviceLocal.device_fp === "0000000000000") {
      // 获取 deviceFp
      appStore.deviceInfo = await TGRequest.Device.getFp(appStore.deviceInfo);
      console.info("deviceInfo 已重新获取！");
    }
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(deviceLocal));
    console.info("deviceInfo 数据已插入！");
  } else if (JSON.parse(deviceInfo) !== deviceLocal) {
    appStore.deviceInfo = JSON.parse(deviceInfo);
    console.info("deviceInfo 数据已加载！");
  } else {
    console.info("deviceInfo 数据已同步！");
  }
}

// 检测 ck,info 数据
async function checkUserLoad(): Promise<void> {
  const ckDB = await TGSqlite.getCookie();
  if (JSON.stringify(ckDB) === "{}" && appStore.isLogin) {
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
    appStore.isLogin = false;
    return;
  }
  if (JSON.stringify(ckDB) !== "{}" && !appStore.isLogin) {
    appStore.isLogin = true;
  }

  const ckLocal = userStore.cookie;
  if (JSON.stringify(ckLocal) !== JSON.stringify(ckDB)) {
    userStore.cookie.value = ckDB;
    console.info("cookie 数据已更新！");
  } else {
    console.info("cookie 数据已加载！");
  }
  const infoLocal = userStore.briefInfo.value;
  const appData = await TGSqlite.getAppData();
  const infoDB = appData.find((item) => item.key === "userInfo")?.value;
  if (infoDB === undefined && JSON.stringify(infoLocal) !== "{}") {
    await TGSqlite.saveAppData("userInfo", JSON.stringify(infoLocal));
  } else if (infoDB !== undefined && infoLocal !== JSON.parse(infoDB)) {
    userStore.briefInfo.value = JSON.parse(infoDB);
    console.info("briefInfo 数据已更新！");
  } else {
    console.info("briefInfo 数据已加载！");
  }
  const accountLocal = userStore.account.value;
  const accountDB = await TGSqlite.getCurAccount();
  if (accountDB === false) {
    if (appStore.isLogin) {
      showSnackbar({
        text: "获取 GameAccount 失败！请尝试更新数据库！",
        color: "error",
        timeout: 3000,
      });
    }
    return;
  }
  if (accountDB !== accountLocal) {
    userStore.account.value = accountDB;
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

// 检测更新
async function checkUpdate(): Promise<void> {
  if (!appStore.loading) return;
  const isProdEnv = import.meta.env.MODE === "production";
  const needUpdate = await TGSqlite.checkUpdate();
  if (needUpdate && isProdEnv) {
    const confirm = await showConfirm({
      title: "检测到版本更新",
      text: "请到设置页手动更新版本，即将弹出更新说明子页面",
    });
    if (!confirm) {
      showSnackbar({
        text: "请到设置页手动更新版本！",
        color: "error",
        timeout: 3000,
      });
      return;
    }
    appStore.buildTime = getBuildTime();
    window.open("https://app.btmuli.ink/docs/Changelogs.html");
  }
}
</script>
<style lang="css">
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
