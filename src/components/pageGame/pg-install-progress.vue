<!-- 游戏本体安装的下载、组装与总进度 -->
<template>
  <section class="install-progress" aria-label="游戏本体安装进度">
    <div class="install-progress-status">
      <span :class="captionTone">{{ caption }}</span>
      <div class="install-progress-actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="showProgressBar" class="install-progress-rows" aria-live="polite">
      <div v-for="row in progressRows" :key="row.label" class="install-progress-row">
        <div class="install-progress-row-head">
          <div class="install-progress-row-label">
            <span>{{ row.label }}</span>
            <span
              v-if="row.status !== null"
              :class="{ 'install-progress-complete': row.complete }"
              class="install-progress-row-status"
              :title="row.status"
            >
              {{ row.status }}
            </span>
          </div>
          <strong>{{ row.percent.toFixed(0) }}%</strong>
        </div>
        <v-progress-linear
          :indeterminate="row.indeterminate"
          :model-value="row.percent"
          color="var(--tgc-od-orange)"
          height="8"
          rounded
        />
        <div class="install-progress-row-facts">
          <span v-for="detail in row.details" :key="detail">{{ detail }}</span>
        </div>
      </div>
    </div>

    <p
      v-if="task.errorMessage !== null && task.errorMessage !== caption"
      class="install-progress-error"
    >
      {{ task.errorMessage }}
    </p>
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

type Props = {
  task: TGApp.Game.Package.TaskSummary;
};

type ProgressRow = {
  label: string;
  percent: number;
  indeterminate: boolean;
  complete: boolean;
  status: string | null;
  details: Array<string>;
};

const { task } = defineProps<Props>();
defineSlots<{ actions?: () => unknown }>();
const clock = ref<number>(Date.now());
let clockTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  clockTimer = setInterval(() => {
    clock.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (clockTimer !== null) clearInterval(clockTimer);
});

