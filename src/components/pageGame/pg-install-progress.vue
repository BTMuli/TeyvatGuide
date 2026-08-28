<!-- 游戏本体安装流水线的下载、组装与总进度 -->
<template>
  <PgTaskProgressRows
    ariaLabel="游戏本体安装进度"
    :caption
    :captionTone
    :embedded
    :errorMessage="task.errorMessage"
    :rows="progressRows"
    :showRows="showProgressBar"
  >
    <template #actions>
      <slot name="actions" />
    </template>
    <template #beforeRows>
      <PgInstallThroughput v-if="showThroughput" :task />
    </template>
  </PgTaskProgressRows>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import PgInstallThroughput from "./pg-install-throughput.vue";
import PgTaskProgressRows from "./pg-task-progress-rows.vue";

type Props = {
  task: TGApp.Game.Package.TaskSummary;
  embedded?: boolean;
};

type ProgressRow = {
  label: string;
  percent: number;
  indeterminate: boolean;
  complete: boolean;
  status: string | null;
  details: Array<string>;
  downloadObjectStatus: string | null;
  activeAssemblyCount: number;
};

const { task, embedded = false } = defineProps<Props>();
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
const caption = computed<string>(() => {
  if (failed.value) return "安装失败";
  if (task.autoRetryMessage !== null) return "正在自动重试";
  return gameEnum.package.taskStateDesc(task.state);
});
const captionTone = computed<"err" | "warn" | "">(() => {
  switch (task.state) {
    case gameEnum.package.taskState.FAILED:
      return "err";
    case gameEnum.package.taskState.RECOVERY_REQUIRED:
    case gameEnum.package.taskState.REPAIR_REQUIRED:
    case gameEnum.package.taskState.ROLLING_BACK:
    case gameEnum.package.taskState.CANCELED:
    case gameEnum.package.taskState.ABANDONED:
      return "warn";
    default:
      return "";
  }
});
const commitPercent = computed<number>(() => {
  if (task.commitTotalCount === 0) return 100;
  return phasePercent(task.commitCompletedCount, task.commitTotalCount);
});
const commitComplete = computed<boolean>(() => {
  return task.commitTotalCount === 0 || task.commitCompletedCount >= task.commitTotalCount;
});
const downloadComplete = computed<boolean>(() => {
  return task.totalBytes === 0
    ? task.state !== gameEnum.package.taskState.QUEUED
    : task.downloadedBytes >= task.totalBytes;
});
const assemblyComplete = computed<boolean>(() => {
  if (task.assemblyTotalBytes > 0) {
    return task.assemblyCompletedBytes >= task.assemblyTotalBytes;
  }
  if (task.assemblyTotalCount > 0) {
    return task.assemblyCompletedCount >= task.assemblyTotalCount;
  }
  return (
    task.state !== gameEnum.package.taskState.QUEUED &&
    task.state !== gameEnum.package.taskState.DOWNLOADING &&
    task.state !== gameEnum.package.taskState.ASSEMBLING
  );
});
const resourceTotalBytes = computed<number>(() => task.totalBytes + task.assemblyTotalBytes);
const resourceCompletedBytes = computed<number>(
  () => task.downloadedBytes + task.assemblyCompletedBytes,
);
const resourceComplete = computed<boolean>(() => {
  return downloadComplete.value && assemblyComplete.value;
});
// 下载对象是安装写入的输入，资源安装进度同时累计下载与组装字节。
// 收尾阶段沿用 95% / 5% 兼容权重，避免把阶段时间误解为剩余时长。
const resourcePercent = computed<number>(() => {
  if (resourceTotalBytes.value === 0) return resourceComplete.value ? 100 : 0;
  return phasePercent(resourceCompletedBytes.value, resourceTotalBytes.value);
});
const progressPercent = computed<number>(() => {
  if (task.commitTotalCount === 0) return resourcePercent.value;
  return resourcePercent.value * 0.95 + commitPercent.value * 0.05;
});
const resourceStatus = computed<string | null>(() => {
  if (resourceComplete.value) return "已完成";
  if (resourceTotalBytes.value === 0) {
    return active.value ? "正在准备资源安装" : "无需下载或安装资源";
  }
  if (task.state === gameEnum.package.taskState.QUEUED) {
    return task.autoRetryMessage ?? "正在准备：等待下载阶段开始";
  }
  if (gameEnum.package.taskApplying(task.state)) {
    return task.commitCurrentStep ?? "正在校验安装内容";
  }
  if (active.value) {
    if (downloadComplete.value) return "正在安装已下载资源";
    if (
      task.state === gameEnum.package.taskState.DOWNLOADING &&
      task.bytesPerSecond === 0 &&
      task.downloadCurrentFile === null
    ) {
      return "正在准备下载：等待首个分片发出请求";
    }
    return "正在获取并安装资源";
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
    `当前私有临时空间 ${formatBytes(task.spoolBytes)}，已释放 ${formatBytes(task.releasedBytes)}`,
    `当前耗时 ${formatElapsed(displayElapsedMs.value)}`,
  ];
});
const resourceFacts = computed<Array<string>>(() => {
  const facts: Array<string> = [];
  if (resourceTotalBytes.value > 0) {
    facts.push(
      `资源 ${formatBytes(resourceCompletedBytes.value)} / ${formatBytes(resourceTotalBytes.value)}`,
    );
  }
  if (task.totalBytes > 0) {
    facts.push(`下载 ${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`);
  }
  if (task.assemblyTotalBytes > 0) {
    facts.push(
      `安装写入 ${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`,
    );
  }
  if (task.assemblyTotalCount > 0) {
    facts.push(`文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`);
  }
  return facts.length > 0 ? facts : ["没有需要下载或安装的游戏文件"];
});
const resourceRow = computed<ProgressRow>(() => ({
  label: "资源安装",
  percent: resourcePercent.value,
  indeterminate: resourceTotalBytes.value === 0 && active.value && !resourceComplete.value,
  complete: resourceComplete.value,
  status: resourceStatus.value,
  details: resourceFacts.value,
  downloadObjectStatus:
    task.totalCount > 0 ? `下载对象 ${task.completedCount} / ${task.totalCount}` : null,
  activeAssemblyCount: task.activeAssemblyCount,
}));
const commitRow = computed<ProgressRow>(() => ({
  label: "发布与登记",
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
  downloadObjectStatus: null,
  activeAssemblyCount: 0,
}));
const overallRow = computed<ProgressRow>(() => ({
  label: "总进度",
  percent: progressPercent.value,
  indeterminate: resourceTotalBytes.value === 0 && active.value && !resourceComplete.value,
  complete: resourceComplete.value && commitComplete.value,
  status: overallFacts.value.join(" · "),
  details: [
    resourceTotalBytes.value > 0
      ? `资源安装 ${formatBytes(resourceCompletedBytes.value)} / ${formatBytes(resourceTotalBytes.value)}`
      : resourceComplete.value
        ? "资源安装无需下载或安装"
        : "资源安装等待数据",
    task.commitTotalCount > 0
      ? `资源安装 ${resourcePercent.value.toFixed(0)}% · 发布与登记 ${commitPercent.value.toFixed(0)}%`
      : `资源安装 ${resourcePercent.value.toFixed(0)}%`,
  ],
  downloadObjectStatus: null,
  activeAssemblyCount: 0,
}));
const progressRows = computed<Array<ProgressRow>>(() => {
  const rows = [resourceRow.value];
  if (task.commitTotalCount > 0) rows.push(commitRow.value);
  rows.push(overallRow.value);
  return rows;
});
const resourceCompleteAt = ref<number | null>(null);
const resourceCompleteObserved = ref<boolean>(resourceComplete.value);
const resourceCompleteElapsedMs = computed<number>(() => {
  if (resourceCompleteAt.value === null) return 0;
  return Math.max(0, clock.value - resourceCompleteAt.value);
});
const showThroughput = computed<boolean>(() => {
  if (
    task.state === gameEnum.package.taskState.COMPLETED ||
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.RECOVERY_REQUIRED ||
    task.state === gameEnum.package.taskState.CANCELED ||
    task.state === gameEnum.package.taskState.ABANDONED
  ) {
    return false;
  }
  return (
    !resourceComplete.value ||
    (resourceCompleteAt.value !== null && resourceCompleteElapsedMs.value < 5000)
  );
});
const showProgressBar = computed<boolean>(() => {
  return (
    active.value ||
    task.state === gameEnum.package.taskState.PAUSED ||
    task.state === gameEnum.package.taskState.READY_TO_APPLY ||
    task.state === gameEnum.package.taskState.COMPLETED ||
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.RECOVERY_REQUIRED ||
    task.state === gameEnum.package.taskState.CANCELED ||
    task.state === gameEnum.package.taskState.ABANDONED
  );
});

watch(resourceComplete, (complete) => {
  if (complete && !resourceCompleteObserved.value) resourceCompleteAt.value = Date.now();
  if (!complete) resourceCompleteAt.value = null;
  resourceCompleteObserved.value = complete;
});

watch(
  () => task.taskId,
  () => {
    resourceCompleteAt.value = null;
    resourceCompleteObserved.value = resourceComplete.value;
  },
);

function phasePercent(completed: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, Math.max(0, (completed / total) * 100));
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
