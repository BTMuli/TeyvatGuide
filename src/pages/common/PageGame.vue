<template>
  <v-app-bar
    :class="{ 'game-app-bar-frost': pageCoverUrl !== null }"
    :color="pageCoverUrl !== null ? 'transparent' : undefined"
    :elevation="pageCoverUrl !== null ? 0 : undefined"
    :flat="pageCoverUrl !== null"
  >
    <template #prepend>
      <div class="game-title">
        <img alt="启动器" class="game-title-icon" src="/platforms/mhy/launcher.webp" />
        <span class="game-title-text">
          游戏安装
          <span class="game-title-beta">Beta</span>
        </span>
      </div>
    </template>
    <template #append>
      <v-btn
        :disabled="installationsLoading || launching"
        class="game-install-btn"
        color="var(--tgc-od-orange)"
        prepend-icon="mdi-plus-box-outline"
        variant="tonal"
        @click="openClientSourceOverlay"
      >
        添加新客户端
      </v-btn>
      <v-btn
        aria-label="查看任务历史"
        class="game-task-history-btn"
        prepend-icon="mdi-history"
        title="查看任务历史"
        variant="tonal"
        @click="openTaskHistoryOverlay"
      >
        任务历史
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

  <div :class="{ 'game-page-cover': pageCoverUrl !== null }" class="game-page">
    <div v-if="installationsLoading && installations.length === 0" class="game-empty" role="status">
      <v-progress-circular indeterminate />
      <span class="game-empty-title">正在读取本地安装…</span>
    </div>
    <v-list v-else-if="installations.length === 0" class="game-list">
      <div class="game-list-header">
        <span>本地安装</span>
      </div>
      <v-list-item
        subtitle="从已发现的安装中选择，或手动指定国服 YuanShen.exe"
        title="选择游戏路径"
        @click="openPathOverlay(null)"
      >
        <template #prepend>
          <div class="game-icon">
            <v-icon>mdi-folder-search-outline</v-icon>
          </div>
        </template>
      </v-list-item>
    </v-list>
    <template v-else>
      <PgInstallation
        v-for="installation in installations"
        :key="installation.id"
        :installation="installation"
        :installation-count="installations.length"
        @updated="refreshPageData"
        @change-path="openPathOverlay"
      />
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
  <PgoClientSource
    v-if="clientSourceMounted"
    v-model="clientSourceOverlay"
    @create-new="openInstallOverlay"
    @locate-existing="openPathOverlay(null)"
  />
  <PgoPath
    v-if="pathMounted"
    v-model="pathOverlay"
    :currentPath="pathTarget?.executablePath ?? undefined"
    @selected="refreshPageData"
  />
  <PgoInstall
    v-if="installMounted"
    v-model="installOverlay"
    :initialConfig="installInitialConfig"
    :installedSchemes
    @completed="refreshPageData"
  />
  <PgoTaskHistory v-if="taskHistoryMounted" v-model="taskHistoryOverlay" />
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import { useHoYoPlayPageCover, usePageCover } from "@hooks/usePageCover.js";
import useAppStore from "@store/app.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import useUserStore from "@store/user.js";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { confirmStopRunningGame, tryLaunchGame } from "@utils/TGGame.js";
import {
  createGamePackageSwitchPlan,
  ensureGameInstallDefenderExclusions,
  listGameInstallDrafts,
  listGameInstallations,
} from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from "vue";

const PgCache = defineAsyncComponent(() => import("@comp/pageGame/pg-cache.vue"));
const PgInstallDraft = defineAsyncComponent(() => import("@comp/pageGame/pg-install-draft.vue"));
const PgInstallTask = defineAsyncComponent(() => import("@comp/pageGame/pg-install-task.vue"));
const PgInstallation = defineAsyncComponent(() => import("@comp/pageGame/pg-installation.vue"));
const PgoClientSource = defineAsyncComponent(() => import("@comp/pageGame/pgo-client-source.vue"));
const PgoInstall = defineAsyncComponent(() => import("@comp/pageGame/pgo-install.vue"));
const PgoPath = defineAsyncComponent(() => import("@comp/pageGame/pgo-path.vue"));
const PgoTaskHistory = defineAsyncComponent(() => import("@comp/pageGame/pgo-task-history.vue"));

