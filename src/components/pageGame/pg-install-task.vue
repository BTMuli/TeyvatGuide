<!-- 游戏本体安装任务进度 -->
<template>
  <section class="install-task" aria-label="当前安装">
    <div class="install-task-heading">
      <div class="install-task-title">
        <span>当前安装</span>
        <strong>{{ task.targetTag }}</strong>
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

    <PgProgress
      ariaLabel="游戏本体安装进度"
      :caption
      :currentFile="task.currentFile"
      :errorMessage="task.errorMessage"
      :facts
      :indeterminate="progressIndeterminate"
      :percent="progressPercent"
      :showBar="showProgressBar"
      :tone="captionTone"
    >
      <template #actions>
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
          v-if="recoverable && !failed"
          :disabled="actionPending"
          :loading="actionPending"
          aria-label="继续安装"
          density="compact"
          icon="mdi-play-circle-outline"
          size="small"
          title="继续安装"
          variant="text"
          @click="emit('recoverRequested', gameEnum.package.recoveryAction.RESUME)"
        />
        <v-btn
          v-if="canAbandon && !failed"
          :disabled="actionPending"
          :loading="actionPending"
          aria-label="放弃安装任务"
          density="compact"
          icon="mdi-delete-outline"
          size="small"
          title="放弃安装任务"
          variant="text"
          @click="emit('recoverRequested', gameEnum.package.recoveryAction.ROLLBACK)"
        />
      </template>
    </PgProgress>

    <v-alert
      v-if="task.state === gameEnum.package.taskState.RECOVERY_REQUIRED"
      class="install-task-alert"
      density="compact"
      text="安装任务未完成，请继续安装或放弃任务。"
      type="warning"
      variant="tonal"
    />
  </section>
</template>

<script lang="ts" setup>
import PgProgress from "@comp/pageGame/pg-progress.vue";
import gameEnum from "@enum/game.js";
import { computed } from "vue";

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
const caption = computed<string>(() =>
  failed.value ? "安装失败" : gameEnum.package.taskStateDesc(task.state),
);
const captionTone = computed<"err" | "ok" | "warn" | "">(() => {
  switch (task.state) {
    case gameEnum.package.taskState.FAILED:
      return "err";
    case gameEnum.package.taskState.RECOVERY_REQUIRED:
    case gameEnum.package.taskState.REPAIR_REQUIRED:
    case gameEnum.package.taskState.ROLLING_BACK:
      return "warn";
    default:
      return "";
  }
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
const progressPercent = computed<number>(() => {
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    if (task.assemblyTotalBytes > 0) {
      return Math.min(100, (task.assemblyCompletedBytes / task.assemblyTotalBytes) * 100);
    }
    if (task.assemblyTotalCount > 0) {
      return Math.min(100, (task.assemblyCompletedCount / task.assemblyTotalCount) * 100);
    }
    return 0;
  }
  if (task.totalBytes === 0) return 0;
  return Math.min(100, (task.downloadedBytes / task.totalBytes) * 100);
});
const progressIndeterminate = computed<boolean>(() => {
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    return task.assemblyTotalBytes === 0 && task.assemblyTotalCount === 0;
  }
  return task.totalBytes === 0 || gameEnum.package.taskApplying(task.state);
});
const showProgressBar = computed<boolean>(() => {
  return (
    active.value ||
    task.state === gameEnum.package.taskState.PAUSED ||
    task.state === gameEnum.package.taskState.READY_TO_APPLY
  );
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
const facts = computed<Array<string>>(() => {
  if (task.state === gameEnum.package.taskState.ASSEMBLING) {
    return [
      `组装空间 ${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`,
      `组装文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`,
      `当前耗时 ${formatElapsed(task.elapsedMs)}`,
    ];
  }
  const values = [
    `总进度 ${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`,
    `文件 ${task.completedCount} / ${task.totalCount}`,
    `当前耗时 ${formatElapsed(task.elapsedMs)}`,
  ];
  if (task.bytesPerSecond > 0) values.push(`${formatBytes(task.bytesPerSecond)}/s`);
  if (task.etaSeconds !== null) values.push(`预计剩余 ${formatDuration(task.etaSeconds)}`);
  return values;
});
const canCancel = computed<boolean>(() => {
  return active.value && !gameEnum.package.taskApplying(task.state);
});
const canPause = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.QUEUED ||
    task.state === gameEnum.package.taskState.DOWNLOADING
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
const canAbandon = computed<boolean>(() => {
  return recoverable.value && task.state !== gameEnum.package.taskState.RECOVERY_REQUIRED;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;

  > .v-chip {
    flex-shrink: 0;
    margin-top: 2px;
  }
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

.install-task :deep(.progress-panel) {
  border: 1px solid var(--common-shadow-1);
  margin-inline: 0;
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

@media (width <= 640px) {
  .install-task-config {
    grid-template-columns: 1fr;
  }

  .install-task-config-wide {
    grid-column: auto;
  }
}
</style>
