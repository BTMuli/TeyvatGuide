<!-- 正式更新与预下载任务的缓存下载、事务组装实时趋势图 -->
<template>
  <section class="update-throughput" aria-label="更新资源下载与组装进度" aria-live="off">
    <div class="update-throughput-metrics">
      <div class="update-throughput-metric">
        <span class="update-throughput-dot download" aria-hidden="true" />
        <span>{{ downloadTitle }}</span>
        <strong>{{ formatSpeed(currentDownloadSpeed) }}</strong>
        <small :title="downloadSubtitle">{{ downloadSubtitle }}</small>
      </div>
      <div class="update-throughput-metric">
        <span class="update-throughput-dot assembly" aria-hidden="true" />
        <span>{{ assemblyTitle }}</span>
        <strong>{{ formatSpeed(currentAssemblySpeed) }}</strong>
        <small :title="assemblySubtitle">{{ assemblySubtitle }}</small>
      </div>
    </div>

    <div class="update-throughput-chart">
      <svg :aria-label="chartAriaLabel" preserveAspectRatio="none" role="img" viewBox="0 0 600 120">
        <line
          v-for="gridY in chartGridLines"
          :key="gridY"
          :x1="0"
          :x2="chartWidth"
          :y1="gridY"
          :y2="gridY"
          class="update-throughput-grid"
        />
        <path
          v-if="downloadChartVisible"
          :d="downloadAreaPath"
          class="update-throughput-area download"
        />
        <path
          v-if="assemblyChartVisible"
          :d="assemblyAreaPath"
          class="update-throughput-area assembly"
        />
        <path
          v-if="downloadChartVisible"
          :d="downloadLinePath"
          class="update-throughput-line download"
        />
        <path
          v-if="assemblyChartVisible"
          :d="assemblyLinePath"
          class="update-throughput-line assembly"
        />
      </svg>
      <span class="update-throughput-scale">速度 {{ speedScaleLabel }}</span>
      <span class="update-throughput-window">最近 60 秒</span>
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
};

type SampleMetric = keyof ThroughputSample;

const { task } = defineProps<Props>();
const chartWidth = 600;
const chartHeight = 120;
const sampleLimit = 60;
const chartGridLines = [0, 30, 60, 90, 120];
const samples = ref<Array<ThroughputSample>>([]);
const previousAssemblyBytes = ref<number>(task.assemblyCompletedBytes);
const sampledAssemblySpeed = ref<number>(0);
const clockTick = ref<number>(0);
const downloadCompletedAt = ref<number | null>(null);
const assemblyCompletedAt = ref<number | null>(null);
let sampleTimer: ReturnType<typeof setInterval> | null = null;

