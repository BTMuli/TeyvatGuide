<!-- 配音包任务的下载速度、组装速度/计数与实时 SVG 趋势图 -->
<template>
  <section class="audio-throughput" aria-label="配音包下载与组装进度" aria-live="off">
    <div class="audio-throughput-metrics">
      <div class="audio-throughput-metric">
        <span class="audio-throughput-dot download" aria-hidden="true" />
        <span>{{ downloadTitle }}</span>
        <strong>{{ formatSpeed(currentDownloadSpeed) }}</strong>
        <small>{{ downloadSubtitle }}</small>
      </div>
      <div class="audio-throughput-metric">
        <span class="audio-throughput-dot assembly" aria-hidden="true" />
        <span>{{ assemblyTitle }}</span>
        <strong>{{ formatSpeed(currentAssemblySpeed) }}</strong>
        <small>{{ assemblySubtitle }}</small>
      </div>
      <div v-if="task.deleteTotalBytes > 0" class="audio-throughput-metric">
        <span class="audio-throughput-dot delete" aria-hidden="true" />
        <span>删除</span>
        <strong>{{ formatSpeed(deleteSpeed) }}</strong>
        <small>{{ deleteFacts }}</small>
      </div>
    </div>

    <div class="audio-throughput-chart">
      <svg :aria-label="chartAriaLabel" preserveAspectRatio="none" role="img" viewBox="0 0 600 120">
        <line
          v-for="gridY in chartGridLines"
          :key="gridY"
          :x1="0"
          :x2="chartWidth"
          :y1="gridY"
          :y2="gridY"
          class="audio-throughput-grid"
        />
        <path
          v-if="downloadChartVisible"
          :d="downloadAreaPath"
          class="audio-throughput-area download"
        />
        <path :d="assemblyAreaPath" class="audio-throughput-area assembly" />
        <path
          v-if="downloadChartVisible"
          :d="downloadLinePath"
          class="audio-throughput-line download"
        />
        <path :d="assemblyLinePath" class="audio-throughput-line assembly" />
        <path v-if="deleteChartVisible" :d="deleteAreaPath" class="audio-throughput-area delete" />
        <path v-if="deleteChartVisible" :d="deleteLinePath" class="audio-throughput-line delete" />
      </svg>
      <span class="audio-throughput-scale">速度 {{ speedScaleLabel }}</span>
      <span class="audio-throughput-window">最近 60 秒</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

type Props = {
  task: TGApp.Game.Package.TaskSummary;
};

type ThroughputSample = {
  download: number;
  assembly: number;
  delete: number;
};

type SampleMetric = "download" | "assembly" | "delete";

const { task } = defineProps<Props>();
const chartWidth = 600;
const chartHeight = 120;
const sampleLimit = 60;
const chartGridLines = [0, 30, 60, 90, 120];
const samples = ref<Array<ThroughputSample>>([]);
const previousDeleteBytes = ref<number>(task.deleteCompletedBytes);
const deleteSpeed = ref<number>(0);
const clockTick = ref<number>(0);
const downloadCompletedAt = ref<number | null>(null);
const deleteCompletedAt = ref<number | null>(null);
let sampleTimer: ReturnType<typeof setInterval> | null = null;

