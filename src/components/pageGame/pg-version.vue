<template>
  <div class="version-body">
    <slot
      name="facts"
      :loading
      :refreshDisabled
      :refreshSnapshot
      :snapshot
      :startVerify="verifyInstallation"
      :verifyActive
      :verifyBusy
      :verifyPending
      :verifyResumeLabel
    />

    <PgProgress
      v-if="verifyPanelVisible"
      ariaLabel="完整性校验进度"
      :caption="verifyCaption"
      :currentFile="verifyActive ? (currentVerify?.currentFile ?? null) : null"
      :errorMessage="verifyPanelError"
      :facts="verifyFacts"
      :indeterminate="!verifyActive || currentVerify === null || currentVerify.totalBytes === 0"
      :percent="verifyBytePercent"
      :showBar="verifyActive || verifyPending"
      :tone="verifyCaptionTone"
    >
      <template #actions>
        <v-icon
          v-if="verifyActive"
          aria-label="暂停校验"
          class="verify-act"
          role="button"
          size="16"
          tabindex="0"
          title="暂停"
          @click="cancelVerify"
        >
          mdi-pause-circle-outline
        </v-icon>
        <v-icon
          v-else-if="verifyCanResume"
          aria-label="继续校验"
          class="verify-act"
          role="button"
          size="16"
          tabindex="0"
          title="继续"
          @click="verifyInstallation"
        >
          mdi-play-circle-outline
        </v-icon>
        <v-icon
          v-if="!verifyStopping"
          aria-label="停止校验"
          class="verify-act"
          role="button"
          size="16"
          tabindex="0"
          title="停止"
          @click="clearVerifyTask"
        >
          mdi-stop-circle-outline
        </v-icon>
      </template>
    </PgProgress>

    <PgNotice
      v-if="errorMessage !== null"
      class="version-error"
      :text="errorMessage"
      tone="warning"
    />
    <div
      v-if="snapshot !== null && (snapshot.updateAvailable || snapshot.preDownloadAvailable)"
      class="version-actions"
    >
      <v-btn
        v-if="snapshot.updateAvailable"
        :disabled="planningTarget !== null || taskActive || verifyActive"
        :loading="planningTarget === gameEnum.package.planTarget.MAIN"
        prepend-icon="mdi-file-tree-outline"
        size="small"
        variant="outlined"
        @click="createPlan(gameEnum.package.planTarget.MAIN)"
      >
        评估正式更新
      </v-btn>
      <v-btn
        v-if="snapshot.preDownloadAvailable"
        :disabled="planningTarget !== null || taskActive || verifyActive"
        :loading="planningTarget === gameEnum.package.planTarget.PRE_DOWNLOAD"
        prepend-icon="mdi-cloud-download-outline"
        size="small"
        variant="tonal"
        @click="createPlan(gameEnum.package.planTarget.PRE_DOWNLOAD)"
      >
        评估预下载
      </v-btn>
    </div>

    <PgProgress
      v-if="planningTarget !== null"
      ariaLabel="资源计划评估进度"
      :caption="planProgress?.message ?? '正在准备资源评估…'"
      :facts="planProgress === null ? [] : [`步骤 ${planProgress.step} / ${planProgress.total}`]"
      :indeterminate="planProgress === null"
      :percent="planProgressPercent"
    />

    <div v-if="plan !== null" class="plan-summary" aria-live="polite">
      <div class="plan-title">
        <div>
          <span>{{ plan.sourceTag === plan.targetTag ? "修复计划已固化" : "计划已固化" }}</span>
          <strong v-if="plan.sourceTag === plan.targetTag">修复 {{ plan.targetTag }}</strong>
          <strong v-else>{{ plan.sourceTag }} → {{ plan.targetTag }}</strong>
        </div>
        <v-chip
          :color="plan.hasSufficientSpace ? 'success' : 'warning'"
          size="small"
          variant="tonal"
        >
          {{ plan.hasSufficientSpace ? "空间充足" : "空间不足" }}
        </v-chip>
      </div>
      <dl>
        <div>
          <dt>差异方式</dt>
          <dd>{{ gameEnum.package.planStrategyDesc(plan.strategy) }}</dd>
        </div>
        <div>
          <dt>预计下载</dt>
          <dd>{{ formatBytes(plan.downloadBytes - plan.cacheHitBytes) }}</dd>
        </div>
        <div>
          <dt>安装写入</dt>
          <dd>{{ formatBytes(plan.installBytes) }}</dd>
        </div>
        <div>
          <dt>缓存命中</dt>
          <dd>{{ formatBytes(plan.cacheHitBytes) }}</dd>
        </div>
        <div>
          <dt>磁盘空间</dt>
          <dd>
            需要 {{ formatBytes(plan.requiredFreeBytes) }} · 可用
            {{ formatBytes(plan.availableFreeBytes) }}
          </dd>
        </div>
        <div>
          <dt>文件变化</dt>
          <dd v-if="plan.sourceTag === plan.targetTag">{{ plan.addCount }} 个待修复文件</dd>
          <dd v-else>
            {{ plan.addCount }} 新增 · {{ plan.modifyCount }} 修改 · {{ plan.deleteCount }} 删除
          </dd>
        </div>
      </dl>
      <p>
        {{
          plan.sourceTag === plan.targetTag
            ? "下载只写入应用缓存；应用修复时不会改写版本号。"
            : "下载只写入应用缓存；不会在此阶段修改游戏目录。"
        }}
      </p>
    </div>
    <PgTask
      :actionPending="taskActionPending"
      :plan
      :recoveryProgress="currentRecoveryProgress"
      :targetPublished
      :task="currentTask"
      @apply-requested="handleApplyRequested"
      @cancel-requested="handleCancelRequested"
      @recover-requested="handleRecoverRequested"
      @start-requested="handleStartRequested"
    />
  </div>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { confirmStopRunningGame } from "@utils/TGGame.js";
