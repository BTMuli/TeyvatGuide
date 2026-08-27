<!-- 游戏本体安装任务的下载速度、写入预估与私有临时空间实时趋势图 -->
<template>
  <section class="install-throughput" aria-label="安装下载、写入与私有临时空间" aria-live="off">
    <div class="install-throughput-metrics">
      <div class="install-throughput-metric">
        <span class="install-throughput-dot download" aria-hidden="true" />
        <span>{{ downloadTitle }}</span>
        <strong>{{ formatSpeed(currentDownloadSpeed) }}</strong>
        <small>{{ downloadSubtitle }}</small>
      </div>
      <div class="install-throughput-metric">
        <span class="install-throughput-dot assembly" aria-hidden="true" />
        <span>{{ assemblyTitle }}</span>
        <strong>{{ formatSpeed(currentAssemblySpeed) }}</strong>
        <small>{{ assemblySubtitle }}</small>
      </div>
      <div class="install-throughput-metric">
        <span class="install-throughput-dot spool" aria-hidden="true" />
        <span>私有临时空间</span>
        <strong>{{ formatBytes(currentSpoolBytes) }}</strong>
        <small>已释放 {{ formatBytes(task.releasedBytes) }}</small>
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
        <path
          v-if="downloadChartVisible"
          :d="downloadAreaPath"
          class="install-throughput-area download"
        />
        <path
          v-if="assemblyChartVisible"
          :d="assemblyAreaPath"
          class="install-throughput-area assembly"
        />
        <path
          v-if="downloadChartVisible"
          :d="downloadLinePath"
          class="install-throughput-line download"
        />
        <path
          v-if="assemblyChartVisible"
          :d="assemblyLinePath"
          class="install-throughput-line assembly"
        />
        <path v-if="spoolChartVisible" :d="spoolLinePath" class="install-throughput-line spool" />
      </svg>
      <span class="install-throughput-scale speed">速度 {{ speedScaleLabel }}</span>
      <span class="install-throughput-scale spool">临时 {{ spoolScaleLabel }}</span>
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
  spool: number;
};

type SampleMetric = "download" | "assembly" | "spool";

