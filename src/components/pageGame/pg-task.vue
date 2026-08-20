<template>
  <section v-if="plan !== null || task !== null" class="task-panel" aria-label="资源下载任务">
    <div class="task-heading">
      <div>
        <span>资源任务</span>
        <strong v-if="task !== null && task.sourceTag === task.targetTag">
          修复 {{ task.targetTag }}
        </strong>
        <strong v-else-if="task !== null"> {{ task.sourceTag }} → {{ task.targetTag }} </strong>
        <strong v-else-if="plan !== null">等待开始 {{ plan.targetTag }}</strong>
      </div>
      <v-chip v-if="task !== null" :color="stateColor" size="small" variant="tonal">
        {{ gameEnum.package.taskStateDesc(task.state) }}
      </v-chip>
    </div>

    <template v-if="task !== null">
      <v-progress-linear
        :indeterminate="task.totalBytes === 0 && active"
        :model-value="progressPercent"
        color="var(--tgc-od-orange)"
        height="8"
        rounded
      />
      <div class="task-facts" aria-live="polite">
        <span>{{ formatBytes(task.downloadedBytes) }} / {{ formatBytes(task.totalBytes) }}</span>
        <span>{{ task.completedCount }} / {{ task.totalCount }} 个对象</span>
        <span v-if="task.bytesPerSecond > 0">{{ formatBytes(task.bytesPerSecond) }}/s</span>
        <span v-if="task.etaSeconds !== null">预计 {{ formatDuration(task.etaSeconds) }}</span>
      </div>
      <p v-if="task.currentFile !== null" class="task-current">当前：{{ task.currentFile }}</p>
      <v-alert
        v-if="task.errorMessage !== null"
        :text="task.errorMessage"
        density="compact"
        type="error"
        variant="tonal"
      />
      <v-alert
        v-else-if="task.state === gameEnum.package.taskState.RECOVERY_REQUIRED"
        text="检测到上次未完成的资源任务。继续或回滚时会先调和提交日志与实际文件状态。"
        density="compact"
        type="warning"
        variant="tonal"
      />
      <v-alert
        v-else-if="task.state === gameEnum.package.taskState.REPAIR_REQUIRED && integrityRepair"
        text="仍有文件缺失或损坏。继续修复后完成；不会改写版本号。放弃任务会恢复本次替换前的文件。"
        density="compact"
        type="warning"
        variant="tonal"
      />
      <v-alert
        v-else-if="task.state === gameEnum.package.taskState.REPAIR_REQUIRED"
        text="更新文件已提交，但仍有未变化文件缺失或损坏。修复这些文件后才会写入版本号；放弃任务会回滚本次更新。"
        density="compact"
        type="warning"
        variant="tonal"
      />
      <v-alert
        v-else-if="task.state === gameEnum.package.taskState.READY_TO_APPLY && integrityRepair"
        text="全部下载对象已通过 hash 复验。应用会替换缺失或损坏的文件，完成后不会改写版本号。"
        density="compact"
        type="success"
        variant="tonal"
      />
      <v-alert
        v-else-if="task.state === gameEnum.package.taskState.READY_TO_APPLY && targetPublished"
        text="全部下载对象已通过 hash 复验。应用会执行安全暂存、可逆提交和完整目标清单验证，全部通过后才更新版本。"
        density="compact"
        type="success"
        variant="tonal"
      />
      <v-alert
        v-else-if="
          task.state === gameEnum.package.taskState.READY_TO_APPLY &&
          task.target === gameEnum.package.planTarget.PRE_DOWNLOAD
        "
        text="预下载已完成。目标版本成为正式版本后即可应用更新。"
        density="compact"
        type="info"
        variant="tonal"
      />
      <v-alert
        v-else-if="task.state === gameEnum.package.taskState.READY_TO_APPLY"
        text="下载已完成，但当前正式版本与任务目标不一致，请重新评估。"
        density="compact"
        type="warning"
        variant="tonal"
      />
    </template>

    <div class="task-actions">
      <v-btn
        v-if="canStart"
        :disabled="plan === null || !plan.hasSufficientSpace"
        :loading="actionPending"
        prepend-icon="mdi-download"
        size="small"
        variant="tonal"
        @click="emit('startRequested')"
      >
        开始下载
      </v-btn>
      <v-btn
        v-if="canApply"
        :loading="actionPending"
        :prepend-icon="
          repairRequired || integrityRepair ? 'mdi-wrench-outline' : 'mdi-check-circle-outline'
        "
        size="small"
        variant="tonal"
        @click="emit('applyRequested')"
      >
        {{ applyActionLabel }}
      </v-btn>
      <v-btn
        v-if="active && task !== null"
        :loading="actionPending"
        prepend-icon="mdi-stop-circle-outline"
        size="small"
        variant="outlined"
        @click="emit('cancelRequested')"
      >
        请求取消
      </v-btn>
      <v-btn
        v-if="recoverable && task !== null"
        :loading="actionPending"
        prepend-icon="mdi-backup-restore"
        size="small"
        variant="tonal"
        @click="emit('recoverRequested', gameEnum.package.recoveryAction.RESUME)"
      >
        安全恢复
      </v-btn>
      <v-btn
        v-if="canAbandon && task !== null"
        :loading="actionPending"
        size="small"
        variant="text"
        @click="emit('recoverRequested', gameEnum.package.recoveryAction.ROLLBACK)"
      >
        放弃任务
      </v-btn>
    </div>
    <p v-if="plan !== null && !plan.hasSufficientSpace" class="task-note">
      当前评估的磁盘空间不足，不能开始下载。
    </p>
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed } from "vue";

