<template>
  <div class="game-page">
    <header class="game-header">
      <div>
        <div class="game-eyebrow">本地游戏</div>
        <h1>游戏安装</h1>
        <p>以磁盘状态为准识别国服官服与国服 B 服。</p>
      </div>
      <div class="game-actions">
        <v-btn prepend-icon="mdi-refresh" variant="outlined" @click="loadInstallations">
          重新检测
        </v-btn>
        <v-btn
          :disabled="!isWindows"
          :loading="registering"
          prepend-icon="mdi-folder-cog"
          variant="tonal"
          @click="registerInstallation"
        >
          登记安装
        </v-btn>
      </div>
    </header>

    <v-alert
      v-if="!isWindows"
      text="游戏安装管理仅在 Windows 上可用。"
      type="info"
      variant="tonal"
    />
    <div v-else-if="loading" class="game-loading">
      <v-progress-circular indeterminate />
      <span>正在核对本地安装…</span>
    </div>
    <v-card v-else-if="installations.length === 0" class="game-empty" variant="flat">
      <v-icon size="36">mdi-gamepad-variant-outline</v-icon>
      <h2>尚未登记游戏安装</h2>
      <p>选择国服 YuanShen.exe，确认后会在这里显示版本与渠道。</p>
      <v-btn prepend-icon="mdi-folder-plus" variant="text" @click="registerInstallation">
        登记安装
      </v-btn>
    </v-card>
    <section v-else class="installation-list" aria-label="游戏安装列表">
      <article
        v-for="installation in installations"
        :key="installation.id"
        :class="{ chosen: installation.isChosen }"
        class="installation-card"
      >
        <div class="installation-heading">
          <div class="installation-mark" aria-hidden="true">
            <v-icon>mdi-gamepad-variant</v-icon>
          </div>
          <div class="installation-title">
            <div class="installation-title-line">
              <h2>{{ gameEnum.installation.schemeDesc(installation.schemeId) }}</h2>
              <v-chip v-if="installation.isChosen" size="small" variant="tonal">当前安装</v-chip>
            </div>
            <p>{{ installation.executablePath }}</p>
          </div>
          <v-chip :color="statusColor(installation.status)" size="small" variant="tonal">
            {{ statusDesc(installation.status) }}
          </v-chip>
        </div>

        <div class="installation-facts">
          <div>
            <span>版本</span>
            <strong>{{ installation.version ?? "未读取" }}</strong>
          </div>
          <div>
            <span>渠道参数</span>
            <strong>{{ channelDesc(installation) }}</strong>
          </div>
          <div>
            <span>语音包</span>
            <strong>{{ audioDesc(installation.audioLanguages) }}</strong>
          </div>
          <div>
            <span>渠道 SDK</span>
            <strong>{{ installation.hasChannelSdk ? "已安装" : "未安装" }}</strong>
          </div>
        </div>

        <v-alert
          v-if="installation.status !== gameEnum.installation.status.KNOWN"
          :text="installation.statusMessage"
          class="installation-alert"
          density="compact"
          type="warning"
          variant="tonal"
        />
        <PgVersion
          v-if="installation.status === gameEnum.installation.status.KNOWN"
          :installation
        />
        <PgScheme
          v-if="installation.status === gameEnum.installation.status.KNOWN"
          :installation
          @switched="loadInstallations"
        />
      </article>
    </section>
    <PgCache v-if="isWindows && !loading" />
  </div>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PgCache from "@comp/pageGame/pg-cache.vue";
import PgScheme from "@comp/pageGame/pg-scheme.vue";
import PgVersion from "@comp/pageGame/pg-version.vue";
import gameEnum from "@enum/game.js";
import TSGameInstallation from "@Sqlm/gameInstallation.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { open } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { inspectGameInstallation, listGameInstallations } from "@utils/TGGameLauncher.js";
import { onMounted, onUnmounted, ref } from "vue";

const isWindows = platform() === "windows";
const taskStore = useGameLauncherStore();
const loading = ref<boolean>(false);
const registering = ref<boolean>(false);
const installations = ref<Array<TGApp.Game.Installation.Item>>([]);

function statusDesc(status: TGApp.Game.Installation.StatusEnum): string {
  switch (status) {
    case gameEnum.installation.status.KNOWN:
      return "可用";
    case gameEnum.installation.status.INCONSISTENT:
      return "状态不一致";
    case gameEnum.installation.status.UNSUPPORTED:
      return "不支持";
  }
}

