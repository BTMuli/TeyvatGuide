<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="相关信息" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="Tauri 版本" @click="toOuter('https://v2.tauri.app/')">
      <template #prepend>
        <v-img class="config-icon" src="/platforms/tauri.webp" alt="Tauri" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="成就版本">
      <template #prepend>
        <img class="config-icon" src="@/assets/icons/achievements.svg" alt="Achievements" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ latestAchiVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="系统平台">
      <template #prepend>
        <div class="config-icon">
          <v-icon>{{ iconPlatform }}</v-icon>
        </div>
      </template>
      <template #append>
        <v-list-item-subtitle>{{ osPlatform }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="系统版本">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-monitor-dashboard</v-icon>
        </div>
      </template>
      <template #append>
        <v-list-item-subtitle>{{ osVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="数据库更新时间">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-database-sync</v-icon>
        </div>
      </template>
      <template #append>
        <v-list-item-subtitle>
          {{ dbInfo.find((item) => item.key === "dataUpdated")?.value }}
        </v-list-item-subtitle>
      </template>
      <v-list-item-subtitle>
        <span>更新于</span>
        <span>{{ dbInfo.find((item) => item.key === "dataUpdated")?.updated }}</span>
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item title="数据库版本">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-database-search</v-icon>
        </div>
      </template>
      <template #append>
        <v-list-item-subtitle>
          {{ dbInfo.find((item) => item.key === "appVersion")?.value }}
        </v-list-item-subtitle>
      </template>
      <v-list-item-subtitle>
        <span>更新于</span>
        <span>{{ dbInfo.find((item) => item.key === "appVersion")?.updated }}</span>
      </v-list-item-subtitle>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sqlite/index.js";
import TSUserAchi from "@Sqlite/modules/userAchi.js";
import { app } from "@tauri-apps/api";
import { platform, version } from "@tauri-apps/plugin-os";
import { onMounted, ref, shallowRef } from "vue";

import TGLogger from "@/utils/TGLogger.js";

const latestAchiVersion = TSUserAchi.getLatestAchiVersion();
const osPlatform = platform();
const osVersion = version();

const versionApp = ref<string>("");
const versionTauri = ref<string>("");
const iconPlatform = ref<string>("mdi-microsoft-windows");
const dbInfo = shallowRef<Array<TGApp.Sqlite.AppData.Item>>([]);

onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  switch (osPlatform) {
    case "linux":
      iconPlatform.value = "mdi-linux";
      break;
    case "macos":
      iconPlatform.value = "mdi-apple";
      break;
    case "ios":
      iconPlatform.value = "mdi-apple-ios";
      break;
    case "windows":
      iconPlatform.value = "mdi-microsoft-windows";
      break;
    default:
      iconPlatform.value = "mdi-desktop-classic";
      break;
  }
  try {
    dbInfo.value = await TGSqlite.getAppData();
  } catch (e) {
    if (e instanceof Error) {
      showSnackbar.warn(`加载数据库错误: ${e.message}`);
      await TGLogger.Error(`加载数据库错误: ${e.message}`);
      return;
    }
    showSnackbar.warn("加载数据库错误，请重置数据库!");
    await TGLogger.Error(`加载数据库错误: ${e}`);
  }
});

function toOuter(url: string): void {
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
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-right: 15px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}
</style>