const taskStore = useGameLauncherStore();
const { isLogin } = storeToRefs(useAppStore());
const { account, cookie } = storeToRefs(useUserStore());
const launching = ref<boolean>(false);
const clientSourceOverlay = ref<boolean>(false);
const pathOverlay = ref<boolean>(false);
const pathTarget = ref<TGApp.Game.Installation.Item | null>(null);
const installOverlay = ref<boolean>(false);
const taskHistoryOverlay = ref<boolean>(false);
// 浮层首次打开后保持挂载，关闭只切 v-model，让 TOverlay 的消失过渡有播放时间
const clientSourceMounted = ref<boolean>(false);
const pathMounted = ref<boolean>(false);
const installMounted = ref<boolean>(false);
const taskHistoryMounted = ref<boolean>(false);
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
let pageActive = true;
let pageDataRefreshPromise: Promise<void> | null = null;
let pageDataRefreshRequested = false;

const chosen = computed<TGApp.Game.Installation.Item | null>(() => {
  return installations.value.find((installation) => installation.isChosen) ?? null;
});
useHoYoPlayPageCover();
const { pageCoverUrl } = usePageCover();
const installTasks = computed<Array<TGApp.Game.Package.TaskSummary>>(() => {
  return Object.values(taskStore.tasksByInstallation).filter(
    (task) =>
      task.target === gameEnum.package.planTarget.INSTALL &&
      task.state !== gameEnum.package.taskState.COMPLETED &&
      task.state !== gameEnum.package.taskState.CANCELED,
  );
});
const completedInstallTaskKey = computed<string>(() => {
  return Object.values(taskStore.tasksByInstallation)
    .filter(
      (task) =>
        task.target === gameEnum.package.planTarget.INSTALL &&
        task.state === gameEnum.package.taskState.COMPLETED,
    )
    .map((task) => task.taskId)
    .sort()
    .join(":");
});
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
function openInstallOverlay(): void {
  installInitialConfig.value = null;
  installOverlay.value = true;
}

function openClientSourceOverlay(): void {
  clientSourceOverlay.value = true;
}

function openTaskHistoryOverlay(): void {
  taskHistoryOverlay.value = true;
}

function openPathOverlay(installation: TGApp.Game.Installation.Item | null): void {
  pathTarget.value = installation;
  pathOverlay.value = true;
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
  if (chosen.value.schemeId === gameEnum.installation.scheme.CN_OFFICIAL && !isLogin.value) {
    return "启动国服官服前请先登录米游社";
  }
  const task = taskStore.tasksByInstallation[chosen.value.id];
  if (task !== undefined && taskBlocksLaunch(task.state)) {
    return "存在进行中或等待恢复的资源提交，暂时不能启动";
  }
  return null;
});
const launchNeedsSchemeSwitch = computed<boolean>(() => {
  return (
    chosen.value?.schemeId === gameEnum.installation.scheme.CN_OFFICIAL &&
    isLogin.value &&
    account.value.isOfficial !== 1
  );
});
const launchTitle = computed<string>(() => {
  if (launchBlockReason.value !== null) return launchBlockReason.value;
  if (launchNeedsSchemeSwitch.value) return "当前账号是 B 服，启动将先换服";
  return "启动游戏";
});

/**
 * 判断安装是否正在校验，换服前不能改写渠道。
 * @since Beta v0.11.5
 * @param installationId - 安装 ID
 * @returns 校验进行中时为 true
 */