const { task } = defineProps<Props>();
const chartWidth = 600;
const chartHeight = 120;
const sampleLimit = 60;
const chartGridLines = [0, 30, 60, 90, 120];
const samples = ref<Array<ThroughputSample>>([]);
const clockTick = ref<number>(0);
const downloadCompletedAt = ref<number | null>(null);
const assemblyCompletedAt = ref<number | null>(null);
const spoolReleasedAt = ref<number | null>(null);
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
const currentSpoolBytes = computed<number>(() => Math.max(0, task.spoolBytes));
const downloadDone = computed<boolean>(() => {
  if (task.totalBytes > 0) return task.downloadedBytes >= task.totalBytes;
  return (
    task.state !== gameEnum.package.taskState.QUEUED &&
    task.state !== gameEnum.package.taskState.DOWNLOADING
  );
});
const assemblyDone = computed<boolean>(() => {
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
const hasDownloadWork = computed<boolean>(() => {
  return task.totalBytes > 0 || task.state === gameEnum.package.taskState.DOWNLOADING;
});
const hasAssemblyWork = computed<boolean>(() => {
  return (
    task.assemblyTotalBytes > 0 ||
    task.assemblyTotalCount > 0 ||
    task.state === gameEnum.package.taskState.ASSEMBLING
  );
});
const downloadElapsedMs = computed<number>(() => {
  void clockTick.value;
  return downloadCompletedAt.value === null ? 0 : Date.now() - downloadCompletedAt.value;
});
const assemblyElapsedMs = computed<number>(() => {
  void clockTick.value;
  return assemblyCompletedAt.value === null ? 0 : Date.now() - assemblyCompletedAt.value;
});
const spoolElapsedMs = computed<number>(() => {
  void clockTick.value;
  return spoolReleasedAt.value === null ? 0 : Date.now() - spoolReleasedAt.value;
});
// 下载与组装完成后保留 5 秒趋势，避免阶段切换时曲线瞬间消失。
const downloadChartVisible = computed<boolean>(() => {
  return hasDownloadWork.value && downloadElapsedMs.value < 5000;
});
const assemblyChartVisible = computed<boolean>(() => {
  return hasAssemblyWork.value && assemblyElapsedMs.value < 5000;
});
const spoolChartVisible = computed<boolean>(() => {
  return currentSpoolBytes.value > 0 || spoolElapsedMs.value < 5000;
});
const assemblyRunning = computed<boolean>(
  () => task.state === gameEnum.package.taskState.ASSEMBLING,
);
const speedSampleMaximum = computed<number>(() => {
  return samples.value.reduce(
    (value, sample) => Math.max(value, sample.download, sample.assembly),
    0,
  );
});
const spoolSampleMaximum = computed<number>(() => {
  return samples.value.reduce((value, sample) => Math.max(value, sample.spool), 0);
});
const speedChartMaximum = computed<number>(() => chartMaximum(speedSampleMaximum.value));
const spoolChartMaximum = computed<number>(() => chartMaximum(spoolSampleMaximum.value));
const speedScaleLabel = computed<string>(() =>
  speedSampleMaximum.value > 0 ? formatSpeed(speedChartMaximum.value) : "等待采样",
);
const spoolScaleLabel = computed<string>(() =>
  spoolSampleMaximum.value > 0 ? formatBytes(spoolChartMaximum.value) : "等待采样",
);
const downloadLinePath = computed<string>(() => createLinePath("download"));
const assemblyLinePath = computed<string>(() => createLinePath("assembly"));
const spoolLinePath = computed<string>(() => createLinePath("spool"));
const downloadAreaPath = computed<string>(() => createAreaPath("download"));
const assemblyAreaPath = computed<string>(() => createAreaPath("assembly"));
const downloadRemaining = computed<string>(() => {
  if (downloadDone.value) return task.totalBytes === 0 ? "已使用缓存" : "下载完成";
  return task.etaSeconds === null
    ? "下载剩余 计算中"
    : `下载剩余 ${formatDuration(task.etaSeconds)}`;
});
const assemblyRemaining = computed<string>(() => {
  if (assemblyDone.value && !hasAssemblyWork.value) return "无需安装写入";
  if (assemblyDone.value) {
    return "组装完成";
  }
  if (task.assemblyEtaSeconds === null) {
    return assemblyRunning.value || task.assemblyBytesPerSecond > 0
      ? "组装剩余 计算中"
      : "组装剩余 等待首个样本";
  }
  return `组装剩余 ${formatDuration(task.assemblyEtaSeconds)}`;
});
const downloadTitle = computed<string>(() => `下载 · ${downloadRemaining.value}`);
const downloadSubtitle = computed<string>(() => {
  if (task.downloadCurrentFile === null) return "";
  return normalizeCurrentFile(task.downloadCurrentFile);
});
const assemblyTitle = computed<string>(() => `写入预估 · ${assemblyRemaining.value}`);
const assemblySubtitle = computed<string>(() => {
  if (task.assemblyCurrentFile === null) return "";
  return normalizeCurrentFile(task.assemblyCurrentFile);
});
const chartAriaLabel = computed<string>(() => {
  return `最近 60 秒趋势，下载 ${formatSpeed(currentDownloadSpeed.value)}，写入预估 ${formatSpeed(currentAssemblySpeed.value)}，当前私有临时空间 ${formatBytes(currentSpoolBytes.value)}`;
});

watch(
  () => task.taskId,
  () => {
    samples.value = [];
    downloadCompletedAt.value = downloadDone.value ? Date.now() : null;
    assemblyCompletedAt.value = assemblyDone.value ? Date.now() : null;
    spoolReleasedAt.value = currentSpoolBytes.value > 0 ? null : Date.now();
    appendSample();
  },
  { immediate: true },
);

watch(
  [downloadDone, assemblyDone],
  ([downloaded, assembled]) => {
    if (downloaded && downloadCompletedAt.value === null) {
      downloadCompletedAt.value = Date.now();
    }
    if (assembled && assemblyCompletedAt.value === null) {
      assemblyCompletedAt.value = Date.now();
    }
  },
  { immediate: true },
);

watch(
  currentSpoolBytes,
  (bytes) => {
    spoolReleasedAt.value = bytes > 0 ? null : (spoolReleasedAt.value ?? Date.now());
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
  const next: ThroughputSample = {
    download: currentDownloadSpeed.value,
    assembly: currentAssemblySpeed.value,
    spool: currentSpoolBytes.value,
  };
  samples.value = [...samples.value.slice(-(sampleLimit - 1)), next];
}

function normalizeCurrentFile(value: string): string {
  return value
    .replace(/^正在安装：/, "")
    .replace(/^正在组装：/, "")
    .replace(/^已组装 \d+\/\d+：/, "")
    .replace(/^\d+\/\d+ /, "")
    .replace(/^游戏文件：/, "")
    .replace(/^资源对象：/, "")
    .replace(/^资源文件：/, "")
    .replace(/^渠道 SDK：/, "")
    .replace(/^渠道 SDK$/, "")
    .replace(/^持续下载资源对象$/, "")
    .replace(/^持续队列已调度 \d+\/\d+ 个资源$/, "")
    .replace(/^正在获取资源$/, "")
    .replace(/^正在获取配音资源对象$/, "")
    .replace(/^正在恢复资源 \d+\/\d+：/, "")
    .replace(/^校验失败，重新获取资源 \d+\/\d+：/, "")
    .replace(/^自动修复完成：/, "")
    .trim();
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
  const maximum = metric === "spool" ? spoolChartMaximum.value : speedChartMaximum.value;
  const ratio = Math.min(1, sample[metric] / maximum);
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

  &.spool {
    background: var(--tgc-od-orange);
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

  &.spool {
    stroke: var(--tgc-od-orange);
    stroke-dasharray: 4 3;
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

.install-throughput-scale.speed {
  top: 4px;
  left: 4px;
}

.install-throughput-scale.spool {
  top: 4px;
  right: 4px;
}

.install-throughput-window {
  right: 4px;
  bottom: 4px;
}
</style>
