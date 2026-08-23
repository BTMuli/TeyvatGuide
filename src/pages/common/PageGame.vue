<template>
  <v-app-bar>
    <template #prepend>
      <div class="game-title">
        <img alt="启动器" class="game-title-icon" src="/platforms/mhy/launcher.webp" />
        <span>游戏安装</span>
      </div>
    </template>
    <template #append>
      <v-btn
        :disabled="installationsLoading || launching"
        class="game-install-btn"
        color="var(--tgc-od-orange)"
        prepend-icon="mdi-download-box-outline"
        variant="tonal"
        @click="openInstallOverlay"
      >
        安装新客户端
      </v-btn>
      <v-btn
        :disabled="taskCleanupPending"
        :loading="taskCleanupPending"
        aria-label="清理已结束任务"
        class="game-task-clean-btn"
        color="var(--tgc-od-red)"
        prepend-icon="mdi-broom"
        title="清理已结束任务"
        variant="tonal"
        @click="handleTaskCleanup"
      >
        清理任务
      </v-btn>
      <v-btn
        :disabled="launching"
        :loading="launching"
        :title="launchTitle"
        class="game-launch-btn"
        prepend-icon="mdi-play"
        variant="elevated"
        @click="handleLaunchGame"
      >
        启动
      </v-btn>
    </template>
  </v-app-bar>

  <div class="game-page">
    <div v-if="installationsLoading && installations.length === 0" class="game-empty" role="status">
      <v-progress-circular indeterminate />
      <span class="game-empty-title">正在读取本地安装…</span>
    </div>
    <v-list v-else-if="chosen === null" class="game-list">
      <div class="game-list-header">
        <span>本地安装</span>
      </div>
      <v-list-item
        subtitle="从已发现的安装中选择，或手动指定国服 YuanShen.exe"
        title="选择游戏路径"
        @click="pathOverlay = true"
      >
        <template #prepend>
          <div class="game-icon">
            <v-icon>mdi-folder-search-outline</v-icon>
          </div>
        </template>
      </v-list-item>
    </v-list>
    <template v-else>
      <section class="game-list">
        <div class="game-list-header">
          <div class="game-list-heading">
            <span>{{ gameEnum.installation.schemeDesc(chosen.schemeId) }}</span>
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
          </div>
          <div class="game-list-chips">
            <v-chip size="small" variant="tonal">当前安装</v-chip>
            <v-chip :color="statusColor(chosen.status)" size="small" variant="tonal">
              {{ statusDesc(chosen.status) }}
            </v-chip>
          </div>
        </div>
        <div class="game-path">
          <div class="game-icon">
            <TMiImg :ori="true" :size="40" :src="genshinIcon" alt="原神" />
          </div>
          <div class="game-path-copy">
            <span>安装路径</span>
            <strong>{{ chosen.executablePath }}</strong>
          </div>
          <v-btn
            class="game-path-act"
            color="var(--tgc-od-orange)"
            prepend-icon="mdi-folder-swap-outline"
            variant="tonal"
            @click="pathOverlay = true"
          >
            更换路径
          </v-btn>
        </div>
        <PgVersion
          v-if="chosen.status === gameEnum.installation.status.KNOWN"
          :installation="chosen"
        >
          <template #facts="version">
            <PgScheme :installation="chosen" @switched="refreshRegistered">
              <template #channel="scheme">
                <div class="game-facts">
                  <div class="game-fact">
                    <div class="game-fact-head">
                      <span>版本</span>
                      <v-icon
                        v-if="
                          isLatestOfficial(version.snapshot) && !hasPreDownload(version.snapshot)
                        "
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
                        {{ schemeTag(chosen.schemeId) }}
                      </v-chip>
                      <div v-if="scheme.canConvert || scheme.taskActive" class="game-fact-acts">
                        <v-btn
                          :aria-label="
                            version.verifyBusy
                              ? '校验进行中，暂时不能换服'
                              : scheme.taskActive
                                ? '取消换服'
                                : scheme.convertLabel
                          "
                          :disabled="
                            version.verifyBusy || (scheme.converting && !scheme.taskActive)
                          "
                          :icon="
                            scheme.taskActive
                              ? 'mdi-stop-circle-outline'
                              : 'mdi-swap-horizontal-bold'
                          "
                          :loading="scheme.converting && !scheme.taskActive"
                          :title="
                            version.verifyBusy
                              ? '校验进行中，暂时不能换服'
                              : scheme.taskActive
                                ? '取消换服'
                                : `可转为${gameEnum.installation.schemeDesc(scheme.targetScheme)}`
                          "
                          density="compact"
                          size="small"
                          variant="text"
                          @click="handleSchemeAction(scheme)"
                        />
                      </div>
                    </div>
                    <strong>{{ channelDesc(chosen) }}</strong>
                  </div>
                  <div class="game-fact">
                    <span>语音包</span>
                    <strong>{{ audioDesc(chosen.audioLanguages) }}</strong>
                  </div>
                  <div class="game-fact">
                    <div class="game-fact-head">
                      <span>渠道 SDK</span>
                      <v-icon
                        :color="chosen.hasChannelSdk ? 'var(--tgc-od-green)' : 'var(--tgc-od-red)'"
                        :icon="
                          chosen.hasChannelSdk
                            ? 'mdi-check-circle-outline'
                            : 'mdi-close-circle-outline'
                        "
                        :title="chosen.hasChannelSdk ? '已安装' : '未安装'"
                        size="16"
                      />
                    </div>
                    <strong>{{ chosen.hasChannelSdk ? "已安装" : "未安装" }}</strong>
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
              <strong>{{ chosen.version ?? "未读取" }}</strong>
            </div>
            <div class="game-fact">
              <div class="game-fact-head">
                <span>渠道参数</span>
                <v-chip class="game-fact-tag" size="x-small" variant="tonal">
                  {{ schemeTag(chosen.schemeId) }}
                </v-chip>
              </div>
              <strong>{{ channelDesc(chosen) }}</strong>
            </div>
            <div class="game-fact">
              <span>语音包</span>
              <strong>{{ audioDesc(chosen.audioLanguages) }}</strong>
            </div>
            <div class="game-fact">
              <div class="game-fact-head">
                <span>渠道 SDK</span>
                <v-icon
                  :color="chosen.hasChannelSdk ? 'var(--tgc-od-green)' : 'var(--tgc-od-red)'"
                  :icon="
                    chosen.hasChannelSdk ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'
                  "
                  :title="chosen.hasChannelSdk ? '已安装' : '未安装'"
                  size="16"
                />
              </div>
              <strong>{{ chosen.hasChannelSdk ? "已安装" : "未安装" }}</strong>
            </div>
          </div>
          <v-alert
            :text="chosen.statusMessage"
            class="game-alert"
            density="compact"
            type="warning"
            variant="tonal"
          />
        </template>
      </section>
    </template>
    <PgInstallDraft
      v-for="draft in visibleInstallDrafts"
      :key="draft.draftId"
      :action-pending="taskStore.pendingActions[draft.draftId] ?? false"
      :draft
      @cancel-requested="handleInstallDraftCancel(draft)"
      @resume-requested="handleInstallDraftResume(draft)"
    />
    <PgInstallTask
      v-for="task in installTasks"
      :key="task.taskId"
      :action-pending="taskStore.pendingActions[task.taskId] ?? false"
      :task="task"
      @cancel-requested="handleInstallTaskCancel(task)"
      @configure-requested="handleInstallTaskConfigure(task)"
      @pause-requested="handleInstallTaskPause(task)"
      @recover-requested="(action) => handleInstallTaskRecover(task, action)"
    />
    <PgCache v-if="chosen !== null || installTasks.length > 0 || visibleInstallDrafts.length > 0" />
  </div>
  <PgoPath
    v-if="pathOverlay"
    v-model="pathOverlay"
    :currentPath="chosen?.executablePath"
    @selected="refreshPageData"
  />
  <PgoInstall
    v-if="installOverlay"
    v-model="installOverlay"
    :initialConfig="installInitialConfig"
    :installedSchemes
    @completed="refreshPageData"
  />
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import useUserStore from "@store/user.js";
import fmtUtil from "@utils/fmtUtil.js";
import { tryLaunchGame } from "@utils/TGGame.js";
import {
  getGameInstallationSize,
  listGameInstallDrafts,
  listGameInstallations,
} from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from "vue";

