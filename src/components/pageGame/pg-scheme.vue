<template>
  <div class="scheme-body">
    <slot
      :blockingTask
      :canAbandon
      :canConvert
      :canRecover
      :cancelSwitch
      :convertLabel
      :convertScheme
      :converting
      :recoverSwitch
      :targetScheme
      :taskActive
      name="channel"
    />

    <PgProgress
      v-if="switchPanelVisible"
      :caption="schemeCaption"
      :currentFile="schemeCurrentFile"
      :errorMessage="visibleTask?.errorMessage ?? null"
      :facts="schemeFacts"
      :indeterminate="switchBarIndeterminate"
      :percent="progressPercent"
      :showBar="converting || visibleTask !== null"
      :tone="schemeTone"
      ariaLabel="换服进度"
    >
      <template #actions>
        <v-btn
          v-if="canRecover"
          :loading="converting"
          aria-label="继续换服"
          icon="mdi-backup-restore"
          size="small"
          title="继续"
          variant="text"
          @click="recoverSwitch(gameEnum.package.recoveryAction.RESUME)"
        />
        <v-btn
          v-if="canAbandon"
          :loading="converting"
          aria-label="放弃换服"
          icon="mdi-close"
          size="small"
          title="放弃"
          variant="text"
          @click="recoverSwitch(gameEnum.package.recoveryAction.ROLLBACK)"
        />
      </template>
    </PgProgress>
  </div>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { confirmStopRunningGame } from "@utils/TGGame.js";
import { createGamePackageSwitchPlan } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, onWatcherCleanup, ref, watch } from "vue";

import PgProgress from "./pg-progress.vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

const { installation } = defineProps<Props>();
const emit = defineEmits<{ switched: [] }>();
defineSlots<{
  channel(props: {
    blockingTask: boolean;
    canAbandon: boolean;
    canConvert: boolean;
    canRecover: boolean;
    cancelSwitch: () => Promise<void>;
    convertLabel: string;
    convertScheme: () => Promise<void>;
    converting: boolean;
    recoverSwitch: (action: TGApp.Game.Package.RecoveryActionEnum) => Promise<void>;
    targetScheme: TGApp.Game.Installation.SchemeEnum;
    taskActive: boolean;
  }): unknown;
}>();
const taskStore = useGameLauncherStore();
const { pendingActions, tasksByInstallation, verifyByInstallation } = storeToRefs(taskStore);
const planning = ref<boolean>(false);
const plan = ref<TGApp.Game.Package.SwitchSummary | null>(null);
const errorMessage = ref<string | null>(null);

