<template>
  <section v-if="plan !== null || task !== null" class="task-panel" aria-label="资源下载任务">
    <div class="task-heading">
      <div>
        <span>资源任务</span>
        <strong v-if="task !== null && task.target === gameEnum.package.planTarget.INSTALL">
          全新安装 {{ task.targetTag }}
        </strong>
        <strong v-else-if="task !== null && task.sourceTag === task.targetTag">
          修复 {{ task.targetTag }}
        </strong>
        <strong v-else-if="task !== null"> {{ task.sourceTag }} → {{ task.targetTag }} </strong>
        <strong v-else-if="plan !== null">等待开始 {{ plan.targetTag }}</strong>
      </div>
      <v-chip v-if="task !== null" :color="stateColor" size="small" variant="tonal">
        {{ taskStateLabel }}
      </v-chip>
    </div>

    <template v-if="task !== null">
      <v-progress-linear
        :indeterminate="progressIndeterminate"
        :model-value="progressPercent"
        color="var(--tgc-od-orange)"
        height="8"
        rounded
      />
      <div class="task-facts" aria-live="polite">
        <span v-for="fact in progressFacts" :key="fact">{{ fact }}</span>
      </div>
      <p v-if="task.currentFile !== null" class="task-current">
        <span class="task-current-label">当前资源：</span>
        <span class="task-current-value" :title="task.currentFile">{{ task.currentFile }}</span>
      </p>
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
        v-else-if="
          task.state === gameEnum.package.taskState.READY_TO_APPLY &&
          task.target === gameEnum.package.planTarget.INSTALL
        "
        text="安装资源已下载，准备进入 staging、发布和最终复检。"
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
        v-if="canCancel && task !== null"
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
const taskStateLabel = computed<string>(() => {
  if (
    task?.target === gameEnum.package.planTarget.INSTALL &&
    task.state === gameEnum.package.taskState.FAILED
  ) {
    return "安装失败";
  }
  return task === null ? "" : gameEnum.package.taskStateDesc(task.state);
});
const canCancel = computed<boolean>(() => {
  if (!active.value || task === null) return false;
  return !(
    task.target === gameEnum.package.planTarget.INSTALL && gameEnum.package.taskApplying(task.state)
  );
});
const recoverable = computed<boolean>(() => {
  return (
    task !== null &&
    (gameEnum.package.taskRecoverable(task.state) ||
      (task.target === gameEnum.package.planTarget.INSTALL &&
        task.state === gameEnum.package.taskState.READY_TO_APPLY))
  );
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
  if (
    task?.target === gameEnum.package.planTarget.INSTALL &&
    task.state === gameEnum.package.taskState.RECOVERY_REQUIRED
  ) {
    return false;
  }
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
  if (task === null) return 0;
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    if (task.assemblyTotalBytes > 0) {
      return Math.min(100, (task.assemblyCompletedBytes / task.assemblyTotalBytes) * 100);
    }
    if (task.assemblyTotalCount > 0) {
      return Math.min(100, (task.assemblyCompletedCount / task.assemblyTotalCount) * 100);
    }
    return 0;
  }
  // 组装已完成的资源任务不再切回下载百分比，避免缓存命中时下载量小于总量导致回退。
  if (task.assemblyTotalBytes > 0 && task.assemblyCompletedBytes >= task.assemblyTotalBytes) {
    return 100;
  }
  if (task.totalBytes === 0) return 0;
  return Math.min(100, (task.downloadedBytes / task.totalBytes) * 100);
});
const progressIndeterminate = computed<boolean>(() => {
  if (task === null || !active.value) return false;
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    return task.assemblyTotalBytes === 0 && task.assemblyTotalCount === 0;
  }
  return task.totalBytes === 0 || gameEnum.package.taskApplying(task.state);
});
const progressFacts = computed<Array<string>>(() => {
  if (task === null) return [];
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    return [
      `组装空间 ${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`,
      `组装文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`,
    ];
  }
  const values = [
    `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`,
    `${task.completedCount} / ${task.totalCount} 个对象`,
  ];
  if (task.bytesPerSecond > 0) values.push(`${formatBytes(task.bytesPerSecond)}/s`);
  if (task.etaSeconds !== null) values.push(`预计 ${formatDuration(task.etaSeconds)}`);
  return values;
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
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 4px;
}

.task-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
  gap: 8px;

  > .v-chip {
    flex-shrink: 0;
  }

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
  margin: 0;
}

.task-current {
  display: flex;
  min-width: 0;
  gap: 4px;
}

.task-current-label {
  flex-shrink: 0;
}

.task-current-value {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-note {
  color: var(--tgc-red-2);
}

.task-panel > :deep(.v-progress-linear),
.task-panel > .task-facts,
.task-panel > .task-current,
.task-panel > .task-actions,
.task-panel > .task-note,
.task-panel > :deep(.v-alert) {
  margin-inline: 16px;
}

.task-panel > .task-actions,
.task-panel > .task-note {
  margin-bottom: 12px;
}
</style>