const PgCache = defineAsyncComponent(() => import("@comp/pageGame/pg-cache.vue"));
const PgInstallDraft = defineAsyncComponent(() => import("@comp/pageGame/pg-install-draft.vue"));
const PgInstallTask = defineAsyncComponent(() => import("@comp/pageGame/pg-install-task.vue"));
const PgScheme = defineAsyncComponent(() => import("@comp/pageGame/pg-scheme.vue"));
const PgVersion = defineAsyncComponent(() => import("@comp/pageGame/pg-version.vue"));
const PgoInstall = defineAsyncComponent(() => import("@comp/pageGame/pgo-install.vue"));
const PgoPath = defineAsyncComponent(() => import("@comp/pageGame/pgo-path.vue"));

const taskStore = useGameLauncherStore();
const { isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());
const { account, cookie } = storeToRefs(useUserStore());
const launching = ref<boolean>(false);
const pathOverlay = ref<boolean>(false);
const installOverlay = ref<boolean>(false);
type InstallInitialConfig = {
  scheme: TGApp.Game.Installation.SchemeEnum;
  installRoot: string | null;
  audioLanguages: Array<string>;
  taskId: string;
  installationId: string;
};
const installInitialConfig = ref<InstallInitialConfig | null>(null);
const installations = ref<Array<TGApp.Game.Installation.Item>>([]);
const installationsLoading = ref<boolean>(true);
const installDrafts = ref<Array<TGApp.Game.Installation.InstallDraftSummary>>([]);
const installationSize = ref<number | null>(null);
const installationSizeLoading = ref<boolean>(false);
const installationSizeError = ref<boolean>(false);
const installationSizeCache = new Map<string, { bytes: number; readAt: number }>();
const installationSizePending = new Map<string, Promise<number>>();
let installationSizeRequest = 0;
let pageActive = true;