const targetScheme = computed<TGApp.Game.Installation.SchemeEnum>(() => {
  return installation.schemeId === gameEnum.installation.scheme.CN_OFFICIAL
    ? gameEnum.installation.scheme.CN_BILIBILI
    : gameEnum.installation.scheme.CN_OFFICIAL;
});
const convertLabel = computed<string>(() => {
  return `转换为${gameEnum.installation.schemeDesc(targetScheme.value)}`;
});
const switchConfirmText = computed<string>(() => {
  const from =
    installation.schemeId === gameEnum.installation.scheme.CN_BILIBILI ? "渠道服（B服）" : "国服";
  const to =
    targetScheme.value === gameEnum.installation.scheme.CN_BILIBILI ? "渠道服（B服）" : "国服";
  return `${from}→${to}`;
});
const switchTask = computed<TGApp.Game.Package.TaskSummary | null>(() => {
  const task = tasksByInstallation.value[installation.id];
  if (task === undefined || task.target !== gameEnum.package.planTarget.SWITCH) return null;
  return task;
});
const visibleTask = computed<TGApp.Game.Package.TaskSummary | null>(() => {
  if (switchTask.value === null) return null;
  if (switchTask.value.state === gameEnum.package.taskState.COMPLETED) return null;
  return switchTask.value;
});
const taskActive = computed<boolean>(() => {
  return switchTask.value !== null && gameEnum.package.taskActive(switchTask.value.state);
});
const converting = computed<boolean>(() => {
  const taskId = switchTask.value?.taskId ?? plan.value?.planId;
  return (
    planning.value ||
    pendingActions.value[installation.id] === true ||
    (taskId !== undefined && pendingActions.value[taskId] === true)
  );
});
const verifyBusy = computed<boolean>(() => {
  const summary = verifyByInstallation.value[installation.id];
  return (
    (summary !== undefined && gameEnum.package.verifyActive(summary.state)) ||
    pendingActions.value[`verify:${installation.id}`] === true ||
    pendingActions.value[`verify-clear:${installation.id}`] === true
  );
});
const blockingTask = computed<boolean>(() => {
  const task = tasksByInstallation.value[installation.id];
  if (task === undefined) return false;
  if (task.target === gameEnum.package.planTarget.SWITCH) return false;
  return (
    task.state !== gameEnum.package.taskState.COMPLETED &&
    task.state !== gameEnum.package.taskState.FAILED &&
    task.state !== gameEnum.package.taskState.CANCELED
  );
});
const canConvert = computed<boolean>(() => {
  if (blockingTask.value || taskActive.value) return false;
  const task = switchTask.value;
  if (task === null) return true;
  return (
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.CANCELED ||
    task.state === gameEnum.package.taskState.COMPLETED
  );
});
const canRecover = computed<boolean>(() => {
  return (
    switchTask.value !== null &&
    !taskActive.value &&
    gameEnum.package.taskRecoverable(switchTask.value.state)
  );
});
const canAbandon = computed<boolean>(() => {
  return canRecover.value || switchTask.value?.state === gameEnum.package.taskState.READY_TO_APPLY;
});
const progressPercent = computed<number>(() => {
  const task = visibleTask.value;
  if (task === null) return 0;
  switch (task.state) {
    case gameEnum.package.taskState.QUEUED:
      return 2;
    case gameEnum.package.taskState.DOWNLOADING:
      return task.totalBytes === 0
        ? 8
        : 5 + Math.min(1, task.downloadedBytes / task.totalBytes) * 65;
    case gameEnum.package.taskState.READY_TO_APPLY:
      return 74;
    case gameEnum.package.taskState.ASSEMBLING:
      return 82;
    case gameEnum.package.taskState.COMMIT_PREPARED:
      return 87;
    case gameEnum.package.taskState.COMMITTING:
      return 93;
    case gameEnum.package.taskState.VERIFYING:
      return 98;
    case gameEnum.package.taskState.PUBLISH_PENDING:
    case gameEnum.package.taskState.PUBLISHED:
    case gameEnum.package.taskState.VERIFIED:
    case gameEnum.package.taskState.REGISTRATION_PENDING:
      return 99;
    case gameEnum.package.taskState.ROLLING_BACK:
    case gameEnum.package.taskState.RECOVERY_REQUIRED:
      return 85;
    case gameEnum.package.taskState.COMPLETED:
      return 100;
    case gameEnum.package.taskState.PAUSED:
    case gameEnum.package.taskState.REPAIR_REQUIRED:
    case gameEnum.package.taskState.FAILED:
    case gameEnum.package.taskState.CANCELED:
      return task.totalBytes === 0
        ? 0
        : Math.min(70, 5 + (task.downloadedBytes / task.totalBytes) * 65);
  }
  return 0;
});
const switchPanelVisible = computed<boolean>(() => {
  return converting.value || errorMessage.value !== null || visibleTask.value !== null;
});
const switchBarIndeterminate = computed<boolean>(() => {
  if (visibleTask.value === null) return converting.value;
  return (
    visibleTask.value.state === gameEnum.package.taskState.DOWNLOADING &&
    visibleTask.value.totalBytes === 0 &&
    (taskActive.value || converting.value)
  );
});
const schemeStage = computed<string>(() => {
  const task = visibleTask.value;
  if (task === null) return converting.value ? "正在生成换服计划" : "";
  switch (task.state) {
    case gameEnum.package.taskState.QUEUED:
      return "等待开始换服";
    case gameEnum.package.taskState.DOWNLOADING:
      return "下载渠道 SDK";
    case gameEnum.package.taskState.READY_TO_APPLY:
      return "渠道资源准备完成";
    case gameEnum.package.taskState.ASSEMBLING:
      return "准备渠道文件";
    case gameEnum.package.taskState.COMMIT_PREPARED:
      return "准备提交换服事务";
    case gameEnum.package.taskState.COMMITTING:
      return "写入渠道文件";
    case gameEnum.package.taskState.VERIFYING:
      return "校验渠道文件";
    case gameEnum.package.taskState.ROLLING_BACK:
      return "恢复原渠道文件";
    default:
      return gameEnum.package.taskStateDesc(task.state);
  }
});
const schemeCurrentFile = computed<string | null>(() => {
  const task = visibleTask.value;
  if (task === null) return null;
  return task.downloadCurrentFile ?? task.currentFile ?? task.assemblyCurrentFile;
});
const schemeCaption = computed<string>(() => {
  if (errorMessage.value !== null) return errorMessage.value;
  if (visibleTask.value?.state === gameEnum.package.taskState.RECOVERY_REQUIRED) {
    return "上次换服中断了，继续会先恢复到转换前";
  }
  if (visibleTask.value !== null) {
    return `转换为${gameEnum.installation.schemeDesc(targetScheme.value)} · ${schemeStage.value}`;
  }
  if (converting.value) return "正在准备换服…";
  return "";
});
const schemeTone = computed<"" | "err" | "warn">(() => {
  if (errorMessage.value !== null || visibleTask.value?.errorMessage !== null) return "err";
  if (visibleTask.value?.state === gameEnum.package.taskState.RECOVERY_REQUIRED) return "warn";
  return "";
});
const schemeFacts = computed<Array<string>>(() => {
  const task = visibleTask.value;
  if (task === null) return [];
  const facts = [`阶段：${schemeStage.value}`, `整体 ${progressPercent.value.toFixed(0)}%`];
  if (task.totalBytes > 0) {
    facts.push(`${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`);
  }
  if (task.state === gameEnum.package.taskState.DOWNLOADING && task.bytesPerSecond > 0) {
    facts.push(`${formatBytes(task.bytesPerSecond)}/s`);
    if (task.etaSeconds !== null) facts.push(`预计剩余 ${formatDuration(task.etaSeconds)}`);
  }
  return facts;
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

async function convertScheme(): Promise<void> {
  if (converting.value || !canConvert.value || verifyBusy.value) return;
  const confirmed = await showDialog.checkF({
    title: "确认转换服务器?",
    text: switchConfirmText.value,
    confirmLabel: "开始换服",
  });
  if (confirmed !== true) return;
  planning.value = true;
  errorMessage.value = null;
  try {
    const nextPlan = await createGamePackageSwitchPlan(installation.id);
    plan.value = nextPlan;
    if (!nextPlan.hasSufficientSpace) {
      errorMessage.value = "磁盘空间不足，暂时不能换服。";
      showSnackbar.warn("磁盘空间不足，暂时不能换服");
      return;
    }
    if (!(await confirmStopRunningGame("换服"))) return;
    const task = await taskStore.applySwitch(nextPlan.planId);
    showSnackbar.success(`已开始转换为${gameEnum.installation.schemeDesc(nextPlan.targetScheme)}`);
    if (task.state === gameEnum.package.taskState.COMPLETED) emit("switched");
  } catch (error) {
    errorMessage.value = `换服失败：${error}`;
    showSnackbar.error(`换服失败：${error}`);
  } finally {
    planning.value = false;
  }
}

async function cancelSwitch(): Promise<void> {
  const task = switchTask.value;
  if (task === null || !taskActive.value) return;
  try {
    await taskStore.cancelTask(task.taskId);
    showSnackbar.info("已请求取消换服");
  } catch (error) {
    showSnackbar.error(`取消换服失败：${error}`);
  }
}

async function recoverSwitch(action: TGApp.Game.Package.RecoveryActionEnum): Promise<void> {
  const task = switchTask.value;
  if (task === null || taskActive.value) return;
  const rollback = action === gameEnum.package.recoveryAction.ROLLBACK;
  const needsGameStopped =
    !rollback ||
    gameEnum.package.taskApplying(task.state) ||
    task.state === gameEnum.package.taskState.RECOVERY_REQUIRED;
  try {
    if (needsGameStopped && !(await confirmStopRunningGame("换服"))) return;
    const updated = await taskStore.recoverTask(task.taskId, action);
    showSnackbar.success(rollback ? "已放弃换服" : "已继续换服");
    if (updated.state === gameEnum.package.taskState.COMPLETED) emit("switched");
  } catch (error) {
    showSnackbar.error(`${rollback ? "放弃" : "继续"}换服失败：${error}`);
  }
}

watch(
  () => [installation.id, installation.schemeId],
  () => {
    plan.value = null;
    errorMessage.value = null;
  },
);

watch(errorMessage, (message) => {
  if (message === null) return;
  const timer = window.setTimeout(() => {
    if (errorMessage.value === message) errorMessage.value = null;
  }, 5000);
  onWatcherCleanup(() => {
    window.clearTimeout(timer);
  });
});

watch(
  () => switchTask.value?.state,
  (state, previous) => {
    if (
      state === gameEnum.package.taskState.COMPLETED &&
      previous !== gameEnum.package.taskState.COMPLETED
    ) {
      emit("switched");
    }
  },
);
</script>

<style lang="scss" scoped>
.scheme-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
