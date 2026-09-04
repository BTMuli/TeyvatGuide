<!-- 单个本地游戏安装卡片：路径、版本、渠道与状态操作 -->
<template>
  <section class="game-list">
    <div class="game-list-header">
      <div class="game-list-heading">
        <span>{{ gameEnum.installation.schemeDesc(installation.schemeId) }}</span>
        <v-btn
          :disabled="installationSizeLoading"
          :loading="installationSizeLoading"
          class="game-size-btn"
          prepend-icon="mdi-harddisk"
          size="small"
          variant="tonal"
          @click="handleInstallationSizeClick"
        >
          {{ installationSizeButtonLabel }}
        </v-btn>
        <v-btn
          :disabled="installationActionPending"
          :loading="unregistering"
          prepend-icon="mdi-link-off"
          size="small"
          variant="tonal"
          @click="handleUnregister"
        >
          移除登记
        </v-btn>
        <v-btn
          :disabled="installationActionPending"
          :loading="uninstalling"
          class="game-uninstall-btn"
          prepend-icon="mdi-delete-outline"
          size="small"
          variant="tonal"
          @click="handleUninstall"
        >
          卸载
        </v-btn>
      </div>
      <div class="game-list-chips">
        <v-btn
          v-if="installationCount > 1"
          class="game-launch-card-btn"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-play"
          size="small"
          variant="tonal"
          @click="handleLaunch"
        >
          启动
        </v-btn>
        <v-chip
          v-if="installation.isChosen"
          color="var(--tgc-od-orange)"
          size="small"
          variant="tonal"
        >
          主启动
        </v-chip>
        <v-chip :color="statusColor(installation.status)" size="small" variant="tonal">
          {{ statusDesc(installation.status) }}
        </v-chip>
      </div>
    </div>
    <div class="game-path">
      <div class="game-icon">
        <TMiImg :ori="true" :size="40" :src="genshinIcon" alt="原神" />
      </div>
      <div class="game-path-copy">
        <span>安装路径</span>
        <strong>{{ installation.executablePath }}</strong>
      </div>
      <div class="game-path-actions">
        <v-btn
          v-if="!installation.isChosen"
          class="game-path-act"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-play-circle-outline"
          variant="tonal"
          @click="handleChooseInstallation"
        >
          设为当前
        </v-btn>
        <v-btn
          class="game-path-act"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-folder-swap-outline"
          variant="tonal"
          @click="openPathOverlay"
        >
          更换路径
        </v-btn>
      </div>
    </div>
    <PgVersion
      v-if="installation.status === gameEnum.installation.status.KNOWN"
      :installation="installation"
      @updated="refreshRegistered"
    >
      <template #facts="version">
        <PgScheme :installation="installation" @switched="refreshRegistered">
          <template #channel="scheme">
            <div class="game-facts">
              <div class="game-fact">
                <div class="game-fact-head">
                  <span>版本</span>
                  <v-icon
                    v-if="isLatestOfficial(version.snapshot)"
                    color="var(--tgc-od-green)"
                    size="16"
                    title="已是最新正式版本"
                  >
                    mdi-check-circle-outline
                  </v-icon>
                  <v-icon
                    v-else-if="version.snapshot !== null && !isLatestOfficial(version.snapshot)"
                    color="var(--tgc-od-orange)"
                    size="16"
                    :title="`正式 ${version.snapshot.main.tag}`"
                  >
                    mdi-arrow-up-circle-outline
                  </v-icon>
                  <v-icon
                    v-if="preDownloadTag(version.snapshot) !== null"
                    color="var(--tgc-od-orange)"
                    size="16"
                    :title="`预下载 ${preDownloadTag(version.snapshot)}`"
                  >
                    mdi-cloud-download-outline
                  </v-icon>
                  <div class="game-fact-acts">
                    <v-btn
                      :disabled="version.refreshDisabled"
                      :loading="version.loading"
                      aria-label="刷新远端版本"
                      density="compact"
                      icon="mdi-cloud-sync-outline"
                      size="small"
                      title="刷新远端版本"
                      variant="text"
                      @click="handleVersionRefresh(version)"
                    />
                    <v-progress-circular
                      v-if="version.verifyActive || version.verifyPending"
                      color="var(--tgc-od-orange)"
                      indeterminate
                      size="16"
                      :title="version.verifyActive ? '正在校验' : '正在开始校验'"
                      width="2"
                    />
                    <v-btn
                      v-else
                      :aria-label="version.verifyResumeLabel"
                      :disabled="version.verifyBusy"
                      :title="version.verifyResumeLabel"
                      density="compact"
                      icon="mdi-shield-check-outline"
                      size="small"
                      variant="text"
                      @click="handleVersionVerify(version)"
                    />
                  </div>
                </div>
                <strong>{{ versionPrimary(version.snapshot) }}</strong>
              </div>
              <div class="game-fact">
                <div class="game-fact-head">
                  <span>渠道参数</span>
                  <v-chip class="game-fact-tag" size="x-small" variant="tonal">
                    {{ schemeTag(installation.schemeId) }}
                  </v-chip>
                  <div class="game-fact-acts">
                    <v-btn
                      :aria-label="schemeActionLabel(scheme, version.verifyBusy)"
                      :disabled="
                        version.verifyBusy ||
                        (scheme.converting && !scheme.taskActive) ||
                        (!scheme.canConvert && !scheme.taskActive)
                      "
                      :icon="
                        scheme.taskActive ? 'mdi-stop-circle-outline' : 'mdi-swap-horizontal-bold'
                      "
                      :loading="scheme.converting && !scheme.taskActive"
                      :title="schemeActionTitle(scheme, version.verifyBusy)"
                      density="compact"
                      size="small"
                      variant="text"
                      @click="handleSchemeAction(scheme)"
                    />
                  </div>
                </div>
                <strong>{{ channelDesc(installation) }}</strong>
              </div>
              <div class="game-fact">
                <div class="game-fact-head">
                  <span>语音包</span>
                  <div class="game-fact-acts">
                    <v-btn
                      :disabled="version.refreshDisabled || !isLatestOfficial(version.snapshot)"
                      aria-label="管理配音包"
                      density="compact"
                      icon="mdi-tune-variant"
                      size="small"
                      :title="
                        isLatestOfficial(version.snapshot) ? '管理配音包' : '请先更新到当前正式版本'
                      "
                      variant="text"
                      @click="audioOverlay = true"
                    />
                  </div>
                </div>
                <div v-if="installedAudioItems.length > 0" class="game-fact-tags">
                  <v-chip
                    v-for="item in installedAudioItems"
                    :key="item.language"
                    class="game-fact-tag"
                    size="x-small"
                    :title="audioUsageTitle(item)"
                    variant="tonal"
                  >
                    {{ item.label }}
                    <template v-if="item.bytes !== null">
                      · {{ fmtUtil.size(item.bytes) }}</template
                    >
                  </v-chip>
                </div>
                <strong v-else>未识别</strong>
              </div>
              <div class="game-fact">
                <div class="game-fact-head">
                  <span>渠道 SDK</span>
                  <v-icon
                    :color="
                      installation.hasChannelSdk ? 'var(--tgc-od-green)' : 'var(--tgc-od-red)'
                    "
                    :icon="
                      installation.hasChannelSdk
                        ? 'mdi-check-circle-outline'
                        : 'mdi-close-circle-outline'
                    "
                    :title="installation.hasChannelSdk ? '已安装' : '未安装'"
                    size="16"
                  />
                </div>
                <strong>{{ installation.hasChannelSdk ? "已安装" : "未安装" }}</strong>
              </div>
            </div>
          </template>
        </PgScheme>
      </template>
    </PgVersion>
    <template v-else>
      <div class="game-facts">
        <div class="game-fact">
          <span>版本</span>
          <strong>{{ installation.version ?? "未读取" }}</strong>
        </div>
        <div class="game-fact">
          <div class="game-fact-head">
            <span>渠道参数</span>
            <v-chip class="game-fact-tag" size="x-small" variant="tonal">
              {{ schemeTag(installation.schemeId) }}
            </v-chip>
          </div>
          <strong>{{ channelDesc(installation) }}</strong>
        </div>
        <div class="game-fact">
          <span>语音包</span>
          <div v-if="installedAudioItems.length > 0" class="game-fact-tags">
            <v-chip
              v-for="item in installedAudioItems"
              :key="item.language"
              class="game-fact-tag"
              size="x-small"
              :title="audioUsageTitle(item)"
              variant="tonal"
            >
              {{ item.label }}
              <template v-if="item.bytes !== null"> · {{ fmtUtil.size(item.bytes) }}</template>
            </v-chip>
          </div>
          <strong v-else>未识别</strong>
        </div>
        <div class="game-fact">
          <div class="game-fact-head">
            <span>渠道 SDK</span>
            <v-icon
              :color="installation.hasChannelSdk ? 'var(--tgc-od-green)' : 'var(--tgc-od-red)'"
              :icon="
                installation.hasChannelSdk ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'
              "
              :title="installation.hasChannelSdk ? '已安装' : '未安装'"
              size="16"
            />
          </div>
          <strong>{{ installation.hasChannelSdk ? "已安装" : "未安装" }}</strong>
        </div>
      </div>
      <PgNotice :text="installation.statusMessage" class="game-alert" tone="warning" />
    </template>
  </section>

  <PgoAudio
    v-if="audioMounted"
    v-model="audioOverlay"
    :installation="installation"
    @task-started="audioOverlay = false"
  />

  <v-dialog v-model="accountDialog" max-width="420">
    <v-card>
      <v-card-title>选择官服启动账号</v-card-title>
      <v-card-text>
        <v-list v-if="officialAccounts.length > 0">
          <v-list-item
            v-for="entry in officialAccounts"
            :key="entry.uid"
            @click="launchWithAccount(entry)"
          >
            <v-list-item-title>{{ entry.nickname }}</v-list-item-title>
            <v-list-item-subtitle>{{ entry.uid }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <p v-else class="game-account-empty">未找到已登录的官服账号，请先在米游社登录</p>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="accountDialog = false">取消</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useBBSStore from "@store/bbs.js";
import { listen } from "@tauri-apps/api/event";
import fmtUtil from "@utils/fmtUtil.js";
import { launchInstallation } from "@utils/TGGame.js";
import {
  chooseGameInstallation,
  getGameInstallationAudioUsage,
  getGameInstallationSize,
  unregisterGameInstallation,
  uninstallGameInstallation,
} from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, defineAsyncComponent, ref, watch } from "vue";