const downloadActive = computed<boolean>(
  () => task.state === gameEnum.package.taskState.DOWNLOADING,
);
// 下载与组装在流水线中并行推进，组装阶段仍需持续采样写入速度与剩余时间。
const assemblyActive = computed<boolean>(() => {
  return (
    task.state === gameEnum.package.taskState.DOWNLOADING ||
    task.state === gameEnum.package.taskState.ASSEMBLING
  );
});
const currentDownloadSpeed = computed<number>(() =>
  downloadActive.value ? task.bytesPerSecond : 0,
);
const currentAssemblySpeed = computed<number>(() =>
  assemblyActive.value ? task.assemblyBytesPerSecond : 0,
);
const downloadDone = computed<boolean>(() => {
  return task.totalBytes > 0 && task.downloadedBytes >= task.totalBytes;
});
const deleteDone = computed<boolean>(() => {
  return task.deleteTotalBytes > 0 && task.deleteCompletedBytes >= task.deleteTotalBytes;
});
const elapsedDownloadDone = computed<number>(() => {
  void clockTick.value;
  return downloadCompletedAt.value === null ? 0 : Date.now() - downloadCompletedAt.value;
});
const elapsedDeleteDone = computed<number>(() => {
  void clockTick.value;
  return deleteCompletedAt.value === null ? 0 : Date.now() - deleteCompletedAt.value;
});
// 下载/删除完成后保留 5 秒趋势示意，之后从 SVG 中移除对应曲线。
const downloadChartVisible = computed<boolean>(() => elapsedDownloadDone.value < 5000);
const deleteChartVisible = computed<boolean>(() => {
  return task.deleteTotalBytes > 0 && elapsedDeleteDone.value < 5000;
});
const assemblyRunning = computed<boolean>(
  () => task.state === gameEnum.package.taskState.ASSEMBLING,
);
const deleteFacts = computed<string>(() => {
  const remainingBytes = Math.max(0, task.deleteTotalBytes - task.deleteCompletedBytes);
  const parts = [
    `已删除 ${formatBytes(task.deleteCompletedBytes)} / ${formatBytes(task.deleteTotalBytes)}`,
  ];
  if (remainingBytes === 0) {
    parts.push("删除完成");
  } else if (deleteSpeed.value > 0) {
    parts.push(`删除剩余 ${formatDuration(Math.ceil(remainingBytes / deleteSpeed.value))}`);
  } else {
    parts.push("删除剩余 等待首个样本");
  }
  return parts.join(" · ");
});
const speedSampleMaximum = computed<number>(() => {
  return samples.value.reduce(
    (value, sample) => Math.max(value, sample.download, sample.assembly, sample.delete),
    0,
  );
});
const speedChartMaximum = computed<number>(() => chartMaximum(speedSampleMaximum.value));
const speedScaleLabel = computed<string>(() =>
  speedSampleMaximum.value > 0 ? formatSpeed(speedChartMaximum.value) : "等待采样",
);
const downloadLinePath = computed<string>(() => createLinePath("download"));
const assemblyLinePath = computed<string>(() => createLinePath("assembly"));
const downloadAreaPath = computed<string>(() => createAreaPath("download"));
const assemblyAreaPath = computed<string>(() => createAreaPath("assembly"));
const deleteLinePath = computed<string>(() => createLinePath("delete"));
const deleteAreaPath = computed<string>(() => createAreaPath("delete"));
const downloadRemaining = computed<string>(() => {
  if (task.totalBytes > 0 && task.downloadedBytes >= task.totalBytes) return "下载完成";
  return task.etaSeconds === null
    ? "下载剩余 计算中"
    : `下载剩余 ${formatDuration(task.etaSeconds)}`;
});
// 剩余时间并入标题，当前下载文件显示在副标题。
const downloadTitle = computed<string>(() => `下载 · ${downloadRemaining.value}`);
const downloadSubtitle = computed<string>(() => {
  if (task.downloadCurrentFile === null) return "";
  return task.downloadCurrentFile
    .replace(/^游戏文件：/, "")
    .replace(/^资源对象：/, "")
    .replace(/^渠道 SDK：/, "");
});
const assemblyFacts = computed<string>(() => {
  const parts: Array<string> = [];
  if (task.assemblyTotalCount > 0) {
    parts.push(`当前 ${task.activeAssemblyCount} 个`);
  }
  if (task.assemblyTotalBytes > 0 && task.assemblyCompletedBytes >= task.assemblyTotalBytes) {
    parts.push("组装完成");
  } else if (task.assemblyEtaSeconds === null) {
    parts.push(
      assemblyRunning.value || task.assemblyBytesPerSecond > 0
        ? "组装剩余 计算中"
        : "组装剩余 等待首个样本",
    );
  } else {
    parts.push(`组装剩余 ${formatDuration(task.assemblyEtaSeconds)}`);
  }
  return parts.join(" · ");
});
// 组装计数与剩余时间并入标题，当前组装文件显示在副标题（去掉“正在组装：”前缀）。
const assemblyTitle = computed<string>(() => `组装 · ${assemblyFacts.value}`);
const assemblySubtitle = computed<string>(() => {
  if (task.assemblyCurrentFile === null) return "";
  // Rust 组装中返回“正在组装：”，单个资源完成后返回“已组装 X/Y：”，统一剥离。
  return task.assemblyCurrentFile.replace(/^(正在组装|已组装 \d+\/\d+)：/, "");
});
const chartAriaLabel = computed<string>(() => {
  const parts = [
    `最近 60 秒趋势，下载 ${formatSpeed(currentDownloadSpeed.value)}`,
    `组装 ${formatSpeed(currentAssemblySpeed.value)}`,
    `当前组装 ${task.activeAssemblyCount} 个`,
  ];
  if (task.deleteTotalBytes > 0) {
    parts.push(`删除 ${formatSpeed(deleteSpeed.value)}`);
  }
  return parts.join("，");
});

watch(
  () => task.taskId,
  () => {
    samples.value = [];
    downloadCompletedAt.value = null;
    deleteCompletedAt.value = null;
    appendSample();
  },
  { immediate: true },
);

