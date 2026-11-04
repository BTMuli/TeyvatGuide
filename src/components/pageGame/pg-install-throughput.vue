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
      <svg
        :aria-label="chartAriaLabel"
        preserveAspectRatio="none"
        role="img"
        :viewBox="chartViewBox"
      >
        <line
          v-for="gridY in chartGridLines"
          :key="gridY"
          :x1="0"
          :x2="chartWidth"
          :y1="gridY"
          :y2="gridY"
          class="install-throughput-grid"
        />
        <g :transform="speedTransform">
          <path
            v-if="downloadChartVisible"
            :d="downloadGeometry.area"
            class="install-throughput-area download"
          />
          <path
            v-if="assemblyChartVisible"
            :d="assemblyGeometry.area"
            class="install-throughput-area assembly"
          />
          <path
            v-if="downloadChartVisible"
            :d="downloadGeometry.line"
            class="install-throughput-line download"
          />
          <path
            v-if="assemblyChartVisible"
            :d="assemblyGeometry.line"
            class="install-throughput-line assembly"
          />
        </g>
        <g :transform="spoolTransform">
          <path
            v-if="spoolChartVisible"
            :d="spoolGeometry.line"
            class="install-throughput-line spool"
          />
        </g>
      </svg>
      <span class="install-throughput-scale speed">速度 {{ speedScaleLabel }}</span>
      <span class="install-throughput-scale spool">临时 {{ spoolScaleLabel }}</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import {
  appendThroughputSample,
  createThroughputAxis,
  retargetThroughputAxis,
  THROUGHPUT_CHART_BOTTOM,
  THROUGHPUT_CHART_HEIGHT,
  THROUGHPUT_CHART_WIDTH,
  THROUGHPUT_MINIMUM_SPEED_BYTES,
  THROUGHPUT_MINIMUM_SPOOL_BYTES,
  THROUGHPUT_SAMPLE_INTERVAL_MS,
  THROUGHPUT_WINDOW_MS,
  throughputAxisValue,
  throughputCeiling,
  throughputCurveSegments,
  throughputPaths,
} from "@utils/game/throughputChart.js";
import type {
  ThroughputAxis,
  ThroughputPaths,
  ThroughputSample,
} from "@utils/game/throughputChart.js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

type Props = {
  task: TGApp.Game.Package.TaskSummary;
};

type InstallThroughputSample = ThroughputSample & {
  download: number;
  assembly: number;
  spool: number;
};

type SampleMetric = "download" | "assembly" | "spool";

const { task } = defineProps<Props>();
const chartWidth = THROUGHPUT_CHART_WIDTH;
const chartHeight = THROUGHPUT_CHART_HEIGHT;
const chartBottom = THROUGHPUT_CHART_BOTTOM;
const chartViewBox = `0 0 ${chartWidth} ${chartHeight}`;
const chartGridLines: Array<number> = [0, 0.25, 0.5, 0.75, 1].map(
  (ratio) => chartBottom * (1 - ratio),
);
const samples = ref<Array<InstallThroughputSample>>([]);
const frameNow = ref<number>(performance.now());
const speedAxis = ref<ThroughputAxis>(
  createThroughputAxis(THROUGHPUT_MINIMUM_SPEED_BYTES, frameNow.value),
);
const spoolAxis = ref<ThroughputAxis>(
  createThroughputAxis(THROUGHPUT_MINIMUM_SPOOL_BYTES, frameNow.value),
);
const reducedMotion = ref<boolean>(false);
const clockTick = ref<number>(0);
const downloadCompletedAt = ref<number | null>(null);
const assemblyCompletedAt = ref<number | null>(null);
const spoolReleasedAt = ref<number | null>(null);
let sampleTimer: ReturnType<typeof setInterval> | null = null;
let frameHandle: number | null = null;
let motionQuery: MediaQueryList | null = null;

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
const speedPeak = computed<number>(() => {
  let value = 0;
  for (const sample of samples.value) {
    value = Math.max(value, sample.download, sample.assembly);
  }
  return value;
});
const spoolPeak = computed<number>(() => {
  let value = 0;
  for (const sample of samples.value) value = Math.max(value, sample.spool);
  return value;
});
const speedTargetMaximum = computed<number>(() =>
  throughputCeiling(speedPeak.value, THROUGHPUT_MINIMUM_SPEED_BYTES),
);
const spoolTargetMaximum = computed<number>(() =>
  throughputCeiling(spoolPeak.value, THROUGHPUT_MINIMUM_SPOOL_BYTES),
);
const displaySpeedMaximum = computed<number>(() =>
  throughputAxisValue(speedAxis.value, frameNow.value),
);
const displaySpoolMaximum = computed<number>(() =>
  throughputAxisValue(spoolAxis.value, frameNow.value),
);
const speedScaleLabel = computed<string>(() =>
  speedPeak.value > 0 ? formatSpeed(speedTargetMaximum.value) : "等待采样",
);
const spoolScaleLabel = computed<string>(() =>
  spoolPeak.value > 0 ? formatBytes(spoolTargetMaximum.value) : "等待采样",
);
const downloadGeometry = computed<ThroughputPaths>(() =>
  chartGeometry("download", speedTargetMaximum.value),
);
const assemblyGeometry = computed<ThroughputPaths>(() =>
  chartGeometry("assembly", speedTargetMaximum.value),
);
const spoolGeometry = computed<ThroughputPaths>(() =>
  chartGeometry("spool", spoolTargetMaximum.value),
);
const latestSampleAt = computed<number | null>(() => samples.value.at(-1)?.at ?? null);
const speedTransform = computed<string>(() =>
  chartTransform(displaySpeedMaximum.value, speedTargetMaximum.value),
);
const spoolTransform = computed<string>(() =>
  chartTransform(displaySpoolMaximum.value, spoolTargetMaximum.value),
);
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
    downloadCompletedAt.value = downloadDone.value ? Date.now() : null;
    assemblyCompletedAt.value = assemblyDone.value ? Date.now() : null;
    spoolReleasedAt.value = currentSpoolBytes.value > 0 ? null : Date.now();
    appendSample();
    resetAxes(performance.now());
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

