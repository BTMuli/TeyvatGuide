<template>
  <div class="tc-info-box">
    <div class="tc-info-title">
      <v-icon size="16">mdi-information-outline</v-icon>
      <span>相关信息</span>
    </div>
    <div class="tc-info-grid">
      <TcInfoItem
        :pad="true"
        :title="versionTauri"
        icon="/platforms/tauri.webp"
        subtitle="Tauri 版本"
      >
        <template #subtitleAction>
          <v-icon
            :rounded="false"
            aria-label="打开 Tauri 官网"
            color="var(--tgc-od-orange)"
            icon="mdi-open-in-new"
            size="12"
            title="打开 Tauri 官网"
            variant="text"
            @click="openUrl('https://v2.tauri.app/')"
          />
        </template>
      </TcInfoItem>
      <TcInfoItem :title="TGBbs.version" icon="/platforms/mhy/mys.webp" subtitle="米游社版本" />
      <TcInfoItem
        :icon="achievementsIcon"
        :pad="true"
        :title="latestAchiVersion"
        subtitle="成就版本"
      />
      <TcInfoItem :title="machineId" icon="mdi-chip" subtitle="设备ID">
        <template #subtitleAction>
          <v-icon
            :disabled="!machineId"
            :rounded="false"
            aria-label="复制设备ID"
            color="var(--tgc-od-orange)"
            icon="mdi-content-copy"
            size="12"
            title="复制设备ID"
            variant="text"
            @click="copyMachineId"
          />
        </template>
      </TcInfoItem>
      <TcInfoItem :icon="iconPlatform" :title="osPlatform" subtitle="系统平台" />
      <TcInfoItem :title="osVersion" icon="mdi-monitor-dashboard" subtitle="系统版本" />
      <TcInfoItem
        :subtitle="`更新于${dbInfo.find((item) => item.key === 'appVersion')?.updated ?? ''}`"
        :title="dbInfo.find((item) => item.key === 'appVersion')?.value ?? ''"
        append="数据库版本"
        icon="mdi-database-search"
      />
      <TcInfoItem
        :subtitle="`更新于${dbInfo.find((item) => item.key === 'dataUpdated')?.updated ?? ''}`"
        :title="dbInfo.find((item) => item.key === 'dataUpdated')?.value ?? ''"
        append="数据库更新"
        icon="mdi-database-sync"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { commands } from "@skipperndt/plugin-machine-uid";
import TGSqlite from "@Sql/index.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { app } from "@tauri-apps/api";
import { openUrl } from "@tauri-apps/plugin-opener";
import { platform, version } from "@tauri-apps/plugin-os";
import TGBbs from "@utils/TGBbs.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, ref, shallowRef } from "vue";

import TcInfoItem from "./tc-info-item.vue";

import achievementsIcon from "@/assets/icons/achievements.svg";

const latestAchiVersion = TSUserAchi.getLatestAchiVersion();
const osPlatform = platform();
const osVersion = version();

const machineId = ref<string>("");
const versionApp = ref<string>("");
const versionTauri = ref<string>("");
const iconPlatform = ref<string>("mdi-microsoft-windows");
const dbInfo = shallowRef<Array<TGApp.Sqlite.AppData.Item>>([]);

async function copyMachineId(): Promise<void> {
  if (!machineId.value) return;
  try {
    await navigator.clipboard.writeText(machineId.value);
    showSnackbar.success("设备ID已复制");
  } catch {
    showSnackbar.error("复制设备ID失败，请重试");
  }
}

onMounted(async () => {
  versionApp.value = await app.getVersion();
  versionTauri.value = await app.getTauriVersion();
  const deviceRes = await commands.getMachineUid();
  if (deviceRes.status === "ok") {
    machineId.value = deviceRes.data.id ?? "";
  }
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
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tc-info-box {
  @include github-styles.github-card;

  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  font-family: var(--font-text);
  row-gap: 4px;
}

.dark .tc-info-box {
  @include github-styles.github-card("dark");
}

.tc-info-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
}

.tc-info-grid {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 2fr);
}
</style>