type Props = {
  plan: TGApp.Game.Package.PlanSummary | null;
  task: TGApp.Game.Package.TaskSummary | null;
  actionPending: boolean;
  targetPublished: boolean;
};

const { plan, task, actionPending, targetPublished } = defineProps<Props>();
const emit = defineEmits<{
  startRequested: [];
  applyRequested: [];
  cancelRequested: [];
  recoverRequested: [action: TGApp.Game.Package.RecoveryActionEnum];
}>();

const active = computed<boolean>(() => {
  return task !== null && gameEnum.package.taskActive(task.state);
});
const recoverable = computed<boolean>(() => {
  return task !== null && gameEnum.package.taskRecoverable(task.state);
});
const readyToApply = computed<boolean>(() => {
  return task?.state === gameEnum.package.taskState.READY_TO_APPLY;
});
const repairRequired = computed<boolean>(() => {
  return task?.state === gameEnum.package.taskState.REPAIR_REQUIRED;
});
const integrityRepair = computed<boolean>(() => {
  return task !== null && task.sourceTag === task.targetTag;
});
const canApply = computed<boolean>(() => {
  return (readyToApply.value && targetPublished) || repairRequired.value;
});
const applyActionLabel = computed<string>(() => {
  if (repairRequired.value) return "修复并完成";
  if (integrityRepair.value) return "应用修复";
  return "应用更新";
});
const canAbandon = computed<boolean>(() => {
  return recoverable.value || readyToApply.value || repairRequired.value;
});
const canStart = computed<boolean>(() => {
  if (
    plan === null ||
    (plan.strategy !== gameEnum.package.planStrategy.MANIFEST_DIFF &&
      plan.strategy !== gameEnum.package.planStrategy.PATCH) ||
    active.value
  ) {
    return false;
  }
  if (task === null || task.planId !== plan.planId) return true;
  return (
    task.state === gameEnum.package.taskState.CANCELED ||
    task.state === gameEnum.package.taskState.FAILED
  );
});
const progressPercent = computed<number>(() => {
  if (task === null || task.totalBytes === 0) return 0;
  return Math.min(100, (task.downloadedBytes / task.totalBytes) * 100);
});
const stateColor = computed<string>(() => {
  switch (task?.state) {
    case gameEnum.package.taskState.READY_TO_APPLY:
    case gameEnum.package.taskState.COMPLETED:
      return "success";
    case gameEnum.package.taskState.FAILED:
      return "error";
    case gameEnum.package.taskState.RECOVERY_REQUIRED:
    case gameEnum.package.taskState.REPAIR_REQUIRED:
    case gameEnum.package.taskState.ROLLING_BACK:
    case gameEnum.package.taskState.CANCELED:
      return "warning";
    default:
      return "var(--tgc-od-orange)";
  }
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
</script>

<style lang="scss" scoped>
.task-panel {
  display: grid;
  padding: 12px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 12px;
}

.task-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

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

.task-facts,
.task-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.task-facts,
.task-current,
.task-note {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.task-current,
.task-note {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-note {
  color: var(--tgc-red-2);
}
</style>
