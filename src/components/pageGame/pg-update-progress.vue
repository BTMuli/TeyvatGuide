<!-- 正式更新、预下载与完整性修复任务的下载、组装、提交和复验进度 -->
<template>
  <PgTaskProgressRows
    ariaLabel="游戏更新资源进度"
    :caption
    :captionTone
    :embedded
    :errorMessage="task.errorMessage"
    :rows="progressRows"
    :showRows="true"
  >
    <template #beforeRows>
      <PgUpdateThroughput v-if="showThroughput" :task />
    </template>
    <template #actions>
      <slot name="actions" />
    </template>
  </PgTaskProgressRows>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import PgTaskProgressRows from "./pg-task-progress-rows.vue";
import PgUpdateThroughput from "./pg-update-throughput.vue";

type Props = {
  task: TGApp.Game.Package.TaskSummary;
  targetPublished: boolean;
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

const { task, targetPublished, embedded = false } = defineProps<Props>();
defineSlots<{ actions?: () => unknown }>();
const clock = ref<number>(Date.now());
const throughputVisibleUntil = ref<number | null>(null);
let clockTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  clockTimer = setInterval(() => {
    clock.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (clockTimer !== null) clearInterval(clockTimer);
});

const isPreDownload = computed<boolean>(
  () => task.target === gameEnum.package.planTarget.PRE_DOWNLOAD,
);
const integrityRepair = computed<boolean>(() => task.sourceTag === task.targetTag);
const failed = computed<boolean>(() => task.state === gameEnum.package.taskState.FAILED);
const caption = computed<string>(() => {
  if (failed.value) return integrityRepair.value ? "完整性修复失败" : "更新任务失败";
  if (task.state === gameEnum.package.taskState.READY_TO_APPLY) {
    if (isPreDownload.value && !targetPublished) return "预下载完成，等待正式发布";
    if (isPreDownload.value) return "预下载完成，可应用更新";
    if (integrityRepair.value) return "修复资源已下载并组装";
    return "更新资源已下载并组装";
  }
  if (task.state === gameEnum.package.taskState.COMPLETED) {
    if (task.target === gameEnum.package.planTarget.INSTALL) return "安装完成";
    return integrityRepair.value ? "完整性修复完成" : "更新完成";
  }
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
const acquisitionComplete = computed<boolean>(() => {
  if (task.totalBytes > 0) return task.downloadedBytes >= task.totalBytes;
  return phaseAfterDownload(task.state);
});
const acquisitionPercent = computed<number>(() => {
  if (task.totalBytes === 0) return acquisitionComplete.value ? 100 : 0;
  return phasePercent(task.downloadedBytes, task.totalBytes);
});
const applicationStarted = computed<boolean>(() => {
  return (
    gameEnum.package.taskApplying(task.state) ||
    task.state === gameEnum.package.taskState.REPAIR_REQUIRED ||
    task.state === gameEnum.package.taskState.COMPLETED ||
    task.commitCompletedCount > 0 ||
    task.verificationCompletedCount > 0
  );
});
const streamAssemble = computed<boolean>(() => !isPreDownload.value);
const resourcePreparing = computed<boolean>(() => {
  if (!streamAssemble.value) return false;
  return (
    task.state === gameEnum.package.taskState.QUEUED ||
    task.state === gameEnum.package.taskState.DOWNLOADING ||
    task.state === gameEnum.package.taskState.PAUSED ||
    task.assemblyTotalBytes > 0 ||
    task.assemblyTotalCount > 0 ||
    task.assemblyCompletedCount > 0
  );
});
const repairAssembly = computed<boolean>(() => {
  return (
    task.commitTotalCount > 0 &&
    task.commitCompletedCount >= task.commitTotalCount &&
    task.state === gameEnum.package.taskState.ASSEMBLING
  );
});
const assemblyComplete = computed<boolean>(() => {
  if (task.assemblyTotalBytes > 0) {
    return task.assemblyCompletedBytes >= task.assemblyTotalBytes;
  }
  return phaseAfterAssembly(task.state);
});
const assemblyPercent = computed<number>(() => {
  if (assemblyComplete.value) return 100;
  if (task.assemblyTotalBytes > 0) {
    return phasePercent(task.assemblyCompletedBytes, task.assemblyTotalBytes);
  }
  if (task.assemblyTotalCount > 0) {
    return phasePercent(task.assemblyCompletedCount, task.assemblyTotalCount);
  }
  return 0;
});
const commitComplete = computed<boolean>(() => {
  if (task.commitTotalCount > 0) return task.commitCompletedCount >= task.commitTotalCount;
  return phaseAfterCommit(task.state);
});
const commitPercent = computed<number>(() => {
  if (commitComplete.value) return 100;
  if (task.commitTotalCount === 0) return 0;
  return phasePercent(task.commitCompletedCount, task.commitTotalCount);
});
const verificationComplete = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.PUBLISH_PENDING ||
    task.state === gameEnum.package.taskState.PUBLISHED ||
    task.state === gameEnum.package.taskState.VERIFIED ||
    task.state === gameEnum.package.taskState.REGISTRATION_PENDING ||
    task.state === gameEnum.package.taskState.COMPLETED
  );
});
const verificationPercent = computed<number>(() => {
  if (verificationComplete.value) return 100;
  if (task.verificationTotalBytes > 0) {
    return phasePercent(task.verificationCompletedBytes, task.verificationTotalBytes);
  }
  if (task.verificationTotalCount > 0) {
    return phasePercent(task.verificationCompletedCount, task.verificationTotalCount);
  }
  return 0;
});
const verificationIndeterminate = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.VERIFYING &&
    task.verificationTotalBytes === 0 &&
    task.verificationTotalCount === 0
  );
});
const throughputActive = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.QUEUED ||
    task.state === gameEnum.package.taskState.DOWNLOADING ||
    task.state === gameEnum.package.taskState.ASSEMBLING
  );
});
const showThroughput = computed<boolean>(() => {
  return (
    throughputActive.value ||
    (throughputVisibleUntil.value !== null && clock.value < throughputVisibleUntil.value)
  );
});