import { createGamePackagePlan, getGamePackageSnapshot } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, onUnmounted, ref, watch } from "vue";

import PgNotice from "./pg-notice.vue";
import PgProgress from "./pg-progress.vue";
import PgTask from "./pg-task.vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

type VersionFactsSlot = {
  loading: boolean;
  refreshDisabled: boolean;
  refreshSnapshot: () => Promise<void>;
  snapshot: TGApp.Game.Package.Snapshot | null;
  startVerify: () => Promise<void>;
  verifyActive: boolean;
  verifyBusy: boolean;
  verifyPending: boolean;
  verifyResumeLabel: string;
};

const { installation } = defineProps<Props>();
const emit = defineEmits<{ updated: [] }>();
defineSlots<{ facts(props: VersionFactsSlot): unknown }>();
const taskStore = useGameLauncherStore();
const { pendingActions, recoveryProgressByTask, tasksByInstallation, verifyByInstallation } =
  storeToRefs(taskStore);
const snapshot = ref<TGApp.Game.Package.Snapshot | null>(null);
const plan = ref<TGApp.Game.Package.PlanSummary | null>(null);
const loading = ref<boolean>(false);
const planningTarget = ref<TGApp.Game.Package.PlanTargetEnum | null>(null);
const planProgress = ref<TGApp.Game.Package.PlanProgress | null>(null);
const exitingGame = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const verifyStartError = ref<string | null>(null);
const verifyStopping = ref<boolean>(false);
let verifyHideTimer: number | null = null;
let verifyStoppingInstallationId: string | null = null;
let requestSequence = 0;

