<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="相关信息" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
      <template #prepend>
        <v-img class="config-icon" src="/platforms/tauri.webp" alt="Tauri" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="成就版本">
      <template #prepend>
        <img class="config-icon" src="../../assets/icons/achievements.svg" alt="Achievements" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ achievementsStore.lastVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="系统平台">
      <template #prepend>
        <v-icon>{{ iconPlatform }}</v-icon>
      </template>
      <template #append>
        <v-list-item-subtitle>{{ osPlatform }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="系统版本" prepend-icon="mdi-monitor-dashboard">
      <template #append>
        <v-list-item-subtitle>{{ osVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="数据库更新时间" prepend-icon="mdi-database-sync">
      <template #append>
        <v-list-item-subtitle
          >{{ dbInfo.find((item) => item.key === "dataUpdated")?.value }}
        </v-list-item-subtitle>
      </template>
      <v-list-item-subtitle
        >更新于
        {{ dbInfo.find((item) => item.key === "dataUpdated")?.updated }}
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item title="数据库版本" prepend-icon="mdi-database-search">
      <template #append>
        <v-list-item-subtitle
          >{{ dbInfo.find((item) => item.key === "appVersion")?.value }}
        </v-list-item-subtitle>
      </template>
      <v-list-item-subtitle
        >更新于
        {{ dbInfo.find((item) => item.key === "appVersion")?.updated }}
      </v-list-item-subtitle>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import { app, os } from "@tauri-apps/api";
import { onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite";
import { useAchievementsStore } from "../../store/modules/achievements";
import showSnackbar from "../func/snackbar";

const achievementsStore = useAchievementsStore();

const versionApp = ref<string>("");
const versionTauri = ref<string>("");
const osPlatform = ref<string>("");
const iconPlatform = ref<string>("mdi-microsoft-windows");
const osVersion = ref<string>("");
const dbInfo = ref<Array<TGApp.Sqlite.AppData.Item>>([]);

onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  osPlatform.value = `${await os.platform()}`;
  switch (osPlatform.value) {
    case "linux":
      iconPlatform.value = "mdi-linux";
      break;
    case "darwin":
      iconPlatform.value = "mdi-apple";
      break;
    case "ios":
      iconPlatform.value = "mdi-apple-ios";
      break;
    case "win32":
      iconPlatform.value = "mdi-microsoft-windows";
      break;
    default:
      iconPlatform.value = "mdi-desktop-classic";
      break;
  }
  osVersion.value = await os.version();
  try {
    dbInfo.value = await TGSqlite.getAppData();
  } catch (e) {
    showSnackbar({
      text: "加载数据库错误，请重置数据库!",
      color: "error",
    });
  }
});

function toOuter(url: string) {
  window.open(url);
}
</script>
<style lang="css" scoped>
.config-header {
  margin-top: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: large;
}

.config-icon {
  width: 40px;
  height: 40px;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-right: 15px;
  backdrop-filter: blur(20px);
  background: var(--app-side-bg);
  box-shadow: 0 0 5px var(--common-shadow-1);
}
</style>