function isInstallationVerifyBusy(installationId: string): boolean {
  const summary = taskStore.verifyByInstallation[installationId];
  return (
    (summary !== undefined && gameEnum.package.verifyActive(summary.state)) ||
    taskStore.pendingActions[`verify:${installationId}`] === true ||
    taskStore.pendingActions[`verify-clear:${installationId}`] === true
  );
}

/**
 * 判断是否已有未结束的非换服任务挡住渠道转换。
 * @since Beta v0.11.5
 * @param installationId - 安装 ID
 * @returns 存在阻挡任务时为 true
 */
function hasBlockingNonSwitchTask(installationId: string): boolean {
  const task = taskStore.tasksByInstallation[installationId];
  if (task === undefined || task.target === gameEnum.package.planTarget.SWITCH) return false;
  return (
    task.state !== gameEnum.package.taskState.COMPLETED &&
    task.state !== gameEnum.package.taskState.FAILED &&
    task.state !== gameEnum.package.taskState.CANCELED
  );
}

/**
 * B 服账号启动官服安装时，确认后转为 B 服。
 * @since Beta v0.11.5
 * @param installation - 当前主启动安装
 */
async function handleLaunchSchemeSwitch(installation: TGApp.Game.Installation.Item): Promise<void> {
  const existing = taskStore.tasksByInstallation[installation.id];
  if (
    existing !== undefined &&
    existing.target === gameEnum.package.planTarget.SWITCH &&
    gameEnum.package.taskActive(existing.state)
  ) {
    await showDialog.checkF({
      title: "正在换服",
      text: "客户端正在转为国服 B 服，完成后即可启动。",
      confirmLabel: "知道了",
    });
    return;
  }
  if (isInstallationVerifyBusy(installation.id)) {
    await showDialog.checkF({
      title: "暂时无法启动",
      text: "正在校验资源，暂时不能换服。",
      confirmLabel: "知道了",
    });
    return;
  }
  if (hasBlockingNonSwitchTask(installation.id)) {
    await showDialog.checkF({
      title: "暂时无法启动",
      text: "存在进行中的资源任务，暂时不能换服。",
      confirmLabel: "知道了",
    });
    return;
  }
  const confirmed = await showDialog.checkF({
    title: "确认转换服务器?",
    text: "当前米游社账号是渠道服（B服），安装版本是国服官服。确认后会把客户端转为国服 B 服。",
    confirmLabel: "开始换服",
  });
  if (confirmed !== true) return;
  launching.value = true;
  try {
    const nextPlan = await createGamePackageSwitchPlan(installation.id);
    if (!nextPlan.hasSufficientSpace) {
      showSnackbar.warn("磁盘空间不足，暂时不能换服");
      return;
    }
    if (!(await confirmStopRunningGame("换服"))) return;
    const task = await taskStore.applySwitch(nextPlan.planId);
    showSnackbar.success(`已开始转换为${gameEnum.installation.schemeDesc(nextPlan.targetScheme)}`);
    if (task.state === gameEnum.package.taskState.COMPLETED) await refreshPageData();
  } catch (error) {
    showSnackbar.error(`换服失败：${error}`);
  } finally {
    launching.value = false;
  }
}

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
  const installation = chosen.value;
  if (installation !== null && launchNeedsSchemeSwitch.value) {
    await handleLaunchSchemeSwitch(installation);
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
  pageDataRefreshRequested = true;
  if (pageDataRefreshPromise !== null) return pageDataRefreshPromise;
  pageDataRefreshPromise = (async () => {
    await Promise.resolve();
    try {
      while (pageActive && pageDataRefreshRequested) {
        pageDataRefreshRequested = false;
        await Promise.all([refreshRegistered(), refreshInstallDrafts()]);
      }
    } finally {
      pageDataRefreshPromise = null;
    }
  })();
  return pageDataRefreshPromise;
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
  const ready = await ensureGameInstallDefenderExclusions(
    draft.installId,
    draft.planId,
    "添加排除并恢复安装",
  );
  if (!ready) return;
  try {
    await taskStore.resumeInstallDraft(draft);
    await refreshPageData();
  } catch (error) {
    if (isInstallMarkerMissingError(error)) {
      if (draft.planId === null) {
        showSnackbar.error(`恢复游戏安装失败：${error}`);
        return;
      }
      await handleInstallMarkerMissing(draft.planId, draft.installId);
      return;
    }
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
    const decision = await showDialog.checkF({
      title: "放弃安装任务？",
      text: "将清理当前安装草稿。已下载内容可转为共享下载缓存，供后续更新或重新安装复用；也可以随任务一并删除。已发布的游戏目录不受影响。",
      confirmLabel: "转为下载缓存",
      cancelLabel: "删除下载",
    });
    if (decision === undefined) return;
    await handleInstallTaskAbandon(task, decision);
    return;
  }
  const ready = await ensureGameInstallDefenderExclusions(
    task.installationId,
    task.planId,
    "添加排除并恢复安装",
  );
  if (!ready) return;
  try {
    const updated = await taskStore.recoverInstall(task.taskId, task.installationId, action);
    if (updated.state === gameEnum.package.taskState.COMPLETED) {
      await refreshPageData();
    }
  } catch (error) {
    if (isInstallMarkerMissingError(error)) {
      await handleInstallMarkerMissing(task.taskId, task.installationId);
      return;
    }
    showSnackbar.error(`恢复游戏安装失败：${error}`);
  }
}