watch([speedTargetMaximum, spoolTargetMaximum], ([speed, spool]) => {
  const now = performance.now();
  speedAxis.value = retargetThroughputAxis(speedAxis.value, speed, now, !reducedMotion.value);
  spoolAxis.value = retargetThroughputAxis(spoolAxis.value, spool, now, !reducedMotion.value);
});

watch(renderActive, (active) => {
  if (active) startRenderLoop();
  else stopRenderLoop();
});

onMounted(() => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = motionQuery.matches;
  motionQuery.addEventListener("change", handleMotionChange);
  sampleTimer = setInterval(() => {
    clockTick.value += 1;
    appendSample();
  }, THROUGHPUT_SAMPLE_INTERVAL_MS);
  if (reducedMotion.value) snapAxes();
  if (renderActive.value) startRenderLoop();
});

onUnmounted(() => {
  if (sampleTimer !== null) clearInterval(sampleTimer);
  if (motionQuery !== null) motionQuery.removeEventListener("change", handleMotionChange);
  stopRenderLoop();
});

function appendSample(): void {
  const at = performance.now();
  samples.value = appendThroughputSample(samples.value, {
    at,
    download: currentDownloadSpeed.value,
    assembly: currentAssemblySpeed.value,
    spool: currentSpoolBytes.value,
  });
  frameNow.value = at;
}

function chartGeometry(metric: SampleMetric, maximum: number): ThroughputPaths {
  return throughputPaths(
    throughputCurveSegments(samples.value, (sample) => sample[metric], maximum),
  );
}

// 最新采样延后一个间隔进入右边界；曲线按纵轴上限归一化，帧间只更新平移与缩放，采样更新时才重算路径。
function chartTransform(display: number, target: number): string {
  const factor = target > 0 && display > 0 ? target / display : 1;
  const latest = latestSampleAt.value;
  const offset = latest === null ? 0 : latest + THROUGHPUT_SAMPLE_INTERVAL_MS - frameNow.value;
  const elapsed = Math.min(THROUGHPUT_SAMPLE_INTERVAL_MS, Math.max(0, offset));
  const translateX = (elapsed / THROUGHPUT_WINDOW_MS) * chartWidth;
  const translateY = chartBottom * (1 - factor);
  return `matrix(1 0 0 ${factor.toFixed(4)} ${translateX.toFixed(2)} ${translateY.toFixed(2)})`;
}

function startRenderLoop(): void {
  if (frameHandle !== null || reducedMotion.value) return;
  frameHandle = requestAnimationFrame(renderFrame);
}

function stopRenderLoop(): void {
  if (frameHandle === null) return;
  cancelAnimationFrame(frameHandle);
  frameHandle = null;
}

function renderFrame(time: number): void {
  frameHandle = null;
  frameNow.value = time;
  if (renderActive.value) startRenderLoop();
}

function resetAxes(now: number): void {
  speedAxis.value = createThroughputAxis(speedTargetMaximum.value, now);
  spoolAxis.value = createThroughputAxis(spoolTargetMaximum.value, now);
}

function snapAxes(): void {
  const now = performance.now();
  frameNow.value = now;
  resetAxes(now);
}

function handleMotionChange(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches;
  if (event.matches) {
    stopRenderLoop();
    snapAxes();
  } else if (renderActive.value) {
    startRenderLoop();
  }
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
  return `${Number(value.toFixed(value >= 10 ? 1 : 2))} ${unit}`;
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

.install-throughput-scale {
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
</style>