function statusColor(status: TGApp.Game.Installation.StatusEnum): string {
  switch (status) {
    case gameEnum.installation.status.KNOWN:
      return "success";
    case gameEnum.installation.status.INCONSISTENT:
      return "warning";
    case gameEnum.installation.status.UNSUPPORTED:
      return "error";
  }
}

function channelDesc(installation: TGApp.Game.Installation.Item): string {
  if (installation.channel === null || installation.subChannel === null) return "未读取";
  return `${installation.channel} / ${installation.subChannel}`;
}

function audioDesc(languages: Array<string>): string {
  if (languages.length === 0) return "未识别";
  const descriptions: Record<string, string> = {
    "zh-cn": "中文",
    "en-us": "英语",
    "ja-jp": "日语",
    "ko-kr": "韩语",
  };
  return languages.map((language) => descriptions[language] ?? language).join("、");
}

async function loadInstallations(): Promise<void> {
  if (!isWindows) return;
  loading.value = true;
  try {
    installations.value = await listGameInstallations();
  } catch (error) {
    showSnackbar.error(`读取游戏安装失败：${error}`);
  } finally {
    loading.value = false;
  }
}

async function registerInstallation(): Promise<void> {
  if (!isWindows || registering.value) return;
  registering.value = true;
  try {
    const current = installations.value.find((installation) => installation.isChosen);
    const file: string | null = await open({
      defaultPath: current?.executablePath,
      filters: [{ name: "原神国服客户端", extensions: ["exe"] }],
      multiple: false,
    });
    if (file === null) return;
    if (!file.toLowerCase().endsWith("yuanshen.exe")) {
      showSnackbar.warn("仅支持国服游戏本体 YuanShen.exe");
      return;
    }
    const installation = await inspectGameInstallation(file);
    if (installation.status === gameEnum.installation.status.UNSUPPORTED) {
      showSnackbar.warn(installation.statusMessage);
      return;
    }
    await TSGameInstallation.save(installation);
    await loadInstallations();
    if (installation.status === gameEnum.installation.status.INCONSISTENT) {
      showSnackbar.warn(`已登记安装，但暂不可启动：${installation.statusMessage}`);
      return;
    }
    showSnackbar.success("已登记并设为当前安装");
  } catch (error) {
    showSnackbar.error(`登记游戏安装失败：${error}`);
  } finally {
    registering.value = false;
  }
}

async function initializePage(): Promise<void> {
  if (!isWindows) return;
  try {
    await taskStore.startListening();
    await Promise.all([loadInstallations(), taskStore.hydrateTasks()]);
  } catch (error) {
    showSnackbar.error(`读取游戏资源任务失败：${error}`);
  }
}

onMounted(initializePage);
onUnmounted(taskStore.stopListening);
</script>

<style lang="scss" scoped>
.game-page {
  display: flex;
  min-height: calc(100vh - 32px);
  flex-direction: column;
  color: var(--app-page-content);
  font-family: var(--font-text);
  gap: 24px;
}

.game-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 24px;

  h1 {
    margin: 4px 0 8px;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: normal;
    line-height: 36px;
  }

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 14px;
    line-height: 20px;
  }
}

.game-eyebrow {
  color: var(--tgc-yellow-3);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.game-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.game-loading,
.game-empty {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
  gap: 12px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--common-text-title);
    font-size: 20px;
    line-height: 26px;
  }
}

.installation-list {
  display: grid;
  gap: 16px;
}

.installation-card {
  position: relative;
  display: grid;
  padding: 20px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 20px;

  &.chosen::before {
    position: absolute;
    width: 4px;
    border-radius: 8px 0 0 8px;
    background: var(--tgc-yellow-3);
    content: "";
    inset: 0 auto 0 0;
  }
}

.installation-heading {
  display: grid;
  align-items: center;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.installation-mark {
  display: grid;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--box-bg-4);
  color: var(--tgc-yellow-3);
  place-items: center;
}

.installation-title {
  min-width: 0;

  p {
    overflow: hidden;
    margin: 4px 0 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.installation-title-line {
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 20px;
    line-height: 26px;
  }
}

.installation-facts {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  div {
    display: grid;
    padding: 12px;
    border-radius: 4px;
    background: var(--box-bg-4);
    gap: 4px;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    overflow: hidden;
    color: var(--box-text-1);
    font-size: 14px;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.installation-alert {
  margin-top: -4px;
}

@media (width <= 840px) {
  .game-header {
    flex-direction: column;
    align-items: stretch;
  }

  .installation-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
