<template>
  <section class="scheme-panel" aria-label="游戏渠道转换">
    <div class="scheme-heading">
      <div>
        <span>渠道转换</span>
        <p>仅在国服官服与国服 B 服之间转换 SDK 与渠道配置；提交前不会改游戏目录。</p>
      </div>
    </div>

    <div class="scheme-route">
      <div class="scheme-node current">
        <span>当前</span>
        <strong>{{ gameEnum.installation.schemeDesc(installation.schemeId) }}</strong>
      </div>
      <v-icon aria-hidden="true" size="18">mdi-chevron-right</v-icon>
      <div class="scheme-node">
        <span>目标</span>
        <strong>{{ gameEnum.installation.schemeDesc(targetScheme) }}</strong>
      </div>
    </div>

    <div class="scheme-actions">
      <v-btn
        :disabled="planning"
        :loading="planning"
        prepend-icon="mdi-swap-horizontal"
        size="small"
        variant="outlined"
        @click="createPlan"
      >
        评估换服
      </v-btn>
      <v-btn
        v-if="canApply"
        :disabled="applying || plan === null || !plan.hasSufficientSpace"
        :loading="applying"
        prepend-icon="mdi-swap-horizontal-bold"
        size="small"
        variant="tonal"
        @click="applySwitch"
      >
        应用换服
      </v-btn>
      <v-btn
        v-if="taskActive"
        :loading="applying"
        prepend-icon="mdi-stop-circle-outline"
        size="small"
        variant="outlined"
        @click="cancelSwitch"
      >
        请求取消
      </v-btn>
      <v-btn
        v-if="canRecover"
        :loading="applying"
        prepend-icon="mdi-backup-restore"
        size="small"
        variant="tonal"
        @click="recoverSwitch(gameEnum.package.recoveryAction.RESUME)"
      >
        安全恢复
      </v-btn>
      <v-btn
        v-if="canAbandon"
        :loading="applying"
        size="small"
        variant="text"
        @click="recoverSwitch(gameEnum.package.recoveryAction.ROLLBACK)"
      >
        放弃换服
      </v-btn>
    </div>

    <v-alert
      v-if="errorMessage !== null"
      :text="errorMessage"
      density="compact"
      type="warning"
      variant="tonal"
    />

    <div v-if="plan !== null" class="plan-summary" aria-live="polite">
      <div class="plan-title">
        <div>
          <span>换服计划已固化</span>
          <strong>
            {{ gameEnum.installation.schemeDesc(plan.sourceScheme) }} →
            {{ gameEnum.installation.schemeDesc(plan.targetScheme) }}
          </strong>
        </div>
        <v-chip
          :color="plan.hasSufficientSpace ? 'var(--tgc-od-green)' : 'var(--tgc-od-orange)'"
          size="small"
          variant="tonal"
        >
          {{ plan.hasSufficientSpace ? "空间充足" : "空间不足" }}
        </v-chip>
      </div>
      <dl>
        <div>
          <dt>目标渠道</dt>
          <dd>{{ plan.targetChannel }} / {{ plan.targetSubChannel }}</dd>
        </div>
        <div>
          <dt>渠道 SDK</dt>
          <dd>{{ sdkActionLabel }}</dd>
        </div>
        <div>
          <dt>预计下载</dt>
          <dd>{{ formatBytes(plan.downloadBytes) }}</dd>
        </div>
        <div>
          <dt>缓存可复用</dt>
          <dd>{{ formatBytes(plan.cacheHitBytes) }}</dd>
        </div>
        <div>
          <dt>备份移出</dt>
          <dd>{{ plan.deleteCount }} 个</dd>
        </div>
      </dl>
      <p v-if="plan.deleteFiles.length > 0">仅移出当前清单之外的渠道文件：{{ previewDeletes }}</p>
      <p>{{ sdkRetainHint }}</p>
      <p v-if="!canApply && switchTask === null">
        评估完成后，确认已退出游戏即可应用换服；SDK 会先写入应用缓存。
      </p>
    </div>

    <template v-if="switchTask !== null">
      <v-progress-linear
        :indeterminate="switchTask.totalBytes === 0 && taskActive"
        :model-value="progressPercent"
        color="var(--tgc-od-orange)"
        height="8"
        rounded
      />
      <p v-if="switchTask.currentFile !== null">当前：{{ switchTask.currentFile }}</p>
      <v-alert
        v-if="switchTask.errorMessage !== null"
        :text="switchTask.errorMessage"
        density="compact"
        type="error"
        variant="tonal"
      />
      <v-alert
        v-else-if="switchTask.state === gameEnum.package.taskState.RECOVERY_REQUIRED"
        text="换服提交中断。继续或放弃时会先按写前日志回滚，避免留下目标渠道配置加源 SDK。"
        density="compact"
        type="warning"
        variant="tonal"
      />
      <v-alert
        v-else-if="switchTask.state === gameEnum.package.taskState.COMPLETED"
        text="换服已完成。请重新检测安装，确认渠道、校验和启动判断一致。"
        density="compact"
        type="success"
        variant="tonal"
      />
    </template>
  </section>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { createGamePackageSwitchPlan, isGameRunning, stopGame } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