const active = computed<boolean>(() => gameEnum.package.taskActive(task.state));
const failed = computed<boolean>(() => task.state === gameEnum.package.taskState.FAILED);
const caption = computed<string>(() =>
  failed.value ? "安装失败" : gameEnum.package.taskStateDesc(task.state),
);
const captionTone = computed<"err" | "warn" | "">(() => {
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
const downloadPercent = computed<number>(() => phasePercent(task.downloadedBytes, task.totalBytes));
const assemblyPercent = computed<number>(() => {
  if (task.assemblyTotalBytes === 0) {
    return task.state === gameEnum.package.taskState.QUEUED ? 0 : 100;
  }
  return phasePercent(task.assemblyCompletedBytes, task.assemblyTotalBytes);
});
const commitPercent = computed<number>(() => {
  if (task.commitTotalCount === 0) return 100;
  return phasePercent(task.commitCompletedCount, task.commitTotalCount);
});
const commitComplete = computed<boolean>(() => {
  return task.commitTotalCount === 0 || task.commitCompletedCount >= task.commitTotalCount;
});
const resourcePercent = computed<number>(() => {
  const totalWork = task.totalBytes + task.assemblyTotalBytes;
  if (totalWork === 0) return gameEnum.package.taskApplying(task.state) ? 100 : 0;
  const completedWork = task.downloadedBytes + task.assemblyCompletedBytes;
  return Math.min(100, (completedWork / totalWork) * 100);
});
// 下载与组装按实际字节工作量计权；安装收尾预留 5%，避免发布、校验和登记期间提前显示 100%。
const progressPercent = computed<number>(() => {
  if (task.commitTotalCount === 0) return resourcePercent.value;
  return resourcePercent.value * 0.95 + commitPercent.value * 0.05;
});
const downloadComplete = computed<boolean>(() => {
  return task.totalBytes > 0 && task.downloadedBytes >= task.totalBytes;
});
const assemblyComplete = computed<boolean>(() => {
  if (task.assemblyTotalBytes === 0) return task.state !== gameEnum.package.taskState.QUEUED;
  return task.assemblyCompletedBytes >= task.assemblyTotalBytes;
});
const downloadStatus = computed<string | null>(() => {
  if (downloadComplete.value) return "已完成";
  if (task.downloadCurrentFile !== null) return task.downloadCurrentFile;
  if (task.state === gameEnum.package.taskState.DOWNLOADING) return task.currentFile;
  if (active.value) return "等待下载：准备下一个资源批次";
  return null;
});
const assemblyStatus = computed<string | null>(() => {
  if (task.assemblyTotalBytes === 0) {
    return active.value && task.state === gameEnum.package.taskState.QUEUED
      ? "正在准备：等待下载阶段开始"
      : "无需组装";
  }
  if (assemblyComplete.value) return "已完成";
  if (task.assemblyCurrentFile !== null) return task.assemblyCurrentFile;
  if (gameEnum.package.taskApplying(task.state)) return task.currentFile;
  if (active.value) {
    return downloadComplete.value
      ? "等待组装：下载已完成，准备开始组装"
      : "等待组装：等待对应资源下载完成";
  }
  return null;
});
const displayElapsedMs = computed<number>(() => {
  if (!active.value) return task.elapsedMs;
  const updatedAt = Date.parse(task.updatedAt);
  if (!Number.isFinite(updatedAt)) return task.elapsedMs;
  return task.elapsedMs + Math.max(0, clock.value - updatedAt);
});
const overallFacts = computed<Array<string>>(() => {
  return [
    `任务临时空间 ${formatBytes(task.spoolBytes)}，已释放 ${formatBytes(task.releasedBytes)}`,
    `当前耗时 ${formatElapsed(displayElapsedMs.value)}`,
  ];
});
const downloadFacts = computed<Array<string>>(() => {
  const values = [
    `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`,
    `对象 ${task.completedCount} / ${task.totalCount}`,
  ];
  if (!downloadComplete.value && task.state === gameEnum.package.taskState.DOWNLOADING) {
    values.push(
      task.bytesPerSecond > 0
        ? `当前速度 ${formatBytes(task.bytesPerSecond)}/s`
        : "当前速度 测速中",
      task.etaSeconds !== null ? `预计剩余 ${formatDuration(task.etaSeconds)}` : "预计剩余 计算中",
    );
  }
  return values;
});
const downloadRow = computed<ProgressRow>(() => ({
  label: "下载",
  percent: downloadPercent.value,
  indeterminate: task.totalBytes === 0 && active.value,
  complete: downloadComplete.value,
  status: downloadStatus.value,
  details: downloadFacts.value,
}));
const assemblyRow = computed<ProgressRow>(() => ({
  label: "组装",
  percent: assemblyPercent.value,
  indeterminate:
    task.assemblyTotalBytes === 0 &&
    active.value &&
    task.state === gameEnum.package.taskState.QUEUED,
  complete: assemblyComplete.value,
  status: assemblyStatus.value,
  details:
    task.assemblyTotalBytes === 0
      ? ["没有需要组装的游戏文件"]
      : [
          `${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`,
          `文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`,
        ],
}));
const commitRow = computed<ProgressRow>(() => ({
  label: "提交",
  percent: commitPercent.value,
  indeterminate: task.commitTotalCount === 0 && gameEnum.package.taskApplying(task.state),
  complete: task.commitTotalCount > 0 && task.commitCompletedCount >= task.commitTotalCount,
  status: task.commitCurrentStep,
  details: [
    `里程碑 ${task.commitCompletedCount} / ${task.commitTotalCount}`,
    ...(task.verificationTotalCount > 0
      ? [`本轮目录校验 ${task.verificationCompletedCount} / ${task.verificationTotalCount} 个文件`]
      : []),
  ],
}));
const overallRow = computed<ProgressRow>(() => ({
  label: "总进度",
  percent: progressPercent.value,
  indeterminate: task.totalBytes + task.assemblyTotalBytes === 0 && active.value,
  complete: resourcePercent.value >= 100 && commitComplete.value,
  status: overallFacts.value.join(" · "),
  details: [
    `资源工作量 ${formatBytes(task.downloadedBytes + task.assemblyCompletedBytes)} / ${formatBytes(
      task.totalBytes + task.assemblyTotalBytes,
    )}`,
    task.commitTotalCount > 0
      ? `下载 ${downloadPercent.value.toFixed(0)}% · 组装 ${assemblyPercent.value.toFixed(0)}% · 提交 ${commitPercent.value.toFixed(0)}%`
      : `下载 ${downloadPercent.value.toFixed(0)}% · 组装 ${assemblyPercent.value.toFixed(0)}%`,
  ],
}));
const progressRows = computed<Array<ProgressRow>>(() => {
  const rows = [downloadRow.value, assemblyRow.value];
  if (task.commitTotalCount > 0) rows.push(commitRow.value);
  rows.push(overallRow.value);
  return rows;
});
const showProgressBar = computed<boolean>(() => {
  return (
    active.value ||
    task.state === gameEnum.package.taskState.PAUSED ||
    task.state === gameEnum.package.taskState.READY_TO_APPLY
  );
});

function phasePercent(completed: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, (completed / total) * 100);
}

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
.install-progress {
  display: grid;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 8px;
}

.install-progress-status,
.install-progress-row-head {
  display: flex;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.install-progress-status {
  gap: 8px;

  .warn {
    color: var(--tgc-od-orange);
  }

  .err {
    color: var(--tgc-od-red);
  }
}

.install-progress-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;

  &:empty {
    display: none;
  }
}

.install-progress-rows {
  display: grid;
  gap: 10px;
}

.install-progress-row {
  display: grid;
  gap: 4px;
}

.install-progress-row-head {
  justify-content: space-between;
}

.install-progress-row-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.install-progress-row-status {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.install-progress-complete {
  color: var(--tgc-od-green);
}

.install-progress-row-head strong {
  flex-shrink: 0;
  color: var(--common-text-title);
  font-weight: normal;
}

.install-progress-row-facts {
  display: flex;
  flex-wrap: wrap;
  color: var(--box-text-2);
  font-size: 11px;
  gap: 4px 12px;
  line-height: 15px;
}

.install-progress-error {
  margin: 0;
  color: var(--tgc-od-red);
  font-size: 12px;
  line-height: 16px;
}
</style>