const chosen = computed<TGApp.Game.Installation.Item | null>(() => {
  return installations.value.find((installation) => installation.isChosen) ?? null;
});
const installTasks = computed<Array<TGApp.Game.Package.TaskSummary>>(() => {
  return Object.values(taskStore.tasksByInstallation).filter(
    (task) =>
      task.target === gameEnum.package.planTarget.INSTALL &&
      task.state !== gameEnum.package.taskState.COMPLETED &&
      task.state !== gameEnum.package.taskState.CANCELED,
  );
});
const taskCleanupCount = computed<number>(() => {
  return Object.values(taskStore.tasksByInstallation).filter((task) => {
    return (
      task.state === gameEnum.package.taskState.COMPLETED ||
      task.state === gameEnum.package.taskState.FAILED ||
      task.state === gameEnum.package.taskState.CANCELED
    );
  }).length;
});
const taskCleanupPending = computed<boolean>(
  () => taskStore.pendingActions["task-cleanup"] === true,
);
const visibleInstallDrafts = computed<Array<TGApp.Game.Installation.InstallDraftSummary>>(() => {
  const taskInstallationIds = new Set(installTasks.value.map((task) => task.installationId));
  return installDrafts.value.filter((draft) => !taskInstallationIds.has(draft.installId));
});
const installedSchemes = computed<Array<TGApp.Game.Installation.SchemeEnum>>(() => {
  const schemes: Array<TGApp.Game.Installation.SchemeEnum> = [];
  for (const installation of installations.value) {
    if (installation.schemeId !== null && !schemes.includes(installation.schemeId)) {
      schemes.push(installation.schemeId);
    }
  }
  return schemes;
});
const genshinIcon = computed<string>(() => {
  const game = gameList.value.find((item) => item.op_name === "hk4e");
  if (game === undefined || game.app_icon === "") return "/platforms/mhy/ys.webp";
  return game.app_icon;
});

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

function versionPrimary(snapshot: TGApp.Game.Package.Snapshot | null): string {
  const local = snapshot?.localVersion ?? chosen.value?.version ?? "未读取";
  if (snapshot === null || local === snapshot.main.tag) return local;
  return `${local} → ${snapshot.main.tag}`;
}

function isLatestOfficial(snapshot: TGApp.Game.Package.Snapshot | null): boolean {
  if (snapshot === null) return false;
  const local = snapshot.localVersion ?? chosen.value?.version;
  return local === snapshot.main.tag;
}

function hasPreDownload(snapshot: TGApp.Game.Package.Snapshot | null): boolean {
  return snapshot !== null && snapshot.preDownload !== null;
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

function openInstallOverlay(): void {
  installInitialConfig.value = null;
  installOverlay.value = true;
}

function handleInstallationSizeClick(): void {
  if (installationSizeLoading.value) return;
  void refreshInstallationSize(chosen.value ?? undefined);
}

function handleSchemeAction(scheme: {
  cancelSwitch: () => Promise<void>;
  convertScheme: () => Promise<void>;
  taskActive: boolean;
}): void {
  if (scheme.taskActive) {
    void scheme.cancelSwitch();
    return;
  }
  void scheme.convertScheme();
}

function taskBlocksLaunch(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    gameEnum.package.taskApplying(state) ||
    state === gameEnum.package.taskState.RECOVERY_REQUIRED ||
    state === gameEnum.package.taskState.REPAIR_REQUIRED
  );
}

