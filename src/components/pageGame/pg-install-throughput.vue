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
  at: number;
  download: number;
  assembly: number;
  spool: number;
};

type SampleMetric = "download" | "assembly" | "spool";

type ChartPoint = { x: number; y: number };

const { task } = defineProps<Props>();
const chartWidth = 600;
const chartHeight = 120;
const sampleLimit = 60;
const windowMs = (sampleLimit - 1) * 1000;
const pixelPerMs = chartWidth / windowMs;
const chartGridLines = [0, 30, 60, 90, 120];
const samples = ref<Array<ThroughputSample>>([]);
const clockTick = ref<number>(0);
const frameNow = ref<number>(performance.now());
const displaySpeedMaximum = ref<number>(1);
const displaySpoolMaximum = ref<number>(1);
const downloadCompletedAt = ref<number | null>(null);
const assemblyCompletedAt = ref<number | null>(null);
const spoolReleasedAt = ref<number | null>(null);
let sampleTimer: ReturnType<typeof setInterval> | null = null;
let frameHandle: number | null = null;
let lastFrameAt: number | null = null;

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
const renderActive = computed<boolean>(() => {
  return downloadChartVisible.value || assemblyChartVisible.value || spoolChartVisible.value;
});
const assemblyRunning = computed<boolean>(
  () => task.state === gameEnum.package.taskState.ASSEMBLING,
);
const speedSampleMaximum = computed<number>(() => {
  let value = Math.max(currentDownloadSpeed.value, currentAssemblySpeed.value);
  for (const sample of samples.value) {
    value = Math.max(value, sample.download, sample.assembly);
  }
  return value;
});
const spoolSampleMaximum = computed<number>(() => {
  let value = currentSpoolBytes.value;
  for (const sample of samples.value) {
    value = Math.max(value, sample.spool);
  }
  return value;
});
const speedTargetMaximum = computed<number>(() => chartMaximum(speedSampleMaximum.value));
const spoolTargetMaximum = computed<number>(() => chartMaximum(spoolSampleMaximum.value));
const speedScaleLabel = computed<string>(() =>
  speedSampleMaximum.value > 0 ? formatSpeed(displaySpeedMaximum.value) : "等待采样",
);
const spoolScaleLabel = computed<string>(() =>
  spoolSampleMaximum.value > 0 ? formatBytes(displaySpoolMaximum.value) : "等待采样",
);
const downloadLinePath = computed<string>(() => smoothLinePath(metricPoints("download")));
const assemblyLinePath = computed<string>(() => smoothLinePath(metricPoints("assembly")));
const spoolLinePath = computed<string>(() => smoothLinePath(metricPoints("spool")));
const downloadAreaPath = computed<string>(() => smoothAreaPath(metricPoints("download")));
const assemblyAreaPath = computed<string>(() => smoothAreaPath(metricPoints("assembly")));
const downloadRemaining = computed<string>(() => {
  if (downloadDone.value) return task.totalBytes === 0 ? "已使用缓存" : "下载完成";
  if (task.etaSeconds === null) {
    return task.bytesPerSecond === 0 ? "下载剩余 等待首个分片" : "下载剩余 计算中";
  }
  return `下载剩余 ${formatDuration(task.etaSeconds)}`;
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
const downloadSubtitle = computed<string>(() => task.downloadCurrentFile ?? "");
const assemblyTitle = computed<string>(() => `写入预估 · ${assemblyRemaining.value}`);
const assemblySubtitle = computed<string>(() => task.assemblyCurrentFile ?? "");
const chartAriaLabel = computed<string>(() => {
  return `最近 60 秒趋势，下载 ${formatSpeed(currentDownloadSpeed.value)}，写入预估 ${formatSpeed(currentAssemblySpeed.value)}，当前私有临时空间 ${formatBytes(currentSpoolBytes.value)}`;
});

watch(
  () => task.taskId,
  () => {
    samples.value = [];
    displaySpeedMaximum.value = speedTargetMaximum.value;
    displaySpoolMaximum.value = spoolTargetMaximum.value;
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

watch(renderActive, (active) => {
  if (active) startRenderLoop();
  else stopRenderLoop();
});

onMounted(() => {
  sampleTimer = setInterval(() => {
    clockTick.value += 1;
    appendSample();
  }, 1000);
  if (renderActive.value) startRenderLoop();
});

onUnmounted(() => {
  if (sampleTimer !== null) clearInterval(sampleTimer);
  stopRenderLoop();
});

function appendSample(): void {
  const at = performance.now();
  const next: ThroughputSample = {
    at,
    download: currentDownloadSpeed.value,
    assembly: currentAssemblySpeed.value,
    spool: currentSpoolBytes.value,
  };
  const cutoff = at - windowMs - 2000;
  const retained = samples.value.filter((sample) => sample.at >= cutoff);
  samples.value = [...retained.slice(-(sampleLimit - 1)), next];
}

function startRenderLoop(): void {
  if (frameHandle !== null) return;
  frameHandle = requestAnimationFrame(renderFrame);
}

function stopRenderLoop(): void {
  if (frameHandle === null) return;
  cancelAnimationFrame(frameHandle);
  frameHandle = null;
  lastFrameAt = null;
}

function renderFrame(time: number): void {
  frameHandle = null;
  // 帧间隔截断，页面从后台恢复时 y 轴缓动不会一帧跳变。
  const elapsed = lastFrameAt === null ? 0 : Math.min(100, time - lastFrameAt);
  lastFrameAt = time;
  frameNow.value = time;
  displaySpeedMaximum.value = easeMaximum(
    displaySpeedMaximum.value,
    speedTargetMaximum.value,
    elapsed,
  );
  displaySpoolMaximum.value = easeMaximum(
    displaySpoolMaximum.value,
    spoolTargetMaximum.value,
    elapsed,
  );
  if (renderActive.value) startRenderLoop();
}

// 放大快、缩小慢：尖峰尽快腾出空间，样本滑出窗口后缓慢回落，避免来回抖动。
function easeMaximum(current: number, target: number, elapsedMs: number): number {
  if (target === current || elapsedMs === 0) return current;
  const tau = target > current ? 240 : 1200;
  const next = current + (target - current) * (1 - Math.exp(-elapsedMs / tau));
  return Math.abs(target - next) <= target * 0.001 ? target : next;
}

function metricPoints(metric: SampleMetric): Array<ChartPoint> {
  const now = frameNow.value;
  const points = samples.value.map((sample) => samplePoint(sample, metric, now));
  points.push(headPoint(metric));
  return points;
}

function samplePoint(sample: ThroughputSample, metric: SampleMetric, now: number): ChartPoint {
  const x = chartWidth - (now - sample.at) * pixelPerMs;
  const maximum = metric === "spool" ? displaySpoolMaximum.value : displaySpeedMaximum.value;
  const ratio = Math.min(1, sample[metric] / maximum);
  return { x, y: chartHeight - ratio * chartHeight };
}

// 头部点取实时值并固定在右缘，采样点随时间向左滑动，形成连续移动的曲线。
function headPoint(metric: SampleMetric): ChartPoint {
  const value =
    metric === "download"
      ? currentDownloadSpeed.value
      : metric === "assembly"
        ? currentAssemblySpeed.value
        : currentSpoolBytes.value;
  const maximum = metric === "spool" ? displaySpoolMaximum.value : displaySpeedMaximum.value;
  const ratio = Math.min(1, value / maximum);
  return { x: chartWidth, y: chartHeight - ratio * chartHeight };
}

// Catmull-Rom 转三次贝塞尔，让折线成为经过每个采样点的平滑曲线。
function smoothLinePath(points: Array<ChartPoint>): string {
  if (points.length === 0) return "";
  let path = `M ${formatPoint(points[0])}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    path += ` ${curveSegment(points, index)}`;
  }
  return path;
}

function smoothAreaPath(points: Array<ChartPoint>): string {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  let path = `M ${first.x.toFixed(2)} ${chartHeight} L ${formatPoint(first)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    path += ` ${curveSegment(points, index)}`;
  }
  return `${path} L ${last.x.toFixed(2)} ${chartHeight} Z`;
}

function curveSegment(points: Array<ChartPoint>, index: number): string {
  const previous = points[Math.max(0, index - 1)];
  const current = points[index];
  const next = points[index + 1];
  const after = points[Math.min(points.length - 1, index + 2)];
  const control1: ChartPoint = {
    x: current.x + (next.x - previous.x) / 6,
    y: current.y + (next.y - previous.y) / 6,
  };
  const control2: ChartPoint = {
    x: next.x - (after.x - current.x) / 6,
    y: next.y - (after.y - current.y) / 6,
  };
  return `C ${formatPoint(control1)} ${formatPoint(control2)} ${formatPoint(next)}`;
}

function formatPoint(point: ChartPoint): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
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
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-panel-bg, var(--box-bg-1));
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
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-subpanel-bg, var(--box-bg-2));

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
  border: var(--game-page-cover-border, 0);
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-panel-bg, var(--box-bg-1));
}
</style>
