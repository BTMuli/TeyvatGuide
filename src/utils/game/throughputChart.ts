/**
 * 游戏任务吞吐趋势图的采样保留、纵轴过渡与平滑曲线几何。
 * @since Beta v0.13.0
 */

/** 趋势图横轴覆盖的时间窗口，单位毫秒。 */
export const THROUGHPUT_WINDOW_MS = 60_000;

/** 采样间隔；最新采样延后一个间隔从右边界进入。 */
export const THROUGHPUT_SAMPLE_INTERVAL_MS = 1_000;

/** 趋势图绘制宽度（viewBox 单位）。 */
export const THROUGHPUT_CHART_WIDTH = 600;

/** 趋势图绘制高度（viewBox 单位）。 */
export const THROUGHPUT_CHART_HEIGHT = 120;

/** 曲线与面积共用的底线，底部保留 2 个绘制单位。 */
export const THROUGHPUT_CHART_BOTTOM = THROUGHPUT_CHART_HEIGHT - 2;

/** 速度纵轴的最小上限，避免低速采样被放大成噪声。 */
export const THROUGHPUT_MINIMUM_SPEED_BYTES = 1024;

/** 私有临时空间纵轴的最小上限。 */
export const THROUGHPUT_MINIMUM_SPOOL_BYTES = 1024 * 1024;

// 多保留两个采样间隔，旧采样完全移出左边界后才被移除，避免左端跳动。
const THROUGHPUT_RETENTION_MS = THROUGHPUT_WINDOW_MS + THROUGHPUT_SAMPLE_INTERVAL_MS * 2;
const THROUGHPUT_MAX_SAMPLES = 120;
const THROUGHPUT_AXIS_TRANSITION_MS = 600;
const THROUGHPUT_SCALE_HEADROOM = 1.15;

/**
 * 带采样时间的吞吐采样，`at` 使用 `performance.now()` 时间戳。
 * @since Beta v0.13.0
 */
export type ThroughputSample = {
  at: number;
};

/**
 * 纵轴过渡状态。
 * @since Beta v0.13.0
 */
export type ThroughputAxis = {
  from: number;
  to: number;
  startedAt: number;
};

/**
 * 趋势图绘制坐标。
 * @since Beta v0.13.0
 */
export type ThroughputPoint = {
  x: number;
  y: number;
};

/**
 * 相邻采样之间的三次贝塞尔段。
 * @since Beta v0.13.0
 */
export type ThroughputCurveSegment = {
  from: ThroughputPoint;
  control1: ThroughputPoint;
  control2: ThroughputPoint;
  to: ThroughputPoint;
};

/**
 * 曲线与面积路径。
 * @since Beta v0.13.0
 */
export type ThroughputPaths = {
  line: string;
  area: string;
};

/**
 * 追加采样，丢弃滑动窗口外的旧采样并限制总数量。
 * @since Beta v0.13.0
 * @param samples - 现有采样
 * @param sample - 新采样
 * @returns 保留的采样
 */
export function appendThroughputSample<T extends ThroughputSample>(
  samples: ReadonlyArray<T>,
  sample: T,
): Array<T> {
  const cutoff = sample.at - THROUGHPUT_RETENTION_MS;
  const retained = samples.filter((item) => item.at >= cutoff);
  retained.push(sample);
  if (retained.length > THROUGHPUT_MAX_SAMPLES) {
    retained.splice(0, retained.length - THROUGHPUT_MAX_SAMPLES);
  }
  return retained;
}

/**
 * 计算纵轴上限：至少为最小上限，给峰值保留 15% 余量后向上取整到两位有效数字。
 * @since Beta v0.13.0
 * @param peak - 窗口内的峰值
 * @param floor - 纵轴最小上限
 * @returns 纵轴上限（字节）
 */
export function throughputCeiling(peak: number, floor: number): number {
  const target = Math.max(peak * THROUGHPUT_SCALE_HEADROOM, floor);
  if (!Number.isFinite(target) || target <= 0) return floor;
  let unit = 1;
  while (target >= unit * 1024) unit *= 1024;
  const scaled = target / unit;
  const magnitude = scaled < 10 ? 0.1 : 10 ** Math.floor(Math.log10(scaled));
  const step = Math.ceil(scaled / magnitude) * magnitude;
  if (step >= 1024) return 1024 * unit;
  return Math.ceil(step * unit);
}