const launchBlockReason = computed<string | null>(() => {
  if (installationsLoading.value) return "正在读取本地安装…";
  if (chosen.value === null) return "请先选择游戏路径";
  if (chosen.value.status !== gameEnum.installation.status.KNOWN) {
    return chosen.value.statusMessage;
  }
  if (chosen.value.schemeId === gameEnum.installation.scheme.CN_OFFICIAL) {
    if (!isLogin.value) return "启动国服官服前请先登录米游社";
    if (account.value.isOfficial !== 1) return "当前米游社账号不是官服账号";
  }
  const task = taskStore.tasksByInstallation[chosen.value.id];
  if (task !== undefined && taskBlocksLaunch(task.state)) {
    return "存在进行中或等待恢复的资源提交，暂时不能启动";
  }
  return null;
});
const launchTitle = computed<string>(() => launchBlockReason.value ?? "启动游戏");

async function handleLaunchGame(): Promise<void> {
  const reason = launchBlockReason.value;
  if (reason !== null) {
    await showDialog.checkF({
      title: "暂时无法启动",
      text: reason,
      confirmLabel: "知道了",
    });
    return;
  }
  launching.value = true;
  try {
    await tryLaunchGame(account.value, cookie.value);
  } finally {
    launching.value = false;
  }
}

async function refreshRegistered(): Promise<void> {
  installationsLoading.value = true;
  try {
    const nextInstallations = await listGameInstallations();
    installations.value = nextInstallations;
    installationSizeRequest += 1;
    installationSize.value = null;
    installationSizeLoading.value = false;
    installationSizeError.value = false;
  } catch (error) {
    showSnackbar.error(`读取游戏安装失败：${error}`);
  } finally {
    installationsLoading.value = false;
  }
}

async function refreshInstallDrafts(): Promise<void> {
  try {
    installDrafts.value = await listGameInstallDrafts();
  } catch (error) {
    showSnackbar.error(`读取安装草稿失败：${error}`);
  }
}

async function refreshPageData(): Promise<void> {
  await Promise.all([refreshRegistered(), refreshInstallDrafts()]);
}

async function refreshInstallationSize(
  installation: TGApp.Game.Installation.Item | undefined,
): Promise<void> {
  const request = ++installationSizeRequest;
  installationSize.value = null;
  installationSizeError.value = false;
  if (installation === undefined) {
    installationSizeLoading.value = false;
    return;
  }
  installationSizeLoading.value = true;
  let pending: Promise<number> | undefined;
  try {
    const cached = installationSizeCache.get(installation.rootPath);
    if (cached !== undefined && Date.now() - cached.readAt < 30_000) {
      installationSize.value = cached.bytes;
      return;
    }
    pending = installationSizePending.get(installation.rootPath);
    if (pending === undefined) {
      pending = getGameInstallationSize(installation.rootPath);
      installationSizePending.set(installation.rootPath, pending);
    }
    const size = await pending;
    installationSizeCache.set(installation.rootPath, { bytes: size, readAt: Date.now() });
    if (request === installationSizeRequest) installationSize.value = size;
  } catch {
    if (request === installationSizeRequest) installationSizeError.value = true;
  } finally {
    if (installationSizePending.get(installation.rootPath) === pending) {
      installationSizePending.delete(installation.rootPath);
    }
    if (request === installationSizeRequest) installationSizeLoading.value = false;
  }
}

async function handleInstallTaskCancel(task: TGApp.Game.Package.TaskSummary): Promise<void> {
  const confirmed = await showDialog.checkF({
    title: "停止安装？",
    text: "将停止当前安装并清理安装草稿；已经下载完成的共享缓存会保留。",
    confirmLabel: "停止安装",
  });
  if (confirmed !== true) return;
  try {
    await taskStore.cancelInstall(task.taskId, task.installationId);
    await refreshPageData();
  } catch (error) {
    showSnackbar.error(`取消游戏安装失败：${error}`);
  }
}

async function handleInstallTaskPause(task: TGApp.Game.Package.TaskSummary): Promise<void> {
  try {
    await taskStore.pauseInstall(task.taskId, task.installationId);
  } catch (error) {
    showSnackbar.error(`暂停游戏安装失败：${error}`);
  }
}

async function handleInstallDraftResume(
  draft: TGApp.Game.Installation.InstallDraftSummary,
): Promise<void> {
  try {
    await taskStore.resumeInstallDraft(draft);
    await refreshPageData();
  } catch (error) {
    showSnackbar.error(`恢复游戏安装失败：${error}`);
  }
}