const installMarkerMissingText = "缺少安装标记";

function isInstallMarkerMissingError(error: unknown): boolean {
  return String(error).includes(installMarkerMissingText);
}

async function handleInstallMarkerMissing(taskId: string, installId: string): Promise<void> {
  const decision = await showDialog.checkF({
    title: "恢复安装标记",
    text: "最终游戏目录缺少安装标记。可全量校验目录内容并重建安装标记、继续完成登记；也可以放弃当前安装（不会删除已发布的游戏目录）。",
    confirmLabel: "校验并恢复",
    cancelLabel: "放弃安装",
  });
  if (decision === undefined) return;
  if (decision === true) {
    try {
      const updated = await taskStore.recoverInstall(
        taskId,
        installId,
        gameEnum.package.recoveryAction.RESTORE_MARKER,
      );
      if (updated.state === gameEnum.package.taskState.COMPLETED) {
        await refreshPageData();
      }
      showSnackbar.success("安装标记已恢复，游戏安装已完成登记");
    } catch (error) {
      showSnackbar.error(`校验并恢复安装标记失败：${error}`);
    }
    return;
  }
  try {
    const updated = await taskStore.recoverInstall(
      taskId,
      installId,
      gameEnum.package.recoveryAction.ROLLBACK,
    );
    if (
      updated.state === gameEnum.package.taskState.COMPLETED ||
      updated.state === gameEnum.package.taskState.CANCELED
    ) {
      await refreshPageData();
    }
    showSnackbar.info("已放弃安装，已发布的游戏目录保留");
  } catch (error) {
    showSnackbar.error(`放弃游戏安装失败：${error}`);
  }
}

