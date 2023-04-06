<template>
  <div v-if="loading">
    <TLoading />
  </div>
  <div v-else>
    <v-list class="config-list">
      <v-list-subheader inset class="config-header">
        应用信息
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
        <template #prepend>
          <img class="config-icon" src="/platforms/tauri.webp" alt="Tauri">
        </template>
        <template #append>
          <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <img class="config-icon" src="/icon.webp" alt="App">
        </template>
        <v-list-item-title>
          应用版本
          <v-btn
            class="card-btn" size="small"
            @click="toOuter('https://github.com/BTMuli/Tauri.Genshin/releases/latest')"
          >
            Alpha
          </v-btn>
        </v-list-item-title>
        <template #append>
          <v-list-item-subtitle>{{ versionApp }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="成就版本">
        <template #prepend>
          <img class="config-icon" src="../assets/icons/achievements.svg" alt="Achievements">
        </template>
        <template #append>
          <v-list-item-subtitle>{{ achievementsStore.lastVersion }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-subheader inset class="config-header">
        系统信息
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item title="系统平台">
        <template #prepend>
          <v-icon>mdi-desktop-classic</v-icon>
        </template>
        <template #append>
          <v-list-item-subtitle>{{ osPlatform }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-item title="系统版本">
        <template #prepend>
          <v-icon>mdi-desktop-classic</v-icon>
        </template>
        <template #append>
          <v-list-item-subtitle>{{ osVersion }}</v-list-item-subtitle>
        </template>
      </v-list-item>
      <v-list-subheader inset class="config-header">
        设置
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item prepend-icon="mdi-folder" title="打开用户数据目录" @click="openMergeData" />
      <v-list-item prepend-icon="mdi-delete" title="清除用户缓存" @click="tryConfirm('delUser')" />
      <v-list-item prepend-icon="mdi-delete" title="清除临时数据" @click="tryConfirm('delTemp')" />
      <v-list-item prepend-icon="mdi-cog" title="恢复默认设置" @click="tryConfirm('delApp')" />
      <v-list-subheader inset class="config-header">
        调试
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item title="开发者模式" subtitle="开启后将显示调试信息">
        <template #prepend>
          <v-icon>mdi-bug</v-icon>
        </template>
        <template #append>
          <v-switch
            v-model="appStore.devMode" :label="appStore.devMode ? '开启' : '关闭'" inset color="#FAC51E"
            @click="submitDevMode"
          />
        </template>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <v-icon>mdi-view-dashboard</v-icon>
        </template>
        <v-select v-model="showHome" :items="homeStore.getShowItems()" label="首页显示组件" multiple chips />
        <template #append>
          <v-btn class="card-btn" @click="submitHome">
            <template #prepend>
              <img src="../assets/icons/circle-check.svg" alt="check">
              提交
            </template>
          </v-btn>
        </template>
      </v-list-item>
      <v-list-subheader inset class="config-header">
        路径
      </v-list-subheader>
      <v-divider inset class="border-opacity-75" />
      <v-list-item prepend-icon="mdi-folder">
        <v-list-item-title>本地应用数据路径</v-list-item-title>
        <v-list-item-subtitle>{{ appStore.dataPath.appDataDir }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item prepend-icon="mdi-folder">
        <v-list-item-title>本地用户数据路径</v-list-item-title>
        <v-list-item-subtitle>{{ appStore.dataPath.userDataDir }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <!-- 弹窗提示条 -->
    <v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
    <!-- 确认弹窗 -->
    <TConfirm v-model="confirmShow" :title="confirmText" @confirm="doConfirm(confirmOper)" />
  </div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TLoading from "../components/t-loading.vue";
import TConfirm from "../components/t-confirm.vue";
// tauri
import { dialog, fs, app, os } from "@tauri-apps/api";
// store
import { useAppStore } from "../store/modules/app";
import { useHomeStore } from "../store/modules/home";
import { useAchievementsStore } from "../store/modules/achievements";
// utils
import { WriteTGData } from "../utils/TGIndex";
// data
import { getDataList } from "../data/init";

// Store
const appStore = useAppStore();
const homeStore = useHomeStore();
const achievementsStore = useAchievementsStore();

// About App
const versionApp = ref("" as string);
const versionTauri = ref("" as string);

// About OS
const osPlatform = ref("" as string);
const osVersion = ref("" as string);

// loading
const loading = ref(true as boolean);

// data
const showHome = ref(homeStore.getShowValue() as string[]);

// snackbar
const snackbar = ref(false as boolean);
const snackbarText = ref("" as string);
const snackbarColor = ref("success" as string);

// confirm
const confirmText = ref("" as string);
const confirmOper = ref("" as string);
const confirmShow = ref(false as boolean);

// load version
onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  osPlatform.value = `${await os.platform()}`;
  osVersion.value = await os.version();
  setTimeout(() => {
    loading.value = false;
  }, 1000);
});

// 打开外部链接
function toOuter (url: string) {
  window.open(url);
}

// 打开用户数据目录
async function openMergeData () {
  await dialog.open({
    defaultPath: appStore.dataPath.userDataDir,
    filters: [],
  });
}

// open confirm
function tryConfirm (oper: string) {
  switch (oper) {
    case "delTemp":
      confirmText.value = "确认清除临时数据吗？";
      confirmOper.value = "delTemp";
      confirmShow.value = true;
      break;
    case "delUser":
      confirmText.value = "确认清除用户缓存吗？";
      confirmOper.value = "delUser";
      confirmShow.value = true;
      break;
    case "delApp":
      confirmText.value = "确认恢复默认设置吗？";
      confirmOper.value = "delApp";
      confirmShow.value = true;
      break;
  }
}

// transfer confirm oper
async function doConfirm (oper: string) {
  switch (oper) {
    case "delTemp":
      await delTempData();
      break;
    case "delUser":
      await delUserData();
      break;
    case "delApp":
      await initAppData();
      break;
    default:
      break;
  }
}

// confirmOper
async function delTempData () {
  await fs.removeDir("tempData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
  snackbarText.value = "临时数据已删除!";
  snackbar.value = true;
}

async function delUserData () {
  await fs.removeDir("userData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  await fs.removeDir("tempData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  getDataList.map(async (item) => {
    await WriteTGData(item.name, item.data);
  });
  snackbarText.value = "用户数据已删除!";
  snackbar.value = true;
  await achievementsStore.init();
  await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData });
  await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
}

// 恢复默认配置
async function initAppData () {
  await homeStore.init();
  await achievementsStore.init();
  snackbarText.value = "已恢复默认配置!";
  snackbar.value = true;
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 开启 dev 模式
async function submitDevMode () {
  await new Promise((resolve) => setTimeout(resolve, 200));
  appStore.devMode ? (snackbarText.value = "已开启 dev 模式!") : (snackbarText.value = "已关闭 dev 模式!");
  snackbarColor.value = "success";
  snackbar.value = true;
}

// 修改首页显示
async function submitHome () {
  // 获取已选
  const show = showHome.value;
  if (show.length < 1) {
    snackbarText.value = "请至少选择一个!";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  // 设置
  await homeStore.setShowValue(show);
  snackbarText.value = "已修改!";
  snackbarColor.value = "success";
  snackbar.value = true;
}
</script>

<style lang="css" scoped>
.config-list {
  margin: 10px;
  font-family: Genshin-Light, serif;
  background: #faf7e8;
  color: #546d8b;
  border-radius: 10px;
}

.config-header {
  margin-top: 10px;
  font-family: Genshin, serif;
  background: #faf7e8;
  color: #fec90b;
  font-size: large;
}

.config-icon {
  width: 40px;
  height: 40px;
  margin-right: 15px;
  padding: 5px;
  background: #5b738f;
  border-radius: 10px;
}
</style>
