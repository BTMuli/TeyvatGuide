<!-- 资源下载任务面板：开始、暂停、取消、恢复与进度展示 -->
<template>
  <section v-if="plan !== null || task !== null" class="task-panel" aria-label="资源下载任务">
    <div class="task-heading">
      <div class="task-heading-copy">
        <span>资源任务</span>
        <strong v-if="task !== null && task.target === gameEnum.package.planTarget.INSTALL">
          全新安装 {{ task.targetTag }}
        </strong>
        <strong
          class="task-audio-title"
          v-else-if="task !== null && task.target === gameEnum.package.planTarget.AUDIO"
        >
          <span class="task-audio-title-label">配音包</span>
          <span class="task-audio-tags">
            <PgAudioLangTags
              :sourceLanguages="task.sourceAudioLanguages"
              :targetLanguages="task.targetAudioLanguages"
            />
          </span>
        </strong>
        <strong v-else-if="task !== null && task.sourceTag === task.targetTag">
          修复 {{ task.targetTag }}
        </strong>
        <strong v-else-if="task !== null"> {{ task.sourceTag }} → {{ task.targetTag }} </strong>
        <strong v-else-if="plan !== null">等待开始 {{ plan.targetTag }}</strong>
      </div>
      <div class="task-heading-actions">
        <template v-if="isAudio">
          <v-btn
            v-if="canPause"
            :disabled="actionPending"
            :loading="actionPending"
            class="task-heading-pause"
            prepend-icon="mdi-pause-circle-outline"
            size="small"
            variant="tonal"
            @click="emit('pauseRequested')"
          >
            暂停
          </v-btn>
          <v-btn
            v-if="canCancel"
            :disabled="actionPending"
            :loading="actionPending"
            class="task-heading-stop"
            prepend-icon="mdi-stop-circle-outline"
            size="small"
            variant="tonal"
            @click="emit('cancelRequested')"
          >
            取消
          </v-btn>
          <v-btn
            v-if="recoverable && task !== null"
            :disabled="actionPending"
            :loading="actionPending"
            class="task-heading-recover"
            prepend-icon="mdi-backup-restore"
            size="small"
            variant="tonal"
            @click="emit('recoverRequested', gameEnum.package.recoveryAction.RESUME)"
          >
            安全恢复
          </v-btn>
          <v-btn
            v-if="canAbandon && task !== null"
            :disabled="actionPending"
            :loading="actionPending"
            class="task-heading-abandon"
            prepend-icon="mdi-delete-outline"
            size="small"
            variant="tonal"
            @click="emit('recoverRequested', gameEnum.package.recoveryAction.ROLLBACK)"
          >
            放弃任务
          </v-btn>
        </template>
        <v-chip v-if="task !== null" :color="stateColor" size="small" variant="tonal">
          {{ taskStateLabel }}
        </v-chip>
      </div>
    </div>

    <template v-if="task !== null">
      <PgAudioProgress
        v-if="task.target === gameEnum.package.planTarget.AUDIO && recoveryProgress === null"
        embedded
        :task
      />
      <template v-else>
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
        <p v-if="currentResource !== null" class="task-current">
          <span class="task-current-label">{{ currentResourceLabel }}：</span>
          <span class="task-current-value" :title="currentResource">{{ currentResource }}</span>
        </p>
      </template>
      <template v-if="recoveryProgress === null">
        <PgNotice v-if="task.errorMessage !== null" :text="task.errorMessage" tone="error" />
        <PgNotice
          v-else-if="
            task.state === gameEnum.package.taskState.REGISTRATION_PENDING &&
            task.target === gameEnum.package.planTarget.AUDIO
          "
          text="配音文件已经提交并校验，正在同步本地安装记录。若同步失败，可使用安全恢复重试。"
          tone="warning"
        />
        <PgNotice
          v-else-if="task.state === gameEnum.package.taskState.RECOVERY_REQUIRED"
          text="检测到上次未完成的资源任务。继续或回滚时会先调和提交日志与实际文件状态。"
          tone="warning"
        />
        <PgNotice
          v-else-if="task.state === gameEnum.package.taskState.REPAIR_REQUIRED && integrityRepair"
          text="仍有文件缺失或损坏。继续修复后完成；不会改写版本号。放弃任务会恢复本次替换前的文件。"
          tone="warning"
        />
        <PgNotice
          v-else-if="task.state === gameEnum.package.taskState.REPAIR_REQUIRED"
          text="更新文件已提交，但仍有未变化文件缺失或损坏。修复这些文件后才会写入版本号；放弃任务会回滚本次更新。"
          tone="warning"
        />
        <PgNotice
          v-else-if="task.state === gameEnum.package.taskState.READY_TO_APPLY && integrityRepair"
          text="全部下载对象已通过 hash 复验。应用会替换缺失或损坏的文件，完成后不会改写版本号。"
          tone="success"
        />
        <PgNotice
          v-else-if="
            task.state === gameEnum.package.taskState.READY_TO_APPLY &&
            task.target === gameEnum.package.planTarget.INSTALL
          "
          text="安装资源已下载，准备进入 staging、发布和最终复检。"
          tone="success"
        />
        <PgNotice
          v-else-if="task.state === gameEnum.package.taskState.READY_TO_APPLY && targetPublished"
          text="全部下载对象已通过 hash 复验。应用会执行安全暂存、可逆提交和完整目标清单验证，全部通过后才更新版本。"
          tone="success"
        />
        <PgNotice
          v-else-if="
            task.state === gameEnum.package.taskState.READY_TO_APPLY &&
            task.target === gameEnum.package.planTarget.PRE_DOWNLOAD
          "
          text="预下载已完成。目标版本成为正式版本后即可应用更新。"
          tone="info"
        />
        <PgNotice
          v-else-if="task.state === gameEnum.package.taskState.READY_TO_APPLY"
          text="下载已完成，但当前正式版本与任务目标不一致，请重新评估。"
          tone="warning"
        />
      </template>
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
        v-if="canCancel && task !== null && !isAudio"
        :loading="actionPending"
        prepend-icon="mdi-stop-circle-outline"
        size="small"
        variant="outlined"
        @click="emit('cancelRequested')"
      >
        请求取消
      </v-btn>
      <v-btn
        v-if="recoverable && task !== null && !isAudio"
        :loading="actionPending"
        prepend-icon="mdi-backup-restore"
        size="small"
        variant="tonal"
        @click="emit('recoverRequested', gameEnum.package.recoveryAction.RESUME)"
      >
        安全恢复
      </v-btn>
      <v-btn
        v-if="canAbandon && task !== null && !isAudio"
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