const currentTask = computed<TGApp.Game.Package.TaskSummary | null>(() => {
  const task = tasksByInstallation.value[installation.id];
  if (task === undefined || task.target === gameEnum.package.planTarget.SWITCH) return null;
  return task;
});
const currentRecoveryProgress = computed<TGApp.Game.Package.RecoveryProgress | null>(() => {
  const taskId = currentTask.value?.taskId;
  return taskId === undefined ? null : (recoveryProgressByTask.value[taskId] ?? null);
});
const currentVerify = computed<TGApp.Game.Package.VerifySummary | null>(() => {
  return verifyByInstallation.value[installation.id] ?? null;
});
const verifyActive = computed<boolean>(() => {
  return (
    !verifyStopping.value &&
    currentVerify.value !== null &&
    gameEnum.package.verifyActive(currentVerify.value.state)
  );
});
const verifyPending = computed<boolean>(() => {
  return pendingActions.value[`verify:${installation.id}`] === true;
});
const verifyClearing = computed<boolean>(() => {
  return pendingActions.value[`verify-clear:${installation.id}`] === true;
});
const verifyBusy = computed<boolean>(() => {
  return verifyStopping.value || verifyActive.value || verifyPending.value || verifyClearing.value;
});
const verifyCanResume = computed<boolean>(() => {
  if (verifyBusy.value) return false;
  const state = currentVerify.value?.state;
  return (
    state === gameEnum.package.verifyState.CANCELED || state === gameEnum.package.verifyState.FAILED
  );
});
const verifyPanelVisible = computed<boolean>(() => {
  if (verifyStopping.value) return true;
  if (verifyPending.value || verifyStartError.value !== null) return true;
  const summary = currentVerify.value;
  if (summary === null) return false;
  return (
    summary.state === gameEnum.package.verifyState.SCANNING ||
    summary.state === gameEnum.package.verifyState.FAILED ||
    summary.state === gameEnum.package.verifyState.CANCELED
  );
});
const verifyResumeLabel = computed<string>(() => {
  const state = currentVerify.value?.state;
  if (
    state === gameEnum.package.verifyState.CANCELED ||
    state === gameEnum.package.verifyState.FAILED
  ) {
    return "继续校验";
  }
  return "校验完整性";
});
const verifyBytePercent = computed<number>(() => {
  if (currentVerify.value === null || currentVerify.value.totalBytes === 0) return 0;
  return Math.min(100, (currentVerify.value.hashedBytes / currentVerify.value.totalBytes) * 100);
});
const verifyCaption = computed<string>(() => {
  if (verifyStopping.value) return "已停止完整性校验";
  if (verifyPending.value && !verifyActive.value) return "正在开始校验…";
  if (verifyStartError.value !== null && currentVerify.value === null) return "无法开始校验";
  const summary = currentVerify.value;
  if (summary === null) return "";
  return gameEnum.package.verifyStateDesc(summary.state);
});
const verifyCaptionTone = computed<"" | "err" | "ok" | "warn">(() => {
  if (verifyStopping.value) return "warn";
  const summary = currentVerify.value;
  if (verifyPending.value && !verifyActive.value) return "";
  if (verifyStartError.value !== null) return "err";
  if (summary === null) return "";
  if (summary.errorMessage !== null || summary.state === gameEnum.package.verifyState.FAILED) {
    return "err";
  }
  if (summary.state === gameEnum.package.verifyState.CANCELED) return "warn";
  return "";
});
const verifyPanelError = computed<string | null>(() => {
  if (verifyStartError.value !== null) return verifyStartError.value;
  return currentVerify.value?.errorMessage ?? null;
});
const verifyFacts = computed<Array<string>>(() => {
  if (verifyPending.value && !verifyActive.value) return [];
  const summary = currentVerify.value;
  if (summary === null) return [];
  if (
    summary.state !== gameEnum.package.verifyState.SCANNING &&
    summary.state !== gameEnum.package.verifyState.FAILED &&
    summary.state !== gameEnum.package.verifyState.CANCELED
  ) {
    return [];
  }
  const facts: Array<string> = [
    `总进度 ${formatBytes(summary.hashedBytes)} / ${formatBytes(summary.totalBytes)}`,
    `文件 ${summary.completedFiles} / ${summary.totalFiles}`,
  ];
  if (summary.bytesPerSecond > 0) facts.push(`${formatBytes(summary.bytesPerSecond)}/s`);
  if (summary.etaSeconds !== null) facts.push(`预计剩余 ${formatDuration(summary.etaSeconds)}`);
  if (verifyActive.value) facts.push(`当前耗时 ${formatElapsed(summary.elapsedMs)}`);
  return facts;
});
const targetPublished = computed<boolean>(() => {
  return (
    currentTask.value !== null &&
    snapshot.value !== null &&
    (snapshot.value.main.tag === currentTask.value.targetTag ||
      currentTask.value.sourceTag === currentTask.value.targetTag)
  );
});
const audioApplyPreparing = computed<boolean>(() => {
  return (
    currentTask.value?.target === gameEnum.package.planTarget.AUDIO &&
    currentTask.value.state === gameEnum.package.taskState.READY_TO_APPLY &&
    currentTask.value.currentFile !== null
  );
});
const taskActive = computed<boolean>(() => {
  return (
    currentTask.value !== null &&
    (gameEnum.package.taskActive(currentTask.value.state) || audioApplyPreparing.value)
  );
});
const refreshDisabled = computed<boolean>(() => {
  return planningTarget.value !== null || taskActive.value || verifyActive.value;
});
const taskActionPending = computed<boolean>(() => {
  const taskId = currentTask.value?.taskId;
  return (
    exitingGame.value ||
    pendingActions.value[installation.id] === true ||
    (taskId !== undefined && pendingActions.value[taskId] === true)
  );
});
const planProgressPercent = computed<number>(() => {
  const progress = planProgress.value;
  if (progress === null || progress.total === 0) return 0;
  return Math.min(100, (progress.step / progress.total) * 100);
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (const candidate of units.slice(1)) {
    if (value < 1024) break;
    value /= 1024;
    unit = candidate;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.ceil(minutes / 60)} 小时`;
}

function formatElapsed(milliseconds: number): string {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours} 小时 ${minutes} 分 ${seconds} 秒`;
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒`;
  return `${seconds} 秒`;
}

function clearVerifyHideTimer(): void {
  if (verifyHideTimer !== null) {
    window.clearTimeout(verifyHideTimer);
    verifyHideTimer = null;
  }
  if (verifyStoppingInstallationId !== null) {
    taskStore.dismissVerify(verifyStoppingInstallationId);
    verifyStoppingInstallationId = null;
  }
}

function scheduleVerifyHide(): void {
  if (verifyHideTimer !== null) window.clearTimeout(verifyHideTimer);
  const installationId = installation.id;
  const sessionId = currentVerify.value?.sessionId ?? null;
  verifyStoppingInstallationId = installationId;
  verifyStopping.value = true;
  verifyHideTimer = window.setTimeout(() => {
    verifyHideTimer = null;
    const current = currentVerify.value;
    if (sessionId === null || current === null || current.sessionId === sessionId) {
      taskStore.dismissVerify(installationId);
    }
    verifyStoppingInstallationId = null;
    verifyStopping.value = false;
  }, 5000);
}

async function loadSnapshot(notify: boolean): Promise<void> {
  const sequence = ++requestSequence;
  loading.value = true;
  errorMessage.value = null;
  try {
    const result = await getGamePackageSnapshot(installation.id);
    if (sequence !== requestSequence) return;
    snapshot.value = result;
    if (
      plan.value !== null &&
      plan.value.sourceTag !== plan.value.targetTag &&
      plan.value.targetTag !== result.main.tag &&
      result.preDownload?.tag !== plan.value.targetTag
    ) {
      plan.value = null;
    }
    if (!notify) return;
    if (result.updateAvailable) {
      showSnackbar.success(`远端版本已刷新，可更新至 ${result.main.tag}`);
      return;
    }
    if (result.preDownloadAvailable && result.preDownload !== null) {
      showSnackbar.success(`远端版本已刷新，可预下载 ${result.preDownload.tag}`);
      return;
    }
    showSnackbar.success(`远端版本已刷新，当前已是 ${result.main.tag}`);
  } catch (error) {
    if (sequence !== requestSequence) return;
    errorMessage.value = `读取远端版本失败：${error}`;
    if (notify) showSnackbar.error(`读取远端版本失败：${error}`);
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

async function refreshSnapshot(): Promise<void> {
  await loadSnapshot(true);
}

async function createPlan(target: TGApp.Game.Package.PlanTargetEnum): Promise<void> {
  if (planningTarget.value !== null || verifyActive.value) return;
  planningTarget.value = target;
  planProgress.value = null;
  errorMessage.value = null;
  try {
    plan.value = await createGamePackagePlan(installation.id, target, (progress) => {
      planProgress.value = progress;
    });
  } catch (error) {
    errorMessage.value = `生成资源计划失败：${error}`;
  } finally {
    planningTarget.value = null;
    planProgress.value = null;
  }
}

async function verifyInstallation(): Promise<void> {
  if (planningTarget.value !== null || verifyBusy.value || taskActive.value) return;
  const paused = currentVerify.value?.state === gameEnum.package.verifyState.CANCELED;
  if (!paused) {
    const failed = currentVerify.value?.state === gameEnum.package.verifyState.FAILED;
    const confirmed = await showDialog.checkF({
      title: failed ? "继续完整性校验？" : "开始完整性校验？",
      text: failed
        ? "将从上次进度继续对照当前安装版本清单扫描本地文件。"
        : "会对照当前安装版本清单扫描本地文件，可能需要较长时间。游戏可以继续运行。",
      confirmLabel: failed ? "继续校验" : "开始校验",
    });
    if (confirmed !== true) return;
  }
  errorMessage.value = null;
  verifyStartError.value = null;
  try {
    await taskStore.startVerify(installation.id);
  } catch (error) {
    verifyStartError.value = `校验资源完整性失败：${error}`;
  }
}

async function cancelVerify(): Promise<void> {
  if (!verifyActive.value) return;
  try {
    await taskStore.cancelVerify(installation.id);
    showSnackbar.info("已暂停完整性校验");
  } catch (error) {
    showSnackbar.error(`暂停完整性校验失败：${error}`);
  }
}

async function clearVerifyTask(): Promise<void> {
  if (verifyClearing.value || verifyStopping.value) return;
  try {
    await taskStore.clearVerify(installation.id);
    verifyStartError.value = null;
    scheduleVerifyHide();
    showSnackbar.info("已停止完整性校验");
  } catch (error) {
    showSnackbar.error(`清除完整性校验失败：${error}`);
  }
}

async function handleStartRequested(): Promise<void> {
  if (plan.value === null || taskActive.value) return;
  const integrity = plan.value.sourceTag === plan.value.targetTag;
  const confirmed = await showDialog.checkF({
    title: integrity ? "开始修复下载？" : "开始资源下载？",
    text: integrity
      ? `将修复 ${plan.value.addCount} 个文件，还需下载 ${formatBytes(
          plan.value.downloadBytes - plan.value.cacheHitBytes,
        )}。下载只写入应用缓存，完成后不会改写版本号。`
      : `目标版本 ${plan.value.targetTag}，还需下载 ${formatBytes(
          plan.value.downloadBytes - plan.value.cacheHitBytes,
        )}。下载只写入应用缓存，游戏可以继续运行。`,
    confirmLabel: "开始下载",
  });
  if (confirmed !== true) return;
  try {
    await taskStore.startTask(plan.value);
    showSnackbar.success("资源下载任务已开始");
  } catch (error) {
    showSnackbar.error(`启动资源下载失败：${error}`);
  }
}

async function handleApplyRequested(): Promise<void> {
  const task = currentTask.value;
  if (task === null || task.target === gameEnum.package.planTarget.AUDIO) return;
  const repairing = task.state === gameEnum.package.taskState.REPAIR_REQUIRED;
  const integrity = task.sourceTag === task.targetTag;
  if (
    !repairing &&
    (task.state !== gameEnum.package.taskState.READY_TO_APPLY || !targetPublished.value)
  ) {
    return;
  }
  let title = "应用游戏更新？";
  let text = "应用会修改游戏文件；全部通过后才更新版本。";
  let confirmLabel = "应用更新";
  let successMessage = "已开始应用游戏更新";
  let errorPrefix = "应用游戏更新";
  if (repairing && integrity) {
    title = "继续修复文件？";
    text = "会继续替换仍缺失或损坏的文件，完成后不会改写版本号。";
    confirmLabel = "修复并完成";
    successMessage = "已开始修复文件";
    errorPrefix = "修复文件";
  } else if (repairing) {
    title = "修复未变化文件？";
    text = "会下载并替换缺失或损坏的未变化文件，全部通过后再写入版本号。";
    confirmLabel = "修复并完成";
    successMessage = "已开始修复未变化文件";
    errorPrefix = "修复未变化文件";
  } else if (integrity) {
    title = "应用资源修复？";
    text = "会替换缺失或损坏的文件，全部通过后不会改写版本号。";
    confirmLabel = "应用修复";
    successMessage = "已开始应用资源修复";
    errorPrefix = "应用资源修复";
  }
  const confirmed = await showDialog.checkF({ title, text, confirmLabel });
  if (confirmed !== true) return;
  try {
    exitingGame.value = true;
    if (!(await confirmStopRunningGame("应用更新"))) return;
  } catch (error) {
    showSnackbar.error(`退出游戏失败：${error}`);
    return;
  } finally {
    exitingGame.value = false;
  }
  try {
    const updatedTask = await taskStore.applyTask(task.taskId);
    showSnackbar.success(successMessage);
    if (updatedTask.state === gameEnum.package.taskState.COMPLETED) await loadSnapshot(false);
  } catch (error) {
    showSnackbar.error(`${errorPrefix}失败：${error}`);
  }
}

async function handleCancelRequested(): Promise<void> {
  const task = currentTask.value;
  if (task === null || !taskActive.value) return;
  const applying = gameEnum.package.taskApplying(task.state) || audioApplyPreparing.value;
  const confirmed = await showDialog.checkF({
    title: applying ? "取消资源提交？" : "取消资源下载？",
    text: applying
      ? "会在当前安全检查点停止，并尝试把游戏文件回滚到提交前的状态。已校验的共享下载缓存会保留。若回滚无法证明安全，需要先恢复后才能启动游戏。"
      : "已校验完成的共享缓存会保留，当前下载对象会在安全边界停止。",
    confirmLabel: "请求取消",
  });
  if (confirmed !== true) return;
  try {
    await taskStore.cancelTask(task.taskId);
    if (applying) {
      showSnackbar.info("已请求取消，请等待提交回滚到安全状态");
    } else {
      showSnackbar.info("已请求取消，请等待当前下载对象停止");
    }
  } catch (error) {
    showSnackbar.error(`${applying ? "取消资源提交" : "取消资源下载"}失败：${error}`);
  }
}

async function handleRecoverRequested(
  action: TGApp.Game.Package.RecoveryActionEnum,
): Promise<void> {
  const task = currentTask.value;
  const audioRegistrationPending =
    task?.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.REGISTRATION_PENDING;
  const audioApplyRetry =
    task?.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.READY_TO_APPLY &&
    task.errorMessage !== null;
  if (task === null || (taskActive.value && !audioRegistrationPending && !audioApplyRetry)) return;
  const rollback = action === gameEnum.package.recoveryAction.ROLLBACK;
  if (rollback) {
    const abandonReady = task.state === gameEnum.package.taskState.READY_TO_APPLY;
    const abandonRepair = task.state === gameEnum.package.taskState.REPAIR_REQUIRED;
    let title = "回滚资源任务？";
    let text = "若任务已进入文件提交，会先恢复备份；已校验的共享下载缓存不会删除。";
    let confirmLabel = "安全回滚";
    if (abandonRepair) {
      title = "放弃更新并回滚？";
      text =
        "已提交的新增、修改和删除会回滚到源版本。未完成的修复会先还原；已经修好的未变化文件会保留。已校验缓存不会删除。";
      confirmLabel = "放弃并回滚";
    } else if (abandonReady) {
      const predownload = task.target === gameEnum.package.planTarget.PRE_DOWNLOAD;
      title = predownload ? "放弃预下载任务？" : "放弃资源任务？";
      text = "放弃不会修改游戏目录，也不会删除已校验的共享缓存。之后可以重新评估并下载。";
      confirmLabel = "放弃任务";
    }
    const confirmed = await showDialog.checkF({ title, text, confirmLabel });
    if (confirmed !== true) return;
  }
  const writesGameDir =
    audioApplyRetry ||
    gameEnum.package.taskApplying(task.state) ||
    task.state === gameEnum.package.taskState.RECOVERY_REQUIRED ||
    task.state === gameEnum.package.taskState.REPAIR_REQUIRED;
  if (writesGameDir) {
    try {
      exitingGame.value = true;
      if (!(await confirmStopRunningGame(rollback ? "回滚更新" : "恢复更新"))) return;
    } catch (error) {
      showSnackbar.error(`退出游戏失败：${error}`);
      return;
    } finally {
      exitingGame.value = false;
    }
  }
  try {
    await taskStore.recoverTask(task.taskId, action);
    showSnackbar.success(rollback ? "资源任务已放弃" : "已开始恢复资源任务");
  } catch (error) {
    showSnackbar.error(`${rollback ? "放弃" : "恢复"}资源任务失败：${error}`);
  }
}

watch(
  [() => installation.id, () => installation.version],
  () => {
    clearVerifyHideTimer();
    verifyStopping.value = false;
    verifyStartError.value = null;
    void loadSnapshot(false);
    void taskStore.hydrateVerify(installation.id);
  },
  { immediate: true },
);

watch(
  [() => currentTask.value?.taskId, () => currentTask.value?.state],
  ([taskId, state], [previousTaskId, previousState]) => {
    if (
      taskId !== undefined &&
      state === gameEnum.package.taskState.COMPLETED &&
      (taskId !== previousTaskId || previousState !== gameEnum.package.taskState.COMPLETED)
    ) {
      emit("updated");
    }
  },
);

watch(currentVerify, (next, previous) => {
  if (next === null) return;
  if (
    next.state === gameEnum.package.verifyState.COMPLETED &&
    next.plan !== null &&
    (plan.value === null || plan.value.sourceTag === plan.value.targetTag)
  ) {
    plan.value = next.plan;
  }
  if (
    previous?.state === gameEnum.package.verifyState.SCANNING &&
    next.state === gameEnum.package.verifyState.COMPLETED
  ) {
    if (next.healthy === true) {
      showSnackbar.success("当前安装文件与该版本清单一致");
      return;
    }
    showSnackbar.info(`发现 ${next.issueCount} 个缺失或损坏文件，已生成修复计划`);
  }
});

onUnmounted(() => {
  clearVerifyHideTimer();
  verifyStopping.value = false;
});
</script>

<style lang="scss" scoped>
.version-body {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  padding-bottom: 16px;
  color: var(--box-text-1);
  gap: 12px;
}

.verify-act {
  color: var(--box-text-2);
  cursor: pointer;
}

.plan-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.version-error {
  margin-inline: 16px;
}

.version-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
  padding-inline: 16px;
}

.plan-summary {
  display: grid;
  padding: 12px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 12px;
  margin-inline: 16px;
}

:deep(.task-panel) {
  margin-inline: 16px;
}

.plan-title {
  span,
  strong {
    display: block;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }
}

.plan-summary {
  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dl {
    display: grid;
    margin: 0;
    gap: 4px;
  }

  dl div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    gap: 8px;
  }

  dt {
    color: var(--box-text-2);
    font-size: 14px;
    line-height: 20px;
  }

  dd {
    margin: 0;
    color: var(--box-text-1);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }
}
</style>