async function handleInstallTaskAbandon(
  task: TGApp.Game.Package.TaskSummary,
  keepDownloads: boolean,
): Promise<void> {
  let unlisten: UnlistenFn | null = null;
  if (keepDownloads) {
    unlisten = await listen<TGApp.Game.Package.InstallAbandonProgress>(
      "game-install://abandon-progress",
      (event) => {
        const { completed, total } = event.payload;
        void showLoading.update(
          total > 0 ? `正在转为下载缓存 ${completed}/${total}…` : "正在转为下载缓存…",
        );
      },
    );
    await showLoading.start("正在转为下载缓存", "正在核对已下载分片…");
  }
  try {
    const updated = await taskStore.recoverInstall(
      task.taskId,
      task.installationId,
      gameEnum.package.recoveryAction.ROLLBACK,
      keepDownloads,
    );
    if (updated.state === gameEnum.package.taskState.COMPLETED) {
      await refreshPageData();
    }
    if (keepDownloads) {
      await showLoading.end();
      showSnackbar.info("安装任务已放弃，已下载内容已转为共享缓存");
    } else {
      showSnackbar.info("安装任务已删除，下载内容已清理；已发布的游戏目录保留");
    }
  } catch (error) {
    if (keepDownloads) {
      await showLoading.end();
    }
    showSnackbar.error(`${keepDownloads ? "放弃并保留下载" : "删除"}游戏安装失败：${error}`);
  } finally {
    if (unlisten !== null) {
      unlisten();
    }
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
watch(clientSourceOverlay, (open) => {
  if (open) clientSourceMounted.value = true;
});
watch(pathOverlay, (open) => {
  if (open) pathMounted.value = true;
});
watch(installOverlay, (open) => {
  if (open) installMounted.value = true;
});
watch(taskHistoryOverlay, (open) => {
  if (open) taskHistoryMounted.value = true;
});
watch(installOverlay, (visible) => {
  if (!visible) installInitialConfig.value = null;
});
watch(completedInstallTaskKey, (taskKey) => {
  if (taskKey.length === 0) return;
  const completedInstallationIds = new Set(
    Object.values(taskStore.tasksByInstallation)
      .filter(
        (task) =>
          task.target === gameEnum.package.planTarget.INSTALL &&
          task.state === gameEnum.package.taskState.COMPLETED,
      )
      .map((task) => task.installationId),
  );
  installDrafts.value = installDrafts.value.filter(
    (draft) => !completedInstallationIds.has(draft.installId),
  );
  void refreshPageData();
});
onUnmounted(() => {
  pageActive = false;
  taskStore.stopListening();
});
</script>

<style lang="scss" scoped>
.game-app-bar-frost {
  border-bottom: 1px solid var(--common-shadow-1);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 58%, transparent) !important;
}

.game-title {
  display: flex;
  align-items: center;
  margin-left: 12px;
  gap: 8px;
}

.game-title-text {
  position: relative;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.game-title-beta {
  position: absolute;
  top: -6px;
  right: -4px;
  padding: 0 4px;
  border-radius: 2px;
  background: var(--tgc-od-orange);
  color: var(--tgc-white-1);
  font-family: var(--font-text);
  font-size: 10px;
  line-height: 14px;
  pointer-events: none;
  transform: translateX(100%);
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

.game-task-history-btn {
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

.game-page-cover {
  padding-bottom: 144px;

  .game-empty,
  :deep(.audio-throughput),
  :deep(.audio-throughput-window),
  :deep(.cache-panel),
  :deep(.game-list),
  :deep(.install-draft),
  :deep(.install-task),
  :deep(.install-throughput),
  :deep(.install-throughput-window),
  :deep(.update-throughput),
  :deep(.update-throughput-window) {
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    background: color-mix(in srgb, var(--box-bg-1) 30%, transparent);
  }

  .game-empty,
  :deep(.audio-throughput),
  :deep(.audio-throughput-window),
  :deep(.cache-panel),
  :deep(.game-list),
  :deep(.install-task),
  :deep(.install-throughput),
  :deep(.install-throughput-window),
  :deep(.update-throughput),
  :deep(.update-throughput-window) {
    border: 1px solid var(--common-shadow-1);
  }

  .game-icon,
  :deep(.audio-throughput-chart),
  :deep(.cache-fact),
  :deep(.game-fact),
  :deep(.game-icon),
  :deep(.game-notice),
  :deep(.install-draft-config-item),
  :deep(.install-task-config-item),
  :deep(.install-throughput-chart),
  :deep(.plan-summary),
  :deep(.progress-panel:not(.embedded)),
  :deep(.task-panel),
  :deep(.task-progress),
  :deep(.update-throughput-chart) {
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    background: color-mix(in srgb, var(--box-bg-2) 20%, transparent);
  }
}
</style>