import PgNotice from "./pg-notice.vue";

const PgScheme = defineAsyncComponent(() => import("./pg-scheme.vue"));
const PgVersion = defineAsyncComponent(() => import("./pg-version.vue"));
const PgoAudio = defineAsyncComponent(() => import("./pgo-audio.vue"));

const props = defineProps<{
  installation: TGApp.Game.Installation.Item;
  installationCount: number;
}>();
const emit = defineEmits<{
  updated: [];
  "change-path": [installation: TGApp.Game.Installation.Item];
}>();

type AccountChoice = {
  nickname: string;
  uid: string;
  game: TGApp.Sqlite.Account.Game;
  cookie: TGApp.App.Account.Cookie;
};

type InstalledAudioItem = {
  language: string;
  label: string;
  bytes: number | null;
};

const accountDialog = ref<boolean>(false);
const officialAccounts = ref<Array<AccountChoice>>([]);
const unregistering = ref<boolean>(false);
const uninstalling = ref<boolean>(false);
const audioOverlay = ref<boolean>(false);
// 浮层首次打开后保持挂载，关闭只切 v-model，让 TOverlay 的消失过渡有播放时间
const audioMounted = ref<boolean>(false);

watch(audioOverlay, (open) => {
  if (open) audioMounted.value = true;
});