const downloadActive = computed<boolean>(
  () => task.state === gameEnum.package.taskState.DOWNLOADING,
);
const assemblyActive = computed<boolean>(
  () => task.state === gameEnum.package.taskState.ASSEMBLING,
);
const currentDownloadSpeed = computed<number>(() =>
  downloadActive.value ? task.bytesPerSecond : 0,
);
const currentAssemblySpeed = computed<number>(() => {
  if (!assemblyActive.value) return 0;
  return task.assemblyBytesPerSecond > 0 ? task.assemblyBytesPerSecond : sampledAssemblySpeed.value;
});
const downloadDone = computed<boolean>(() => {
  if (task.totalBytes > 0) return task.downloadedBytes >= task.totalBytes;
  return phaseAfterDownload(task.state);
});
const assemblyDone = computed<boolean>(() => {
  if (task.assemblyTotalBytes > 0) {
    return task.assemblyCompletedBytes >= task.assemblyTotalBytes;
  }
  return phaseAfterAssembly(task.state);
});
const elapsedDownloadDone = computed<number>(() => {
  void clockTick.value;
  return downloadCompletedAt.value === null ? 0 : Date.now() - downloadCompletedAt.value;
});
const elapsedAssemblyDone = computed<number>(() => {
  void clockTick.value;
  return assemblyCompletedAt.value === null ? 0 : Date.now() - assemblyCompletedAt.value;
});
const downloadWasObserved = computed<boolean>(() => {
  return downloadActive.value || samples.value.some((sample) => sample.download > 0);
});
const assemblyWasObserved = computed<boolean>(() => {
  return assemblyActive.value || samples.value.some((sample) => sample.assembly > 0);
});
const downloadChartVisible = computed<boolean>(() => {
  return downloadWasObserved.value && elapsedDownloadDone.value < 5000;
});
const assemblyChartVisible = computed<boolean>(() => {
  return assemblyWasObserved.value && elapsedAssemblyDone.value < 5000;
});
const speedSampleMaximum = computed<number>(() => {
  return samples.value.reduce(
    (value, sample) => Math.max(value, sample.download, sample.assembly),
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
const downloadRemaining = computed<string>(() => {
  if (downloadDone.value) return "下载完成";
  return task.etaSeconds === null
    ? "下载剩余 计算中"
    : `下载剩余 ${formatDuration(task.etaSeconds)}`;
});
const downloadTitle = computed<string>(() => `下载 · ${downloadRemaining.value}`);
const downloadSubtitle = computed<string>(() => {
  if (task.downloadCurrentFile === null) {
    return downloadDone.value ? "资源已写入共享缓存" : "等待下载对象";
  }
  return task.downloadCurrentFile
    .replace(/^游戏文件：/, "")
    .replace(/^资源对象：/, "")
    .replace(/^渠道 SDK：/, "");
});
const assemblyRemaining = computed<string>(() => {
  if (task.assemblyTotalCount === 0 && !assemblyActive.value) return "等待应用";
  if (assemblyDone.value) return "组装完成";
  if (task.assemblyEtaSeconds !== null) {
    return `组装剩余 ${formatDuration(task.assemblyEtaSeconds)}`;
  }
  return currentAssemblySpeed.value > 0 ? "组装剩余 计算中" : "组装剩余 等待首个样本";
});
const assemblyTitle = computed<string>(() => `组装 · ${assemblyRemaining.value}`);
const assemblySubtitle = computed<string>(() => {
  if (task.assemblyCurrentFile !== null) {
    return task.assemblyCurrentFile.replace(/^(正在组装|已组装 \d+\/\d+)：/, "");
  }
  if (assemblyDone.value) return "事务资源已经组装";
  return assemblyActive.value ? "正在准备事务资源" : "游戏目录尚未修改";
});
const chartAriaLabel = computed<string>(() => {
  return `最近 60 秒趋势，下载 ${formatSpeed(currentDownloadSpeed.value)}，组装 ${formatSpeed(currentAssemblySpeed.value)}`;
});

watch(
  () => task.taskId,
  () => {
    samples.value = [];
    previousAssemblyBytes.value = task.assemblyCompletedBytes;
    sampledAssemblySpeed.value = 0;
    downloadCompletedAt.value = null;
    assemblyCompletedAt.value = null;
    appendSample();
  },
  { immediate: true },
);

watch(
  [downloadDone, assemblyDone],
  ([downloaded, assembled]) => {
    if (downloaded && downloadCompletedAt.value === null) downloadCompletedAt.value = Date.now();
    if (assembled && assemblyCompletedAt.value === null) assemblyCompletedAt.value = Date.now();
  },
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
  const currentAssemblyBytes = task.assemblyCompletedBytes;
  sampledAssemblySpeed.value = assemblyActive.value
    ? Math.max(0, currentAssemblyBytes - previousAssemblyBytes.value)
    : 0;
  previousAssemblyBytes.value = currentAssemblyBytes;
  const next: ThroughputSample = {
    download: currentDownloadSpeed.value,
    assembly: currentAssemblySpeed.value,
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

function phaseAfterAssembly(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === gameEnum.package.taskState.COMMIT_PREPARED ||
    state === gameEnum.package.taskState.COMMITTING ||
    state === gameEnum.package.taskState.VERIFYING ||
    state === gameEnum.package.taskState.PUBLISH_PENDING ||
    state === gameEnum.package.taskState.PUBLISHED ||
    state === gameEnum.package.taskState.VERIFIED ||
    state === gameEnum.package.taskState.REGISTRATION_PENDING ||
    state === gameEnum.package.taskState.REPAIR_REQUIRED ||
    state === gameEnum.package.taskState.COMPLETED
  );
}

function phaseAfterDownload(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    state === gameEnum.package.taskState.READY_TO_APPLY ||
    state === gameEnum.package.taskState.ASSEMBLING ||
    phaseAfterAssembly(state)
  );
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
.update-throughput {
  display: grid;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  gap: 8px;
}

.update-throughput-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.update-throughput-metric {
  display: grid;
  min-width: 180px;
  flex: 1 1 240px;
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
    min-width: 0;
    color: var(--box-text-2);
    font-size: 10px;
    grid-column: 2 / 4;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.update-throughput-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;

  &.download {
    background: var(--tgc-od-blue);
  }

  &.assembly {
    background: var(--tgc-od-green);
  }
}

.update-throughput-chart {
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

.update-throughput-grid {
  stroke: var(--common-shadow-1);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.update-throughput-area {
  stroke: none;

  &.download {
    fill: var(--tgc-od-blue);
    opacity: 0.12;
  }

  &.assembly {
    fill: var(--tgc-od-green);
    opacity: 0.1;
  }
}

.update-throughput-line {
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
}

.update-throughput-scale,
.update-throughput-window {
  position: absolute;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 14px;
  pointer-events: none;
}

.update-throughput-scale {
  top: 4px;
  left: 4px;
}

.update-throughput-window {
  right: 4px;
  bottom: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .update-throughput-line,
  .update-throughput-area {
    transition: none;
  }
}
</style>
