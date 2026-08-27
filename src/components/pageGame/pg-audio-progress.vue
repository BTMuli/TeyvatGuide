<!-- 配音包资源变更流水线的下载、组装、提交与总进度 -->
<template>
  <PgTaskProgressRows
    ariaLabel="配音包资源进度"
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
      <PgAudioThroughput v-if="!prepComplete" :task />
    </template>
  </PgTaskProgressRows>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

import PgAudioThroughput from "./pg-audio-throughput.vue";
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
const caption = computed<string>(() =>
  failed.value ? "配音包任务失败" : gameEnum.package.taskStateDesc(task.state),
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
const audioCommitPercent = computed<number>(() => {
  if (task.commitTotalCount === 0) return 100;
  if (
    task.state === gameEnum.package.taskState.REGISTRATION_PENDING ||
    task.state === gameEnum.package.taskState.COMPLETED
  ) {
    return 100;
  }
  const committed = phasePercent(task.commitCompletedCount, task.commitTotalCount);
  if (task.verificationTotalCount === 0) return committed;
  const verified = phasePercent(task.verificationCompletedCount, task.verificationTotalCount);
  if (task.state === gameEnum.package.taskState.VERIFYING) {
    return committed * 0.5 + verified * 0.5;
  }
  return committed;
});
const commitComplete = computed<boolean>(() => audioCommitPercent.value >= 100);
const downloadComplete = computed<boolean>(() => {
  return task.totalBytes > 0 && task.downloadedBytes >= task.totalBytes;
});
// 资源准备进度把下载与组装分开折算：既要下载又要组装时按双倍计入
// （13G 下载 + 13G 组装 = 26G），再叠加删除字节，例如 13+13+11G。
const prepTotalBytes = computed<number>(() => {
  return task.totalBytes + task.assemblyTotalBytes + task.deleteTotalBytes;
});
const prepCompletedBytes = computed<number>(() => {
  return task.downloadedBytes + task.assemblyCompletedBytes + task.deleteCompletedBytes;
});
const prepComplete = computed<boolean>(() => {
  const downloadDone = task.totalBytes === 0 || task.downloadedBytes >= task.totalBytes;
  const assemblyDone =
    task.assemblyTotalBytes === 0 || task.assemblyCompletedBytes >= task.assemblyTotalBytes;
  const deleteDone =
    task.deleteTotalBytes === 0 || task.deleteCompletedBytes >= task.deleteTotalBytes;
  return downloadDone && assemblyDone && deleteDone;
});
const assemblyComplete = computed<boolean>(() => {
  if (task.assemblyTotalBytes === 0) return task.state !== gameEnum.package.taskState.QUEUED;
  return task.assemblyCompletedBytes >= task.assemblyTotalBytes;
});
const resourcePercent = computed<number>(() => {
  if (prepTotalBytes.value === 0) return 100;
  return phasePercent(prepCompletedBytes.value, prepTotalBytes.value);
});
// 下载对象只是组装输入；本地资源以证据落盘后的组装字节为准，收尾阶段预留 50% 权重。
const progressPercent = computed<number>(() => {
  if (task.commitTotalCount === 0) return resourcePercent.value;
  if (task.assemblyTotalCount === 0) return audioCommitPercent.value;
  return resourcePercent.value * 0.5 + audioCommitPercent.value * 0.5;
});
const resourceStatus = computed<string | null>(() => {
  if (task.assemblyTotalBytes === 0) {
    return active.value && task.state === gameEnum.package.taskState.QUEUED
      ? "正在准备：等待下载阶段开始"
      : "无需组装";
  }
  if (assemblyComplete.value) return "已完成";
  // 当前下载/组装文件已移入吞吐面板对应指标的副标题，这里只保留阶段文案。
  if (gameEnum.package.taskApplying(task.state)) return task.currentFile;
  if (active.value) {
    if (downloadComplete.value) return "准备校验本地资源";
    return "正在获取并组装配音文件";
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
  return [`当前耗时 ${formatElapsed(displayElapsedMs.value)}`];
});
const resourceFacts = computed<Array<string>>(() => {
  const facts = [
    `准备 ${formatBytes(prepCompletedBytes.value)} / ${formatBytes(prepTotalBytes.value)}`,
    `文件 ${task.assemblyCompletedCount} / ${task.assemblyTotalCount}`,
  ];
  if (task.totalBytes > 0) {
    facts.push(`下载 ${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`);
  }
  if (task.assemblyTotalBytes > 0) {
    facts.push(
      `组装 ${formatBytes(task.assemblyCompletedBytes)} / ${formatBytes(task.assemblyTotalBytes)}`,
    );
  }
  if (task.deleteTotalBytes > 0) {
    facts.push(
      `删除 ${formatBytes(task.deleteCompletedBytes)} / ${formatBytes(task.deleteTotalBytes)}`,
    );
  }
  return facts;
});
const resourceRow = computed<ProgressRow>(() => ({
  label: "资源准备",
  percent: resourcePercent.value,
  indeterminate:
    task.assemblyTotalBytes === 0 &&
    active.value &&
    task.state === gameEnum.package.taskState.QUEUED,
  complete: assemblyComplete.value,
  status: resourceStatus.value,
  details: task.assemblyTotalBytes === 0 ? ["没有需要组装的游戏文件"] : resourceFacts.value,
  downloadObjectStatus:
    task.assemblyTotalBytes === 0 ? null : `下载对象 ${task.completedCount} / ${task.totalCount}`,
  activeAssemblyCount: task.activeAssemblyCount,
}));
const commitRow = computed<ProgressRow>(() => ({
  label: "提交",
  percent: audioCommitPercent.value,
  indeterminate: task.commitTotalCount === 0 && gameEnum.package.taskApplying(task.state),
  complete: task.commitTotalCount > 0 && audioCommitPercent.value >= 100,
  // 提交步骤文本与下方事实行重复，行首右侧不再单独展示。
  status: null,
  details: [
    ...(task.verificationTotalCount > 0
      ? [`复验 ${task.verificationCompletedCount} / ${task.verificationTotalCount}`]
      : []),
    `提交文件 ${task.commitCompletedCount} / ${task.commitTotalCount}`,
  ],
  downloadObjectStatus: null,
  activeAssemblyCount: 0,
}));
const overallRow = computed<ProgressRow>(() => ({
  label: "总进度",
  percent: progressPercent.value,
  indeterminate: task.assemblyTotalBytes === 0 && active.value,
  complete: resourcePercent.value >= 100 && commitComplete.value,
  status: overallFacts.value.join(" · "),
  details: [
    `资源准备 ${formatBytes(prepCompletedBytes.value)} / ${formatBytes(prepTotalBytes.value)}`,
    task.commitTotalCount > 0
      ? `资源准备 ${resourcePercent.value.toFixed(0)}% · 提交 ${audioCommitPercent.value.toFixed(0)}%`
      : `资源准备 ${resourcePercent.value.toFixed(0)}%`,
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
