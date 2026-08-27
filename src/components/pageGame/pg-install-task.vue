<!-- 游戏本体安装任务进度 -->
<template>
  <section class="install-task" aria-label="当前安装">
    <div class="install-task-heading">
      <div class="install-task-title">
        <span>安装任务</span>
        <strong>{{ task.targetTag }}</strong>
      </div>
      <div class="install-task-heading-actions">
        <v-btn
          v-if="failed"
          :disabled="actionPending"
          :loading="actionPending"
          prepend-icon="mdi-refresh"
          size="small"
          variant="tonal"
          @click="emit('recoverRequested', gameEnum.package.recoveryAction.RESUME)"
        >
          重试
        </v-btn>
        <v-btn
          v-if="canPause"
          :disabled="actionPending"
          :loading="actionPending"
          prepend-icon="mdi-pause-circle-outline"
          size="small"
          variant="tonal"
          @click="emit('pauseRequested')"
        >
          暂停安装
        </v-btn>
        <v-btn
          v-if="failed"
          :disabled="actionPending"
          :loading="actionPending"
          prepend-icon="mdi-tune-variant"
          size="small"
          variant="tonal"
          @click="emit('configureRequested')"
        >
          修改安装配置
        </v-btn>
        <v-btn
          v-if="failed && canAbandon"
          :disabled="actionPending"
          :loading="actionPending"
          prepend-icon="mdi-delete-outline"
          size="small"
          variant="text"
          @click="emit('recoverRequested', gameEnum.package.recoveryAction.ROLLBACK)"
        >
          删除
        </v-btn>
        <v-btn
          v-if="canCancel && !failed"
          :disabled="actionPending"
          :loading="actionPending"
          class="install-task-stop"
          prepend-icon="mdi-stop-circle-outline"
          size="small"
          variant="tonal"
          @click="emit('cancelRequested')"
        >
          停止安装
        </v-btn>
        <v-btn
          v-if="resumable && !failed"
          :disabled="actionPending"
          :loading="actionPending"
          prepend-icon="mdi-play-circle-outline"
          size="small"
          variant="text"
          @click="emit('recoverRequested', gameEnum.package.recoveryAction.RESUME)"
        >
          继续安装
        </v-btn>
        <v-btn
          v-if="canAbandon && !failed"
          :disabled="actionPending"
          :loading="actionPending"
          class="install-task-abandon"
          prepend-icon="mdi-delete-outline"
          size="small"
          variant="text"
          @click="emit('recoverRequested', gameEnum.package.recoveryAction.ROLLBACK)"
        >
          放弃安装
        </v-btn>
      </div>
      <v-chip :color="stateColor" size="small" variant="tonal">
        {{ caption }}
      </v-chip>
    </div>

    <div class="install-task-config">
      <div class="install-task-config-item">
        <span>渠道</span>
        <strong>{{ gameEnum.installation.schemeDesc(task.targetScheme) }}</strong>
      </div>
      <div class="install-task-config-item">
        <span>语音包</span>
        <strong>{{ audioLabel }}</strong>
      </div>
      <div class="install-task-config-item install-task-config-wide">
        <span>安装目录</span>
        <strong>{{ task.installRoot ?? "未记录" }}</strong>
      </div>
    </div>

    <PgInstallProgress :task />

    <PgNotice
      v-if="task.autoRetryMessage !== null"
      class="install-task-alert"
      title="正在自动重试"
      :text="task.autoRetryMessage"
      tone="warning"
    />

    <PgNotice
      v-if="task.state === gameEnum.package.taskState.RECOVERY_REQUIRED"
      class="install-task-alert"
      text="安装任务未完成，请继续安装或放弃任务。"
      tone="warning"
    />
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed } from "vue";

import PgInstallProgress from "./pg-install-progress.vue";
import PgNotice from "./pg-notice.vue";

type Props = {
  actionPending: boolean;
  task: TGApp.Game.Package.TaskSummary;
};

const { actionPending, task } = defineProps<Props>();
const emit = defineEmits<{
  cancelRequested: [];
  configureRequested: [];
  pauseRequested: [];
  recoverRequested: [action: TGApp.Game.Package.RecoveryActionEnum];
}>();

const active = computed<boolean>(() => gameEnum.package.taskActive(task.state));
const failed = computed<boolean>(() => task.state === gameEnum.package.taskState.FAILED);
const caption = computed<string>(() => {
  if (failed.value) return "安装失败";
  if (task.autoRetryMessage !== null) return "正在自动重试";
  return gameEnum.package.taskStateDesc(task.state);
});
const stateColor = computed<string>(() => {
  switch (task.state) {
    case gameEnum.package.taskState.FAILED:
      return "error";
    case gameEnum.package.taskState.RECOVERY_REQUIRED:
    case gameEnum.package.taskState.REPAIR_REQUIRED:
    case gameEnum.package.taskState.ROLLING_BACK:
      return "warning";
    default:
      return "var(--tgc-od-orange)";
  }
});
const audioLabel = computed<string>(() => {
  const labels: Record<string, string> = {
    "zh-cn": "中文",
    "en-us": "英语",
    "ja-jp": "日语",
    "ko-kr": "韩语",
  };
  const languages = task.audioLanguages ?? [];
  return languages.map((language) => labels[language] ?? language).join("、") || "未记录";
});
const canCancel = computed<boolean>(() => {
  return active.value && !gameEnum.package.taskApplying(task.state);
});
const canPause = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.QUEUED ||
    task.state === gameEnum.package.taskState.DOWNLOADING ||
    task.state === gameEnum.package.taskState.ASSEMBLING
  );
});
const recoverable = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.RECOVERY_REQUIRED ||
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.PAUSED ||
    task.state === gameEnum.package.taskState.READY_TO_APPLY
  );
});
// 已越过发布边界但尚未登记的任务（已发布/复检完成/等待登记），以及提交边界前
// 中断的任务（提交准备/等待发布），应用重启后都需要「继续安装」来恢复收尾。
const resumable = computed<boolean>(() => {
  if (gameEnum.package.taskActive(task.state)) return false;
  return (
    recoverable.value ||
    task.state === gameEnum.package.taskState.COMMIT_PREPARED ||
    task.state === gameEnum.package.taskState.PUBLISH_PENDING ||
    task.state === gameEnum.package.taskState.PUBLISHED ||
    task.state === gameEnum.package.taskState.VERIFIED ||
    task.state === gameEnum.package.taskState.REGISTRATION_PENDING
  );
});
const canAbandon = computed<boolean>(() => {
  return recoverable.value && task.state !== gameEnum.package.taskState.RECOVERY_REQUIRED;
});
</script>

<style lang="scss" scoped>
.install-task {
  display: grid;
  padding: 12px 16px 16px;
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.install-task-heading {
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

.install-task-heading-actions {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.install-task-config {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.install-task-config-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 6px;
  background: var(--box-bg-2);
  gap: 3px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-size: 13px;
    font-weight: normal;
    line-height: 18px;
    overflow-wrap: anywhere;
  }
}

.install-task-config-wide {
  grid-column: 1 / -1;
}

.install-task-title {
  min-width: 0;

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
    overflow: hidden;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.install-task-alert {
  margin: 0;
}

.install-task-stop {
  color: var(--tgc-od-red);
}

.install-task-abandon {
  color: var(--tgc-od-red);
}

@media (width <= 640px) {
  .install-task-heading-actions {
    flex-basis: 100%;
    justify-content: flex-start;
  }

  .install-task-config {
    grid-template-columns: 1fr;
  }

  .install-task-config-wide {
    grid-column: auto;
  }
}
</style>
