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
// vue
import { onBeforeMount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import TSidebar from "./components/app/t-sidebar.vue";
import TBackTop from "./components/app/t-backTop.vue";
// tauri
import { app, event, fs, tauri, window as TauriWindow } from "@tauri-apps/api";
// store
import { useAppStore } from "./store/modules/app";
// utils
import { getEmojis } from "./plugins/Mys/request/getEmojis";
import showSnackbar from "./components/func/snackbar";
import TGSqlite from "./plugins/Sqlite";

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
    await tauri.invoke("register_deep_link");
    await getDeepLink();
    await win.setTitle(title);
    await emojiLoad();
    await checkLoad();
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

async function checkLoad(): Promise<void> {
  if (appStore.loading) {
    console.info("数据已加载！");
    return;
  }
  await createDataDir();
  await initData();
  appStore.loading = true;
  console.info("数据加载完成！");
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
  if (appStore.devEnv) {
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
  await event.listen("active_deep_link", (e) => {
    new TauriWindow.WebviewWindow("TeyvatGuide")
      .setFocus()
      .then(async () => {
        // 导入格式: teyvatgiude://import_uigf?app=appName
        // 跳转格式: localhost:4000/achievements/?app=appName
        if ((<string>e.payload).startsWith("teyvatguide://import_uigf")) {
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
          window.location.reload();
        } else {
          showSnackbar({
            text: "无效的 deep link！",
            color: "error",
            timeout: 3000,
          });
        }
      })
      .catch((e) => {
        console.log(e);
      });
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