watch(
  () => ({ active: throughputActive.value, taskId: task.taskId }),
  (current, previous) => {
    if (current.taskId !== previous.taskId || current.active) {
      throughputVisibleUntil.value = null;
    } else if (previous.active) {
      throughputVisibleUntil.value = Date.now() + 5000;
    }
  },
);
const displayElapsedMs = computed<number>(() => {
  if (!gameEnum.package.taskActive(task.state)) return task.elapsedMs;
  const updatedAt = Date.parse(task.updatedAt);
  if (!Number.isFinite(updatedAt)) return task.elapsedMs;
  return task.elapsedMs + Math.max(0, clock.value - updatedAt);
});
const acquisitionStatus = computed<string | null>(() => {
  if (acquisitionComplete.value) {
    if (isPreDownload.value && !targetPublished) return "已完成，游戏目录未修改";
    if (isPreDownload.value) return "已完成，可应用更新";
    return "已完成";
  }
  if (task.state === gameEnum.package.taskState.QUEUED) {
    return isPreDownload.value ? "正在准备缓存任务" : "正在准备：等待下载阶段开始";
  }
  if (
    task.state === gameEnum.package.taskState.DOWNLOADING &&
    task.bytesPerSecond === 0 &&
    task.downloadCurrentFile === null
  ) {
    return "正在准备下载：等待首个分片发出请求";
  }
  if (task.state === gameEnum.package.taskState.DOWNLOADING) {
    return isPreDownload.value ? "正在写入共享缓存" : "正在获取并组装资源";
  }
  return task.downloadCurrentFile;
});
const assemblyStatus = computed<string | null>(() => {
  if (assemblyComplete.value) return "已完成";
  if (task.state === gameEnum.package.taskState.ASSEMBLING) return "正在组装事务资源";
  if (streamAssemble.value && task.state === gameEnum.package.taskState.DOWNLOADING) {
    return task.assemblyCurrentFile ?? "正在边下边组装";
  }
  return isPreDownload.value ? "等待应用后组装" : "等待可组装文件";
});
const commitStatus = computed<string | null>(() => {
  if (commitComplete.value) return "已完成";
  if (
    task.state === gameEnum.package.taskState.COMMIT_PREPARED ||
    task.state === gameEnum.package.taskState.COMMITTING
  ) {
    return task.commitCurrentStep ?? "正在执行可逆提交";
  }
  return "等待资源提交";
});
const verificationStatus = computed<string | null>(() => {
  if (verificationComplete.value) return "已完成";
  if (task.state === gameEnum.package.taskState.REPAIR_REQUIRED) return "发现文件需要修复";
  if (task.state === gameEnum.package.taskState.VERIFYING) {
    return task.currentFile ?? "正在校验目标清单";
  }
  return "等待完整复验";
});
const acquisitionRow = computed<ProgressRow>(() => ({
  label: isPreDownload.value ? "预下载资源" : integrityRepair.value ? "修复资源" : "资源下载",
  percent: acquisitionPercent.value,
  indeterminate:
    task.totalBytes === 0 &&
    (task.state === gameEnum.package.taskState.QUEUED ||
      task.state === gameEnum.package.taskState.DOWNLOADING),
  complete: acquisitionComplete.value,
  status: acquisitionStatus.value,
  details: [
    task.totalBytes > 0
      ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
      : acquisitionComplete.value
        ? "无需额外下载，已复用本地缓存"
        : "正在核对共享缓存",
    task.totalCount > 0
      ? `下载对象 ${task.completedCount} / ${task.totalCount}`
      : "没有需要下载的对象",
  ],
  downloadObjectStatus: null,
  activeAssemblyCount: 0,
}));
const assemblyRow = computed<ProgressRow>(() => ({
  label: repairAssembly.value ? "完整性修复" : "资源组装",
  percent: assemblyPercent.value,
  indeterminate:
    task.state === gameEnum.package.taskState.ASSEMBLING &&
    task.assemblyTotalBytes === 0 &&
    task.assemblyTotalCount === 0,
  complete: assemblyComplete.value,
  status: assemblyStatus.value,
  details: [
    task.assemblyTotalBytes > 0
      ? `${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`
      : "等待可计算的组装工作量",
    task.assemblyTotalCount > 0
      ? `文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`
      : "等待组装清单",
  ],
  downloadObjectStatus:
    task.activeAssemblyCount > 0 ? `正在并行组装 ${task.activeAssemblyCount} 个资源` : null,
  activeAssemblyCount: task.activeAssemblyCount,
}));
const commitRow = computed<ProgressRow>(() => ({
  label: "文件提交",
  percent: commitPercent.value,
  indeterminate:
    (task.state === gameEnum.package.taskState.COMMIT_PREPARED ||
      task.state === gameEnum.package.taskState.COMMITTING) &&
    task.commitTotalCount === 0,
  complete: commitComplete.value,
  status: commitStatus.value,
  details: [
    task.commitTotalCount > 0
      ? `提交步骤 ${task.commitCompletedCount} / ${task.commitTotalCount}`
      : "正在准备事务提交",
  ],
  downloadObjectStatus: null,
  activeAssemblyCount: 0,
}));
const verificationRow = computed<ProgressRow>(() => ({
  label: "完整复验",
  percent: verificationPercent.value,
  indeterminate: verificationIndeterminate.value,
  complete: verificationComplete.value,
  status: verificationStatus.value,
  details: [
    ...(task.verificationTotalBytes > 0
      ? [
          `${formatBytes(task.verificationCompletedBytes)} / ${formatBytes(task.verificationTotalBytes)}`,
        ]
      : []),
    ...(task.verificationTotalCount > 0
      ? [`文件 ${task.verificationCompletedCount} / ${task.verificationTotalCount}`]
      : []),
    `当前耗时 ${formatElapsed(displayElapsedMs.value)}`,
  ],
  downloadObjectStatus: null,
  activeAssemblyCount: 0,
}));
const progressRows = computed<Array<ProgressRow>>(() => {
  const rows = [acquisitionRow.value];
  if (isPreDownload.value) {
    if (applicationStarted.value) {
      rows.push(assemblyRow.value, commitRow.value);
      if (!repairAssembly.value) rows.push(verificationRow.value);
    }
    return rows;
  }
  if (resourcePreparing.value || applicationStarted.value) {
    rows.push(assemblyRow.value);
  }
  if (!applicationStarted.value && task.state !== gameEnum.package.taskState.READY_TO_APPLY) {
    return rows;
  }
  rows.push(commitRow.value);
  if (!repairAssembly.value) rows.push(verificationRow.value);
  return rows;
});

function phasePercent(completed: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, Math.max(0, (completed / total) * 100));
}

function phaseAfterAssembly(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === gameEnum.package.taskState.COMMIT_PREPARED ||
    state === gameEnum.package.taskState.COMMITTING ||
    phaseAfterCommit(state)
  );
}

function phaseAfterDownload(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === gameEnum.package.taskState.READY_TO_APPLY ||
    state === gameEnum.package.taskState.ASSEMBLING ||
    phaseAfterAssembly(state)
  );
}

function phaseAfterCommit(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === gameEnum.package.taskState.VERIFYING ||
    state === gameEnum.package.taskState.PUBLISH_PENDING ||
    state === gameEnum.package.taskState.PUBLISHED ||
    state === gameEnum.package.taskState.VERIFIED ||
    state === gameEnum.package.taskState.REGISTRATION_PENDING ||
    state === gameEnum.package.taskState.REPAIR_REQUIRED ||
    state === gameEnum.package.taskState.COMPLETED
  );
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