const { gameList } = storeToRefs(useBBSStore());
const genshinIcon = computed<string>(() => {
  const game = gameList.value.find((item) => item.op_name === "hk4e");
  if (game === undefined || game.app_icon === "") return "/platforms/mhy/ys.webp";
  return game.app_icon;
});

const installationSize = ref<number | null>(null);
const installationSizeLoading = ref<boolean>(false);
const installationSizeError = ref<boolean>(false);
const audioUsageByLanguage = ref<Record<string, number>>({});
const audioUsageLoading = ref<boolean>(false);
const audioUsageError = ref<boolean>(false);
const installationSizeCache = new Map<string, { bytes: number; readAt: number }>();
const installationSizePending = new Map<string, Promise<number>>();
let installationSizeRequest = 0;

const installationActionPending = computed<boolean>(() => {
  return unregistering.value || uninstalling.value;
});

const installationSizeLabel = computed<string>(() => {
  if (installationSizeLoading.value) return "读取中…";
  if (installationSizeError.value) return "读取失败，点击重试";
  if (installationSize.value === null) return "点击读取占用空间";
  return fmtUtil.size(installationSize.value);
});
const installationSizeButtonLabel = computed<string>(() => {
  if (installationSizeLoading.value) return "读取中…";
  if (installationSizeError.value) return "重试占用空间";
  if (installationSize.value === null) return "读取占用空间";
  return `占用空间 ${installationSizeLabel.value}`;
});

