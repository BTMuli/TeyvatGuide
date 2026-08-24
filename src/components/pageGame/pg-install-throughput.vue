<template>
  <section class="install-throughput" aria-label="安装下载与写入速度" aria-live="off">
    <div class="install-throughput-metrics">
      <div class="install-throughput-metric">
        <span class="install-throughput-dot download" aria-hidden="true" />
        <span>下载</span>
        <strong>{{ formatSpeed(currentDownloadSpeed) }}</strong>
        <small>{{ downloadRemaining }}</small>
      </div>
      <div class="install-throughput-metric">
        <span class="install-throughput-dot assembly" aria-hidden="true" />
        <span>写入预估</span>
        <strong>{{ formatSpeed(currentAssemblySpeed) }}</strong>
        <small>{{ assemblyRemaining }}</small>
      </div>
    </div>

    <div class="install-throughput-chart">
      <svg :aria-label="chartAriaLabel" preserveAspectRatio="none" role="img" viewBox="0 0 600 120">
        <line
          v-for="gridY in chartGridLines"
          :key="gridY"
          :x1="0"
          :x2="chartWidth"
          :y1="gridY"
          :y2="gridY"
          class="install-throughput-grid"
        />
        <path :d="downloadAreaPath" class="install-throughput-area download" />
        <path :d="assemblyAreaPath" class="install-throughput-area assembly" />
        <path :d="downloadLinePath" class="install-throughput-line download" />
        <path :d="assemblyLinePath" class="install-throughput-line assembly" />
      </svg>
      <span class="install-throughput-scale">{{ chartScaleLabel }}</span>
      <span class="install-throughput-window">最近 60 秒</span>
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

type SampleMetric = "download" | "assembly";

const { task } = defineProps<Props>();
const chartWidth = 600;
const chartHeight = 120;
const sampleLimit = 60;
const chartGridLines = [0, 30, 60, 90, 120];
const samples = ref<Array<ThroughputSample>>([]);
let sampleTimer: ReturnType<typeof setInterval> | null = null;

const throughputActive = computed<boolean>(
  () => task.state === gameEnum.package.taskState.DOWNLOADING,
);
const currentDownloadSpeed = computed<number>(() =>
  throughputActive.value ? task.bytesPerSecond : 0,
);
const currentAssemblySpeed = computed<number>(() =>
  throughputActive.value ? task.assemblyBytesPerSecond : 0,
);
const sampleMaximum = computed<number>(() => {
  return samples.value.reduce(
    (value, sample) => Math.max(value, sample.download, sample.assembly),
    0,
  );
});
const chartMaximum = computed<number>(() =>
  sampleMaximum.value > 0 ? 2 ** Math.ceil(Math.log2(sampleMaximum.value)) : 1,
);
const chartScaleLabel = computed<string>(() =>
  sampleMaximum.value > 0 ? formatSpeed(chartMaximum.value) : "等待采样",
);
const downloadLinePath = computed<string>(() => createLinePath("download"));
const assemblyLinePath = computed<string>(() => createLinePath("assembly"));
const downloadAreaPath = computed<string>(() => createAreaPath("download"));
const assemblyAreaPath = computed<string>(() => createAreaPath("assembly"));
const downloadRemaining = computed<string>(() => {
  if (task.totalBytes > 0 && task.downloadedBytes >= task.totalBytes) return "下载完成";
  return task.etaSeconds === null
    ? "下载剩余 计算中"
    : `下载剩余 ${formatDuration(task.etaSeconds)}`;
});
const assemblyRemaining = computed<string>(() => {
  if (task.assemblyTotalBytes > 0 && task.assemblyCompletedBytes >= task.assemblyTotalBytes) {
    return "组装完成";
  }
  if (task.assemblyEtaSeconds === null) {
    return task.assemblyBytesPerSecond > 0 ? "组装剩余 计算中" : "组装剩余 等待首个样本";
  }
  return `组装剩余 ${formatDuration(task.assemblyEtaSeconds)}`;
});
const chartAriaLabel = computed<string>(() => {
  return `最近 60 秒速度，下载 ${formatSpeed(currentDownloadSpeed.value)}，写入预估 ${formatSpeed(currentAssemblySpeed.value)}`;
});

watch(
  () => task.taskId,
  () => {
    samples.value = [];
    appendSample();
  },
  { immediate: true },
);

onMounted(() => {
  sampleTimer = setInterval(appendSample, 1000);
});

onUnmounted(() => {
  if (sampleTimer !== null) clearInterval(sampleTimer);
});

function appendSample(): void {
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
  const ratio = Math.min(1, sample[metric] / chartMaximum.value);
  return { x, y: chartHeight - ratio * chartHeight };
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
.install-throughput {
  display: grid;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  gap: 8px;
}

.install-throughput-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.install-throughput-metric {
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
    color: var(--box-text-2);
    font-size: 10px;
    grid-column: 2 / 4;
    line-height: 14px;
  }
}

.install-throughput-dot {
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

.install-throughput-chart {
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

.install-throughput-grid {
  stroke: var(--common-shadow-1);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.install-throughput-area {
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

.install-throughput-line {
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

.install-throughput-scale,
.install-throughput-window {
  position: absolute;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 14px;
  pointer-events: none;
}

.install-throughput-scale {
  top: 4px;
  right: 4px;
}

.install-throughput-window {
  right: 4px;
  bottom: 4px;
}
</style>