/**
 * 创建立即生效的纵轴状态。
 * @since Beta v0.13.0
 * @param value - 当前纵轴上限
 * @param now - 当前时间戳
 * @returns 纵轴状态
 */
export function createThroughputAxis(value: number, now: number): ThroughputAxis {
  return { from: value, to: value, startedAt: now };
}

/**
 * 平滑切换到新的纵轴上限；`animate` 为 false 时立即生效。
 * @since Beta v0.13.0
 * @param axis - 当前纵轴状态
 * @param target - 新纵轴上限
 * @param now - 当前时间戳
 * @param animate - 是否保留过渡
 * @returns 更新后的纵轴状态
 */
export function retargetThroughputAxis(
  axis: ThroughputAxis,
  target: number,
  now: number,
  animate = true,
): ThroughputAxis {
  if (!animate) return createThroughputAxis(target, now);
  const current = throughputAxisValue(axis, now);
  if (current === target) return axis;
  return { from: current, to: target, startedAt: now };
}

/**
 * 计算纵轴在指定时刻的显示上限。
 * @since Beta v0.13.0
 * @param axis - 纵轴状态
 * @param now - 当前时间戳
 * @returns 显示上限
 */
export function throughputAxisValue(axis: ThroughputAxis, now: number): number {
  const elapsed = now - axis.startedAt;
  if (elapsed <= 0) return axis.from;
  if (elapsed >= THROUGHPUT_AXIS_TRANSITION_MS) return axis.to;
  const progress = elapsed / THROUGHPUT_AXIS_TRANSITION_MS;
  const eased = progress * progress * (3 - 2 * progress);
  return axis.from + (axis.to - axis.from) * eased;
}

/**
 * 生成经过每个采样点的平滑曲线段。
 * @since Beta v0.13.0
 * @param samples - 按时间升序排列的采样
 * @param valueOf - 从采样中取出当前指标值
 * @param maximum - 纵轴上限
 * @returns 相邻采样之间的贝塞尔段
 */
export function throughputCurveSegments<T extends ThroughputSample>(
  samples: ReadonlyArray<T>,
  valueOf: (sample: T) => number,
  maximum: number,
): Array<ThroughputCurveSegment> {
  if (samples.length < 2) return [];
  const latestAt = samples[samples.length - 1].at;
  const scale = maximum > 0 ? maximum : 1;
  const points = samples.map((sample): ThroughputPoint => {
    const age = Math.max(0, latestAt - sample.at);
    const ratio = Math.min(1, Math.max(0, valueOf(sample) / scale));
    return {
      x: THROUGHPUT_CHART_WIDTH - (age / THROUGHPUT_WINDOW_MS) * THROUGHPUT_CHART_WIDTH,
      y: THROUGHPUT_CHART_BOTTOM - ratio * THROUGHPUT_CHART_BOTTOM,
    };
  });
  const segments: Array<ThroughputCurveSegment> = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const middleX = (from.x + to.x) / 2;
    // 控制点固定在相邻采样之间，曲线既经过采样点又不会形成额外峰值。
    segments.push({
      from,
      control1: { x: middleX, y: from.y },
      control2: { x: middleX, y: to.y },
      to,
    });
  }
  return segments;
}

/**
 * 把曲线段转换为 SVG 曲线与面积路径。
 * @since Beta v0.13.0
 * @param segments - 平滑曲线段
 * @returns 曲线与面积路径；没有曲线段时均为空字符串
 */
export function throughputPaths(segments: ReadonlyArray<ThroughputCurveSegment>): ThroughputPaths {
  if (segments.length === 0) return { line: "", area: "" };
  const first = segments[0].from;
  const last = segments[segments.length - 1].to;
  let line = `M ${formatPoint(first)}`;
  let area = `M ${first.x.toFixed(2)} ${THROUGHPUT_CHART_BOTTOM} L ${formatPoint(first)}`;
  for (const segment of segments) {
    const curve = ` C ${formatPoint(segment.control1)} ${formatPoint(segment.control2)} ${formatPoint(segment.to)}`;
    line += curve;
    area += curve;
  }
  return {
    line,
    area: `${area} L ${last.x.toFixed(2)} ${THROUGHPUT_CHART_BOTTOM} Z`,
  };
}

/**
 * 格式化绘制坐标。
 * @since Beta v0.13.0
 * @param point - 绘制坐标
 * @returns SVG 路径坐标
 */
function formatPoint(point: ThroughputPoint): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}