function handleInstallationSizeClick(): void {
  if (installationSizeLoading.value) return;
  void refreshInstallationSize();
}

async function refreshInstallationSize(): Promise<void> {
  const request = ++installationSizeRequest;
  installationSize.value = null;
  installationSizeError.value = false;
  installationSizeLoading.value = true;
  audioUsageLoading.value = true;
  audioUsageError.value = false;
  let pending: Promise<number> | undefined;
  try {
    const cached = installationSizeCache.get(props.installation.rootPath);
    const sizePromise =
      cached !== undefined && Date.now() - cached.readAt < 30_000
        ? Promise.resolve(cached.bytes)
        : (installationSizePending.get(props.installation.rootPath) ??
          getGameInstallationSize(props.installation.rootPath));
    pending = sizePromise;
    installationSizePending.set(props.installation.rootPath, sizePromise);
    const [sizeResult, audioUsageResult] = await Promise.allSettled([
      sizePromise,
      getGameInstallationAudioUsage(props.installation.id),
    ]);
    if (request !== installationSizeRequest) return;
    if (sizeResult.status === "fulfilled") {
      installationSize.value = sizeResult.value;
      installationSizeCache.set(props.installation.rootPath, {
        bytes: sizeResult.value,
        readAt: Date.now(),
      });
    } else {
      installationSizeError.value = true;
    }
    if (audioUsageResult.status === "fulfilled") {
      audioUsageByLanguage.value = Object.fromEntries(
        audioUsageResult.value.map((item) => [item.language, item.bytes]),
      );
    } else {
      audioUsageError.value = true;
    }
  } finally {
    if (installationSizePending.get(props.installation.rootPath) === pending) {
      installationSizePending.delete(props.installation.rootPath);
    }
    if (request === installationSizeRequest) {
      installationSizeLoading.value = false;
      audioUsageLoading.value = false;
    }
  }
}

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

function schemeTag(schemeId: TGApp.Game.Installation.SchemeEnum | null): string {
  switch (schemeId) {
    case gameEnum.installation.scheme.CN_OFFICIAL:
      return "官服";
    case gameEnum.installation.scheme.CN_BILIBILI:
      return "渠道服";
    default:
      return "未知";
  }
}

function audioLabels(languages: Array<string>): Array<string> {
  if (languages.length === 0) return [];
  const descriptions: Record<string, string> = {
    "zh-cn": "中文",
    "en-us": "英语",
    "ja-jp": "日语",
    "ko-kr": "韩语",
  };
  return languages.map((language) => descriptions[language] ?? language);
}