watch(
  [downloadDone, deleteDone],
  ([downloaded, deleted]) => {
    if (downloaded && downloadCompletedAt.value === null) downloadCompletedAt.value = Date.now();
    if (deleted && deleteCompletedAt.value === null) deleteCompletedAt.value = Date.now();
  },
  // 组件可能在其他阶段挂载（如刷新后重连任务），完成态需立即生效而非等状态翻转。
  { immediate: true },
);

onMounted(() => {
  sampleTimer = setInterval(() => {
    clockTick.value += 1;
    appendSample();
  }, 1000);
});

onUnmounted(() => {
  if (sampleTimer !== null) clearInterval(sampleTimer);
});

function appendSample(): void {
  const currentDeleteBytes = task.deleteCompletedBytes;
  deleteSpeed.value = Math.max(0, currentDeleteBytes - previousDeleteBytes.value);
  previousDeleteBytes.value = currentDeleteBytes;
  const next: ThroughputSample = {
    download: currentDownloadSpeed.value,
    assembly: currentAssemblySpeed.value,
    delete: deleteSpeed.value,
  };
  samples.value = [...samples.value.slice(-(sampleLimit - 1)), next];
}

function createLinePath(metric: SampleMetric): string {
  if (samples.value.length === 0) return "";
  return samples.value
    .map((sample, index) => {
      const point = samplePoint(sample, index, metric);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function createAreaPath(metric: SampleMetric): string {
  if (samples.value.length === 0) return "";
  const first = samplePoint(samples.value[0], 0, metric);
  const last = samplePoint(
    samples.value[samples.value.length - 1],
    samples.value.length - 1,
    metric,
  );
  const points = samples.value
    .map((sample, index) => {
      const point = samplePoint(sample, index, metric);
      return `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
  return `M ${first.x.toFixed(2)} ${chartHeight} ${points} L ${last.x.toFixed(2)} ${chartHeight} Z`;
}

function samplePoint(
  sample: ThroughputSample,
  index: number,
  metric: SampleMetric,
): { x: number; y: number } {
  const step = chartWidth / (sampleLimit - 1);
  const x = chartWidth - (samples.value.length - 1 - index) * step;
  const ratio = Math.min(1, sample[metric] / speedChartMaximum.value);
  return { x, y: chartHeight - ratio * chartHeight };
}

function chartMaximum(value: number): number {
  return value > 0 ? 2 ** Math.ceil(Math.log2(value)) : 1;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
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
</script>

<style lang="scss" scoped>
.audio-throughput {
  display: grid;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  gap: 8px;
}

.audio-throughput-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.audio-throughput-metric {
  display: grid;
  min-width: 180px;
  flex: 1 1 220px;
  align-items: center;
  color: var(--box-text-2);
  column-gap: 6px;
  font-size: 11px;
  grid-template-columns: 8px auto 1fr;
  line-height: 15px;

  strong {
    color: var(--common-text-title);
    font-size: 12px;
    font-weight: normal;
    justify-self: end;
    line-height: 16px;
  }

  small {
    overflow: hidden;
    min-height: 14px;
    color: var(--box-text-2);
    font-size: 10px;
    grid-column: 2 / 4;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.audio-throughput-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;

  &.download {
    background: var(--tgc-od-blue);
  }

  &.assembly {
    background: var(--tgc-od-green);
  }

  &.delete {
    background: var(--tgc-od-red);
  }
}

.audio-throughput-chart {
  position: relative;
  overflow: hidden;
  height: 104px;
  border-radius: 4px;
  background: var(--box-bg-2);

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
}

.audio-throughput-grid {
  stroke: var(--common-shadow-1);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.audio-throughput-area {
  stroke: none;

  &.download {
    fill: var(--tgc-od-blue);
    opacity: 0.12;
  }

  &.assembly {
    fill: var(--tgc-od-green);
    opacity: 0.1;
  }

  &.delete {
    fill: var(--tgc-od-red);
    opacity: 0.08;
  }
}

.audio-throughput-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;

  &.download {
    stroke: var(--tgc-od-blue);
  }

  &.assembly {
    stroke: var(--tgc-od-green);
  }

  &.delete {
    stroke: var(--tgc-od-red);
    stroke-dasharray: 4 3;
  }
}

.audio-throughput-scale,
.audio-throughput-window {
  position: absolute;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 14px;
  pointer-events: none;
}

.audio-throughput-scale {
  top: 4px;
  left: 4px;
}

.audio-throughput-window {
  right: 4px;
  bottom: 4px;
}
</style>