async function handleInstallDraftCancel(
  draft: TGApp.Game.Installation.InstallDraftSummary,
): Promise<void> {
  const confirmed = await showDialog.check("取消安装", "确认取消安装？");
  if (confirmed !== true) return;
  try {
    await taskStore.cancelInstallDraft(draft);
    await refreshPageData();
  } catch (error) {
    showSnackbar.error(`取消安装草稿失败：${error}`);
  }
}

async function handleInstallTaskRecover(
  task: TGApp.Game.Package.TaskSummary,
  action: TGApp.Game.Package.RecoveryActionEnum,
): Promise<void> {
  const deleting = action === gameEnum.package.recoveryAction.ROLLBACK;
  if (deleting) {
    const confirmed = await showDialog.checkF({
      title: "删除安装任务？",
      text: "将删除当前安装任务并清理安装草稿；已命中的共享缓存不会删除。",
      confirmLabel: "删除",
    });
    if (confirmed !== true) return;
  }
  try {
    const updated = await taskStore.recoverInstall(task.taskId, task.installationId, action);
    if (updated.state === gameEnum.package.taskState.COMPLETED) await refreshPageData();
    if (deleting) {
      await refreshPageData();
      showSnackbar.info("安装任务已删除，已发布的游戏目录保留");
    }
  } catch (error) {
    showSnackbar.error(`${deleting ? "删除" : "恢复"}游戏安装失败：${error}`);
  }
}

async function handleTaskCleanup(): Promise<void> {
  const confirmed = await showDialog.checkF({
    title: "清理已结束任务？",
    text:
      taskCleanupCount.value > 0
        ? `将移除已结束任务记录（当前页面可见 ${taskCleanupCount.value} 条），不会删除游戏文件或共享缓存。`
        : "将移除所有已结束任务记录，不会删除游戏文件或共享缓存。",
    confirmLabel: "清理记录",
    cancelLabel: "取消",
  });
  if (confirmed !== true) return;
  try {
    const summary = await taskStore.cleanupTasks();
    showSnackbar.success(
      summary.removedCount > 0
        ? `已清理 ${summary.removedCount} 条任务记录，释放 ${fmtUtil.size(summary.removedBytes)}`
        : "没有可清理的已结束任务",
    );
  } catch {
    showSnackbar.error("清理任务记录失败，请稍后重试");
  }
}

function handleInstallTaskConfigure(task: TGApp.Game.Package.TaskSummary): void {
  installInitialConfig.value = {
    scheme: task.targetScheme,
    installRoot: task.installRoot,
    audioLanguages: [...task.audioLanguages],
    taskId: task.taskId,
    installationId: task.installationId,
  };
  installOverlay.value = true;
}

async function initializeTaskProjection(): Promise<void> {
  try {
    await taskStore.startListening();
  } catch (error) {
    showSnackbar.error(`监听游戏资源任务失败：${error}`);
  }
  if (!pageActive) return;
  try {
    await taskStore.hydrateTasks();
  } catch (error) {
    showSnackbar.error(`读取游戏资源任务失败：${error}`);
  }
}

function initializePage(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!pageActive) return;
      void refreshPageData();
      void initializeTaskProjection();
    });
  });
}

onMounted(initializePage);
watch(installOverlay, (visible) => {
  if (!visible) installInitialConfig.value = null;
});
onUnmounted(() => {
  pageActive = false;
  taskStore.stopListening();
});
</script>

<style lang="scss" scoped>
.game-title {
  display: flex;
  align-items: center;
  margin-left: 12px;
  gap: 8px;

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }
}

.game-title-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  filter: var(--icon-filter);
}

.game-launch-btn {
  border-radius: 4px;
  margin-right: 12px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.game-install-btn {
  margin-right: 4px;
}

.game-task-clean-btn {
  margin-right: 8px;
}

.game-page {
  display: flex;
  height: calc(100vh - 100px);
  flex-direction: column;
  color: var(--app-page-content);
  font-family: var(--font-text);
  overflow-y: auto;
  row-gap: 8px;
}

.game-list {
  width: 100%;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--box-bg-1);
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

.game-path {
  display: flex;
  align-items: center;
  padding: 8px 16px;
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
  background: var(--box-bg-2);
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
  background: var(--box-bg-2);
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

.game-empty {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--box-text-2);
  gap: 12px;
}

.game-empty-title {
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
}

@media (width <= 900px) {
  .game-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
