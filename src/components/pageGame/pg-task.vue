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
        <strong
          v-else-if="task !== null && task.target === gameEnum.package.planTarget.PRE_DOWNLOAD"
        >
          预下载 {{ task.sourceTag }} → {{ task.targetTag }}
        </strong>
        <strong v-else-if="task !== null">
          更新 {{ task.sourceTag }} → {{ task.targetTag }}
        </strong>
        <strong v-else-if="plan !== null">等待开始 {{ plan.targetTag }}</strong>
      </div>
      <div class="task-heading-actions">
        <template v-if="task !== null">
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
            {{ isAudio ? "取消" : "停止任务" }}
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
      <PgInstallProgress
        v-else-if="task.target === gameEnum.package.planTarget.INSTALL && recoveryProgress === null"
        embedded
        :task
      />
      <PgUpdateProgress v-else-if="recoveryProgress === null" embedded :targetPublished :task />
      <PgProgress
        v-else
        embedded
        ariaLabel="资源任务恢复进度"
        :caption="recoveryProgress.message"
        :facts="recoveryFacts"
        :indeterminate="recoveryProgress.totalObjects === 0"
        :percent="recoveryPercent"
      />
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
import PgInstallProgress from "./pg-install-progress.vue";
import PgNotice from "./pg-notice.vue";
import PgProgress from "./pg-progress.vue";
import PgUpdateProgress from "./pg-update-progress.vue";

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
  if (task?.state === gameEnum.package.taskState.READY_TO_APPLY) {
    if (task.target === gameEnum.package.planTarget.PRE_DOWNLOAD && !targetPublished) {
      return "等待正式发布";
    }
    if (task.target !== gameEnum.package.planTarget.AUDIO) return "可应用";
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
const recoveryPercent = computed<number>(() => {
  if (recoveryProgress === null || recoveryProgress.totalObjects === 0) return 0;
  return Math.min(100, (recoveryProgress.scannedObjects / recoveryProgress.totalObjects) * 100);
});
const recoveryFacts = computed<Array<string>>(() => {
  if (recoveryProgress === null) return [];
  const values = [`步骤 ${recoveryProgress.step} / ${recoveryProgress.totalSteps}`];
  if (recoveryProgress.totalObjects > 0) {
    values.push(`处理对象 ${recoveryProgress.scannedObjects} / ${recoveryProgress.totalObjects}`);
    if (recoveryProgress.confirmedBytes > 0) {
      values.push(`已确认 ${formatBytes(recoveryProgress.confirmedBytes)}`);
    }
  }
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

.task-heading-copy .task-audio-title-label {
  display: inline;
  width: fit-content;
  flex-shrink: 0;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
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

.task-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.task-note {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.task-note {
  margin: 0;
}

.task-note {
  color: var(--tgc-red-2);
}
</style>