const { installation } = defineProps<Props>();
const emit = defineEmits<{ switched: [] }>();
const taskStore = useGameLauncherStore();
const { pendingActions, tasksByInstallation } = storeToRefs(taskStore);
const planning = ref<boolean>(false);
const exitingGame = ref<boolean>(false);
const plan = ref<TGApp.Game.Package.SwitchSummary | null>(null);
const errorMessage = ref<string | null>(null);

const targetScheme = computed<TGApp.Game.Installation.SchemeEnum>(() => {
  return installation.schemeId === gameEnum.installation.scheme.CN_OFFICIAL
    ? gameEnum.installation.scheme.CN_BILIBILI
    : gameEnum.installation.scheme.CN_OFFICIAL;
});
const switchTask = computed<TGApp.Game.Package.TaskSummary | null>(() => {
  const task = tasksByInstallation.value[installation.id];
  if (task === undefined || task.target !== gameEnum.package.planTarget.SWITCH) return null;
  return task;
});
const taskActive = computed<boolean>(() => {
  return switchTask.value !== null && gameEnum.package.taskActive(switchTask.value.state);
});
const applying = computed<boolean>(() => {
  const taskId = switchTask.value?.taskId ?? plan.value?.planId;
  return (
    planning.value ||
    exitingGame.value ||
    pendingActions.value[installation.id] === true ||
    (taskId !== undefined && pendingActions.value[taskId] === true)
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
const canApply = computed<boolean>(() => {
  if (plan.value === null || blockingTask.value || taskActive.value) return false;
  const task = switchTask.value;
  if (task === null) return true;
  return (
    task.planId !== plan.value.planId ||
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.CANCELED
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
  if (switchTask.value === null || switchTask.value.totalBytes === 0) return 0;
  return Math.min(100, (switchTask.value.downloadedBytes / switchTask.value.totalBytes) * 100);
});
const previewDeletes = computed<string>(() => {
  if (plan.value === null) return "";
  const names = plan.value.deleteFiles.slice(0, 3);
  const extra = plan.value.deleteFiles.length - names.length;
  const listed = names.join("、");
  if (extra > 0) return `${listed} 等 ${plan.value.deleteFiles.length} 个`;
  return listed;
});
const sdkActionLabel = computed<string>(() => {
  if (plan.value === null) return "";
  if (plan.value.sdkRequired) {
    if (plan.value.cacheHitBytes > 0) {
      return `缓存已有 ${plan.value.sdkVersion ?? "渠道 SDK"}`;
    }
    return `需要下载 ${plan.value.sdkVersion ?? "渠道 SDK"}`;
  }
  return "备份并移出渠道 SDK";
});
const sdkRetainHint = computed<string>(() => {
  if (plan.value === null) return "";
  if (plan.value.sdkRequired) {
    return plan.value.cacheHitBytes > 0
      ? "将从应用缓存安装渠道 SDK，不必重新下载。"
      : "SDK 会先写入应用缓存再安装；之后转回可复用。";
  }
  return plan.value.cacheHitBytes > 0
    ? "游戏目录中的渠道 SDK 会备份移出；转回时优先使用已缓存的安装包。"
    : "游戏目录中的渠道 SDK 会备份到应用缓存，不会直接丢掉；转回时不必重新下载。";
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

async function confirmLeaveGame(): Promise<boolean> {
  if (!(await isGameRunning())) return true;
  const confirmed = await showDialog.checkF({
    title: "退出游戏？",
    text: "检测到游戏正在运行。确认后会先退出游戏，再继续换服；取消则不换服。",
    confirmLabel: "退出并继续",
  });
  if (confirmed !== true) return false;
  exitingGame.value = true;
  try {
    await stopGame();
  } finally {
    exitingGame.value = false;
  }
  return true;
}

async function createPlan(): Promise<void> {
  if (planning.value) return;
  planning.value = true;
  errorMessage.value = null;
  try {
    plan.value = await createGamePackageSwitchPlan(installation.id);
  } catch (error) {
    errorMessage.value = `评估换服失败：${error}`;
  } finally {
    planning.value = false;
  }
}

async function applySwitch(): Promise<void> {
  if (plan.value === null || applying.value || !canApply.value) return;
  if (!plan.value.hasSufficientSpace) {
    showSnackbar.warn("当前评估的磁盘空间不足，不能应用换服");
    return;
  }
  try {
    if (await isGameRunning()) {
      if (!(await confirmLeaveGame())) return;
    } else {
      const confirmed = await showDialog.checkF({
        title: "应用渠道转换？",
        text: "会先把渠道 SDK 写入应用缓存并校验，再按写前日志改游戏目录，最后才更新 channel/sub_channel。",
        confirmLabel: "应用换服",
      });
      if (confirmed !== true) return;
    }
    const task = await taskStore.applySwitch(plan.value.planId);
    showSnackbar.success("已开始渠道转换");
    if (task.state === gameEnum.package.taskState.COMPLETED) emit("switched");
  } catch (error) {
    showSnackbar.error(`应用换服失败：${error}`);
  }
}

async function cancelSwitch(): Promise<void> {
  const task = switchTask.value;
  if (task === null || !taskActive.value) return;
  const applyingCommit = gameEnum.package.taskApplying(task.state);
  const confirmed = await showDialog.checkF({
    title: applyingCommit ? "取消换服提交？" : "取消换服下载？",
    text: applyingCommit
      ? "会在当前安全检查点停止，并尝试把渠道文件回滚到转换前的状态。"
      : "已缓存的渠道 SDK 会保留，当前下载会在安全边界停止。",
    confirmLabel: "请求取消",
  });
  if (confirmed !== true) return;
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
    if (needsGameStopped && (await isGameRunning())) {
      if (!(await confirmLeaveGame())) return;
    } else {
      const confirmed = await showDialog.checkF({
        title: rollback ? "放弃换服？" : "安全恢复换服？",
        text: rollback
          ? "若提交曾中断，会先按写前日志回滚。已缓存的渠道 SDK 不会删除。"
          : "恢复会先回滚未完成提交，再重新下载缺失的渠道 SDK 并提交。",
        confirmLabel: rollback ? "放弃换服" : "开始恢复",
      });
      if (confirmed !== true) return;
    }
    const updated = await taskStore.recoverTask(task.taskId, action);
    showSnackbar.success(rollback ? "已放弃换服任务" : "已开始恢复换服");
    if (updated.state === gameEnum.package.taskState.COMPLETED) emit("switched");
  } catch (error) {
    showSnackbar.error(`${rollback ? "放弃" : "恢复"}换服失败：${error}`);
  }
}

watch(
  () => installation.id,
  () => {
    plan.value = null;
    errorMessage.value = null;
  },
);

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
.scheme-panel {
  display: grid;
  padding-top: 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 16px;

  > p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.scheme-heading {
  span {
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  p {
    margin: 2px 0 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.scheme-route {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);

  > .v-icon {
    color: var(--box-text-2);
  }
}

.scheme-node {
  display: grid;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--box-text-1);
    font-size: 14px;
    line-height: 20px;
  }

  &.current {
    border-color: var(--tgc-yellow-3);
  }
}

.scheme-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plan-summary {
  display: grid;
  padding: 16px;
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 12px;

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dl {
    display: grid;
    margin: 0;
    gap: 8px 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  dl div {
    display: grid;
    gap: 2px;
  }

  dt {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dd {
    margin: 0;
    color: var(--box-text-1);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }
}

.plan-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  > div {
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
      font-size: 16px;
      line-height: 22px;
    }
  }

  :deep(.v-chip) {
    flex-shrink: 0;
    align-self: center;
  }

  :deep(.v-chip__content) {
    display: flex;
    align-items: center;
    line-height: 16px;
  }
}

@media (width <= 720px) {
  .scheme-route {
    grid-template-columns: 1fr;

    > .v-icon {
      justify-self: center;
      transform: rotate(90deg);
    }
  }

  .plan-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>
