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
import TSidebar from "./components/app/t-sidebar.vue";
import TBackTop from "./components/app/t-backTop.vue";
// tauri
import { app, event, fs, window } from "@tauri-apps/api";
// store
import { useAppStore } from "./store/modules/app";

const appStore = useAppStore();
const isMain = ref<boolean>(false);
const theme = ref<string>(appStore.theme);

onBeforeMount(async () => {
  // 获取当前窗口
  const win = window.getCurrent();
  isMain.value = win.label === "tauri-genshin";
  if (isMain.value) {
    const title = "Tauri.Genshin v" + (await app.getVersion()) + " Beta";
    await win.setTitle(title);
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

async function checkLoad(): Promise<void> {
  if (appStore.loading) {
    console.info("数据已加载！");
    return;
  }
  await createDataDir();
  appStore.loading = true;
  console.info("数据加载完成！");
}

// 创建数据文件夹
async function createDataDir(): Promise<void> {
  console.info("开始创建数据文件夹...");
  // 如果不存在则创建
  if (!(await fs.exists("userData", { dir: fs.BaseDirectory.AppLocalData }))) {
    await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
  }
  // todo 弃置 tempData dir
  if (!(await fs.exists("tempData", { dir: fs.BaseDirectory.AppLocalData }))) {
    await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
  }
  console.info("数据文件夹创建完成！");
}
</script>
<style lang="css">
.app-container {
  height: 100%;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}
</style>
