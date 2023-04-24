<template>
  <div v-if="isMain">
    <v-layout>
      <!-- 侧边栏菜单 -->
      <TSidebar />
      <!-- 主体内容 -->
      <v-main class="app-main">
        <v-container fluid>
          <router-view />
        </v-container>
      </v-main>
    </v-layout>
  </div>
  <div v-else>
    <v-layout>
      <!-- 主体内容 -->
      <v-main class="app-main">
        <v-container fluid>
          <router-view />
        </v-container>
      </v-main>
    </v-layout>
  </div>
  <TBackTop />
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TSidebar from "./components/t-sidebar.vue";
import TBackTop from "./components/t-backTop.vue";
// tauri
import { fs, window, app, event } from "@tauri-apps/api";
// store
import { useAppStore } from "./store/modules/app";
import { useAchievementsStore } from "./store/modules/achievements";
// utils
import { getBuildTime } from "./utils/TGBuild";
// data
import { restoreUiafData } from "./utils/UIAF";
import TGSqlite from "./core/database/TGSqlite";

const appStore = useAppStore();
const isMain = ref(true as boolean);
const theme = ref(appStore.theme as string);

onMounted(async () => {
  // 获取当前主题
  document.documentElement.className = theme.value;
  await listenOnTheme();
  // 获取当前窗口
  const win = window.getCurrent();
  isMain.value = win.label === "tauri-genshin";
  if (isMain.value) {
    const title = "Tauri.Genshin v" + (await app.getVersion()) + " Alpha";
    await win.setTitle(title);
    await checkLoad();
  }
});

// 监听主题变化
async function listenOnTheme () {
  await event.listen("readTheme", (e) => {
    const themeGet = e.payload as string;
    if (theme.value !== themeGet) {
      theme.value = themeGet;
      document.documentElement.className = theme.value;
    }
  });
}

async function checkLoad () {
  const localBuildTime = appStore.buildTime;
  const buildTime = getBuildTime();
  if (!buildTime.startsWith("dev")) {
    if (localBuildTime.startsWith("dev") || localBuildTime < buildTime) {
      appStore.buildTime = buildTime;
      console.info("数据已过期，开始加载数据...");
      appStore.loading = false;
    }
  }
  if (appStore.loading) {
    console.info("数据已加载！");
    return;
  }
  await createDataDir();
  await writeDB();
  await writeData();
  appStore.loading = true;
  console.info("数据加载完成！");
}
// 创建数据文件夹
async function createDataDir () {
  console.info("开始创建数据文件夹...");
  // 如果不存在则创建
  if (!await fs.exists("userData", { dir: fs.BaseDirectory.AppLocalData })) { await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData, recursive: true }); }
  if (!await fs.exists("tempData", { dir: fs.BaseDirectory.AppLocalData })) { await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData, recursive: true }); }
  console.info("数据文件夹创建完成！");
}
// 写入 IndexedDB
async function writeDB () {
  const res = await TGSqlite.checkDB();
  if (!res) {
    console.info("检测到数据库不完整，正在重置数据库...");
    await TGSqlite.resetDB();
  } else {
    console.info("正在更新成就系列数据...");
    await TGSqlite.update.achievementSeries();
    console.info("正在更新成就数据...");
    await TGSqlite.update.achievement();
  }
}
// 恢复数据
async function writeData () {
  console.info("开始恢复数据...");
  const res = await restoreUiafData();
  if (res !== false) {
    const { total, fin } = res;
    console.info("开始恢复成就数据...");
    const achievementsStore = useAchievementsStore();
    achievementsStore.flushData(total, fin);
    console.info("成就数据恢复完成！");
  } else {
    console.info("未找到成就数据！");
  }
}
</script>
<style lang="css">
.app-main {
  min-height: 100vh;
  background: var(--page-bg);
  backdrop-filter: blur(20px);
}
</style>