const installedAudioItems = computed<Array<InstalledAudioItem>>(() => {
  const labels = audioLabels(props.installation.audioLanguages);
  return props.installation.audioLanguages.map((language, index) => ({
    language,
    label: labels[index] ?? language,
    bytes: audioUsageByLanguage.value[language] ?? null,
  }));
});

function audioUsageTitle(item: InstalledAudioItem): string {
  if (audioUsageLoading.value) return `${item.label}语音包占用读取中`;
  if (audioUsageError.value) return `${item.label}语音包占用读取失败`;
  if (item.bytes === null) return `点击顶部“读取占用空间”统计${item.label}语音包`;
  return `${item.label}语音包占用 ${fmtUtil.size(item.bytes)}`;
}

function versionPrimary(snapshot: TGApp.Game.Package.Snapshot | null): string {
  const local = snapshot?.localVersion ?? props.installation.version ?? "未读取";
  if (snapshot === null || local === snapshot.main.tag) return local;
  return `${local} → ${snapshot.main.tag}`;
}

function isLatestOfficial(snapshot: TGApp.Game.Package.Snapshot | null): boolean {
  if (snapshot === null) return false;
  const local = snapshot.localVersion ?? props.installation.version;
  return local === snapshot.main.tag;
}

function preDownloadTag(snapshot: TGApp.Game.Package.Snapshot | null): string | null {
  return snapshot?.preDownload?.tag ?? null;
}

function handleVersionRefresh(version: { refreshSnapshot: () => Promise<void> }): void {
  void version.refreshSnapshot();
}

function handleVersionVerify(version: { startVerify: () => Promise<void> }): void {
  void version.startVerify();
}

type SchemeAction = {
  blockingTask: boolean;
  canConvert: boolean;
  cancelSwitch: () => Promise<void>;
  convertLabel: string;
  convertScheme: () => Promise<void>;
  targetScheme: TGApp.Game.Installation.SchemeEnum;
  taskActive: boolean;
};

function schemeActionLabel(scheme: SchemeAction, verifyBusy: boolean): string {
  if (verifyBusy) return "校验进行中，暂时不能换服";
  if (scheme.taskActive) return "取消换服";
  if (!scheme.canConvert) {
    return scheme.blockingTask ? "安装任务进行中，暂时不能换服" : "换服任务未完成，暂时不能换服";
  }
  return scheme.convertLabel;
}

function schemeActionTitle(scheme: SchemeAction, verifyBusy: boolean): string {
  if (verifyBusy || scheme.taskActive || !scheme.canConvert) {
    return schemeActionLabel(scheme, verifyBusy);
  }
  return `可转为${gameEnum.installation.schemeDesc(scheme.targetScheme)}`;
}

function handleSchemeAction(scheme: SchemeAction): void {
  if (scheme.taskActive) {
    void scheme.cancelSwitch();
    return;
  }
  void scheme.convertScheme();
}

function refreshRegistered(): void {
  emit("updated");
}

function openPathOverlay(): void {
  emit("change-path", props.installation);
}

async function handleChooseInstallation(): Promise<void> {
  if (props.installation.isChosen) return;
  try {
    await chooseGameInstallation(props.installation.id);
    emit("updated");
    showSnackbar.success("已设为主启动路径");
  } catch (error) {
    showSnackbar.error(`设置主启动路径失败：${error}`);
  }
}

function handleLaunch(): void {
  if (props.installation.schemeId === gameEnum.installation.scheme.CN_OFFICIAL) {
    accountDialog.value = true;
    void loadOfficialAccounts();
    return;
  }
  void launchInstallation(props.installation);
}

async function loadOfficialAccounts(): Promise<void> {
  const users = await TSUserAccount.account.getAllAccount();
  const entries: Array<AccountChoice> = [];
  for (const user of users) {
    const game = await TSUserAccount.game.getCurAccount(user.uid);
    if (game !== false && game.isOfficial === 1 && game.gameBiz === "hk4e_cn") {
      entries.push({ nickname: user.brief.nickname, uid: user.uid, game, cookie: user.cookie });
    }
  }
  officialAccounts.value = entries;
}