import PgAudioLangTags from "./pg-audio-lang-tags.vue";
import PgAudioProgress from "./pg-audio-progress.vue";
import PgNotice from "./pg-notice.vue";

type Props = {
  plan: TGApp.Game.Package.PlanSummary | null;
  task: TGApp.Game.Package.TaskSummary | null;
  actionPending: boolean;
  recoveryProgress: TGApp.Game.Package.RecoveryProgress | null;
  targetPublished: boolean;
};

const { plan, task, actionPending, recoveryProgress, targetPublished } = defineProps<Props>();
const emit = defineEmits<{
  startRequested: [];
  applyRequested: [];
  cancelRequested: [];
  pauseRequested: [];
  recoverRequested: [action: TGApp.Game.Package.RecoveryActionEnum];
}>();

const isAudio = computed<boolean>(() => task?.target === gameEnum.package.planTarget.AUDIO);
const audioApplyPreparing = computed<boolean>(() => {
  return (
    task?.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.READY_TO_APPLY &&
    task.currentFile !== null
  );
});
const active = computed<boolean>(() => {
  return task !== null && (gameEnum.package.taskActive(task.state) || audioApplyPreparing.value);
});
const taskStateLabel = computed<string>(() => {
  if (recoveryProgress !== null) return "正在恢复";
  if (
    task?.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.READY_TO_APPLY &&
    task.currentFile !== null
  ) {
    return "准备提交";
  }
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
  if (task.state === gameEnum.package.taskState.REGISTRATION_PENDING) return false;
  return !(
    task.target === gameEnum.package.planTarget.INSTALL && gameEnum.package.taskApplying(task.state)
  );
});
const canPause = computed<boolean>(() => {
  if (!isAudio.value || task === null) return false;
  return (
    task.state === gameEnum.package.taskState.QUEUED ||
    task.state === gameEnum.package.taskState.DOWNLOADING ||
    task.state === gameEnum.package.taskState.ASSEMBLING
  );
});
const recoverable = computed<boolean>(() => {
  return (
    task !== null &&
    (gameEnum.package.taskRecoverable(task.state) ||
      (task.target === gameEnum.package.planTarget.AUDIO &&
        (task.state === gameEnum.package.taskState.REGISTRATION_PENDING ||
          (task.state === gameEnum.package.taskState.READY_TO_APPLY &&
            task.errorMessage !== null))) ||
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
  return (
    task !== null &&
    task.target !== gameEnum.package.planTarget.AUDIO &&
    task.sourceTag === task.targetTag
  );
});
const currentResource = computed<string | null>(() => {
  if (recoveryProgress !== null) return recoveryProgress.message;
  if (task === null) return null;
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    return task.assemblyCurrentFile ?? task.currentFile;
  }
  if (task.state === gameEnum.package.taskState.DOWNLOADING) {
    return task.downloadCurrentFile;
  }
  return task.currentFile;
});
const currentResourceLabel = computed<string>(() => {
  if (recoveryProgress !== null) return "恢复阶段";
  if (
    task?.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.READY_TO_APPLY &&
    task.currentFile !== null
  ) {
    return "提交阶段";
  }
  return "当前资源";
});
const canApply = computed<boolean>(() => {
  if (task?.target === gameEnum.package.planTarget.AUDIO) return false;
  return (readyToApply.value && targetPublished) || repairRequired.value;
});
const applyActionLabel = computed<string>(() => {
  if (repairRequired.value) return "修复并完成";
  if (integrityRepair.value) return "应用修复";
  return "应用更新";
});
const canAbandon = computed<boolean>(() => {
  if (active.value) return false;
  if (
    task?.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.REGISTRATION_PENDING
  ) {
    return false;
  }
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
const audioPreflightPercent = computed<number>(() => {
  if (task === null || task.verificationTotalCount === 0) return 0;
  return Math.min(100, (task.verificationCompletedCount / task.verificationTotalCount) * 100);
});
const audioCommitPhasePercent = computed<number>(() => {
  if (task === null || task.commitTotalCount === 0) return 100;
  if (
    task.state === gameEnum.package.taskState.REGISTRATION_PENDING ||
    task.state === gameEnum.package.taskState.COMPLETED
  ) {
    return 100;
  }
  if (task.state === gameEnum.package.taskState.VERIFYING) {
    return (200 + audioPreflightPercent.value) / 3;
  }
  const committed = Math.min(100, (task.commitCompletedCount / task.commitTotalCount) * 100);
  return (audioPreflightPercent.value + committed) / 3;
});
const audioProgressPercent = computed<number | null>(() => {
  if (task === null || task.target !== gameEnum.package.planTarget.AUDIO) return null;
  const hasAssembly = task.assemblyTotalCount > 0;
  const resourceWeight = hasAssembly ? 0.5 : 0;
  switch (task.state) {
    case gameEnum.package.taskState.ASSEMBLING:
      if (task.assemblyTotalBytes > 0) {
        return (
          Math.min(100, (task.assemblyCompletedBytes / task.assemblyTotalBytes) * 100) *
          resourceWeight
        );
      }
      if (task.assemblyTotalCount > 0) {
        return (
          Math.min(100, (task.assemblyCompletedCount / task.assemblyTotalCount) * 100) *
          resourceWeight
        );
      }
      return 0;
    case gameEnum.package.taskState.COMMIT_PREPARED:
    case gameEnum.package.taskState.COMMITTING:
      return resourceWeight * 100 + audioCommitPhasePercent.value * (1 - resourceWeight);
    case gameEnum.package.taskState.VERIFYING:
      return resourceWeight * 100 + audioCommitPhasePercent.value * (1 - resourceWeight);
    case gameEnum.package.taskState.REGISTRATION_PENDING:
    case gameEnum.package.taskState.COMPLETED:
      return 100;
    default:
      if (task.totalBytes === 0) return 0;
      return Math.min(100, (task.downloadedBytes / task.totalBytes) * 100) * resourceWeight;
  }
});
const progressPercent = computed<number>(() => {
  if (recoveryProgress !== null) {
    if (recoveryProgress.totalObjects === 0) return 0;
    return Math.min(100, (recoveryProgress.scannedObjects / recoveryProgress.totalObjects) * 100);
  }
  if (task === null) return 0;
  if (audioProgressPercent.value !== null) return audioProgressPercent.value;
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
  if (recoveryProgress !== null) return recoveryProgress.totalObjects === 0;
  if (task === null) return false;
  if (
    task.target === gameEnum.package.planTarget.AUDIO &&
    task.state === gameEnum.package.taskState.READY_TO_APPLY &&
    task.currentFile !== null
  ) {
    return true;
  }
  if (!active.value) return false;
  if (task.target === gameEnum.package.planTarget.AUDIO) {
    switch (task.state) {
      case gameEnum.package.taskState.ASSEMBLING:
        return task.assemblyTotalBytes === 0 && task.assemblyTotalCount === 0;
      case gameEnum.package.taskState.COMMIT_PREPARED:
      case gameEnum.package.taskState.COMMITTING:
        return task.commitTotalCount === 0;
      case gameEnum.package.taskState.VERIFYING:
        return task.verificationTotalCount === 0;
      case gameEnum.package.taskState.REGISTRATION_PENDING:
        return true;
      default:
        return task.totalBytes === 0;
    }
  }
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    return task.assemblyTotalBytes === 0 && task.assemblyTotalCount === 0;
  }
  return task.totalBytes === 0 || gameEnum.package.taskApplying(task.state);
});
const progressFacts = computed<Array<string>>(() => {
  if (recoveryProgress !== null) {
    const values = [`步骤 ${recoveryProgress.step} / ${recoveryProgress.totalSteps}`];
    if (recoveryProgress.totalObjects > 0) {
      values.push(`处理对象 ${recoveryProgress.scannedObjects} / ${recoveryProgress.totalObjects}`);
      if (recoveryProgress.confirmedBytes > 0) {
        values.push(`已确认 ${formatBytes(recoveryProgress.confirmedBytes)}`);
      }
    }
    return values;
  }
  if (task === null) return [];
  if (task.target === gameEnum.package.planTarget.AUDIO) {
    switch (task.state) {
      case gameEnum.package.taskState.ASSEMBLING:
        return [
          `准备文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`,
          `${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`,
        ];
      case gameEnum.package.taskState.COMMIT_PREPARED:
      case gameEnum.package.taskState.COMMITTING:
        return [`提交文件 ${task.commitCompletedCount} / ${task.commitTotalCount}`];
      case gameEnum.package.taskState.VERIFYING:
        return [`校验文件 ${task.verificationCompletedCount} / ${task.verificationTotalCount}`];
      case gameEnum.package.taskState.REGISTRATION_PENDING:
        return ["正在同步本地安装记录"];
      default: {
        const values = [];
        if (task.totalCount > 0) {
          values.push(`下载文件 ${task.completedCount} / ${task.totalCount}`);
          values.push(`${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`);
        }
        if (task.bytesPerSecond > 0) values.push(`${formatBytes(task.bytesPerSecond)}/s`);
        if (task.etaSeconds !== null) values.push(`预计 ${formatDuration(task.etaSeconds)}`);
        return values;
      }
    }
  }
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
  if (recoveryProgress !== null) return "var(--tgc-od-orange)";
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
  gap: 8px;
}

.task-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  > .v-chip {
    flex-shrink: 0;
    align-self: center;
  }
}

.task-heading-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;

  > .v-chip {
    flex-shrink: 0;
  }
}

.task-heading-pause {
  color: var(--tgc-od-orange);
}

.task-heading-stop {
  color: var(--tgc-od-red);
}

.task-heading-recover {
  color: var(--tgc-od-blue);
}

.task-heading-abandon {
  color: var(--tgc-od-red);
}

.task-heading-copy {
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

.task-heading-copy strong.task-audio-title {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  white-space: normal;
}

.task-audio-title-label {
  display: inline;
  width: fit-content;
  flex-shrink: 0;
}

.task-audio-tags {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
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
</style>