function launchWithAccount(entry: AccountChoice): void {
  accountDialog.value = false;
  void launchInstallation(props.installation, entry.game, entry.cookie);
}

async function handleUnregister(): Promise<void> {
  const confirmed = await showDialog.checkF({
    title: "移除安装登记？",
    text: `将从 TeyvatGuide 中移除该安装记录，不会删除任何游戏文件。之后仍可通过“添加新客户端”重新登记。`,
    confirmLabel: "移除登记",
  });
  if (confirmed !== true) return;
  unregistering.value = true;
  try {
    await unregisterGameInstallation(props.installation.id);
    showSnackbar.success("已移除安装登记，游戏文件未作修改");
    emit("updated");
  } catch (error) {
    showSnackbar.error(`移除安装登记失败：${error}`);
  } finally {
    unregistering.value = false;
  }
}

async function handleUninstall(): Promise<void> {
  const confirmed = await showDialog.checkF({
    title: "卸载游戏？",
    text: `将删除 ${props.installation.rootPath} 目录内的全部文件（目录本身保留为空目录），并移除安装登记。此操作不可恢复。`,
    confirmLabel: "确认卸载",
  });
  if (confirmed !== true) return;
  uninstalling.value = true;
  const unlisten = await listen<TGApp.Game.Installation.UninstallProgress>(
    "game-uninstall://progress",
    (event) => {
      const { completed, total } = event.payload;
      void showLoading.update(total > 0 ? `正在卸载 ${completed}/${total}…` : "正在卸载…");
    },
  );
  await showLoading.start("正在卸载游戏", "正在统计文件…");
  try {
    const summary = await uninstallGameInstallation(props.installation.id);
    showLoading.end();
    showSnackbar.success(
      `卸载完成：删除 ${summary.removedFiles} 个文件、${summary.removedDirs} 个目录`,
    );
    emit("updated");
  } catch (error) {
    showLoading.end();
    showSnackbar.error(`卸载失败：${error}`);
  } finally {
    await unlisten();
    uninstalling.value = false;
  }
}
</script>

<style lang="scss" scoped>
.game-list {
  width: 100%;
  flex-shrink: 0;
  border: var(--game-page-cover-border, 0);
  border-radius: 8px;
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-panel-bg, var(--box-bg-1));
  color: var(--box-text-4);
  font-family: var(--font-text);
}

.game-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  gap: 8px;

  > span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: large;
    font-weight: normal;
  }
}

.game-list-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;

  > span {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.game-size-btn {
  flex-shrink: 0;
  padding-inline: 4px;
}

.game-list-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.game-path-act {
  flex-shrink: 0;
}

.game-path-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.game-path {
  display: flex;
  align-items: center;
  padding: 8px 16px;
}

.game-uninstall-btn {
  color: var(--tgc-od-red);
}

.game-account-empty {
  margin: 0;
  color: var(--box-text-2);
  font-size: 13px;
  line-height: 20px;
}

.game-path-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 20px;
    overflow-wrap: anywhere;
  }
}

.game-facts {
  display: grid;
  padding: 8px 16px 12px;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.game-fact {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-subpanel-bg, var(--box-bg-2));
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 20px;
    overflow-wrap: anywhere;
  }
}

.game-fact-head {
  display: flex;
  align-items: center;
  gap: 2px;

  > span {
    margin-inline-end: 4px;
  }
}

.game-fact-acts {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  margin-inline-start: auto;
}

.game-fact-tag {
  flex-shrink: 0;
}

.game-fact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.game-icon {
  display: flex;
  overflow: hidden;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-right: 15px;
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-subpanel-bg, var(--box-bg-2));
  color: var(--box-text-2);

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.game-alert {
  margin: 8px 16px 16px;
}

@media (width <= 900px) {
  .game-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
