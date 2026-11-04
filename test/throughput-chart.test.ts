/**
 * 游戏任务吞吐趋势图的曲线几何与纵轴过渡回归测试。
 * @since Beta v0.13.0
 */

import {
  appendThroughputSample,
  createThroughputAxis,
  retargetThroughputAxis,
  throughputAxisValue,
  throughputCeiling,
  throughputCurveSegments,
  throughputPaths,
  THROUGHPUT_CHART_BOTTOM,
  THROUGHPUT_CHART_WIDTH,
  THROUGHPUT_SAMPLE_INTERVAL_MS,
  THROUGHPUT_WINDOW_MS,
} from "@utils/game/throughputChart.js";
import type { ThroughputSample } from "@utils/game/throughputChart.js";
import { describe, expect, it } from "vitest";

type ThroughputTestSample = ThroughputSample & {
  download: number;
  assembly: number;
};

/**
 * 创建按固定间隔排列的下载采样。
 * @since Beta v0.13.0
 * @param values - 每个采样点的下载速度
 * @returns 采样列表
 */
function createSamples(values: Array<number>): Array<ThroughputTestSample> {
  return values.map((download, index) => ({
    at: index * THROUGHPUT_SAMPLE_INTERVAL_MS,
    download,
    assembly: 0,
  }));
}

describe("游戏任务吞吐曲线", () => {
  it("滑窗清理过期采样并保留最新点", () => {
    let samples: Array<ThroughputTestSample> = [];
    for (let second = 0; second <= 70; second += 1) {
      samples = appendThroughputSample(samples, {
        at: second * THROUGHPUT_SAMPLE_INTERVAL_MS,
        download: second,
        assembly: 0,
      });
    }
    expect(samples.length).toBe(63);
    expect(samples[0].at).toBe(8_000);
    expect(samples.at(-1)?.at).toBe(70_000);
  });

  it("控制点限制在相邻采样之间，曲线不产生额外峰值", () => {
    const samples = createSamples([1_000, 5_000, 0]);
    const segments = throughputCurveSegments(samples, (sample) => sample.download, 10_000);
    expect(segments).toHaveLength(2);
    expect(segments[0].from.x).toBeCloseTo(
      THROUGHPUT_CHART_WIDTH - (2_000 / THROUGHPUT_WINDOW_MS) * THROUGHPUT_CHART_WIDTH,
    );
    expect(segments.at(-1)?.to.x).toBeCloseTo(THROUGHPUT_CHART_WIDTH);
    for (const segment of segments) {
      const middleX = (segment.from.x + segment.to.x) / 2;
      expect(segment.from.x).toBeLessThan(segment.to.x);
      expect(segment.control1.x).toBeCloseTo(middleX);
      expect(segment.control2.x).toBeCloseTo(middleX);
      const minY = Math.min(segment.from.y, segment.to.y);
      const maxY = Math.max(segment.from.y, segment.to.y);
      for (const point of [segment.from, segment.control1, segment.control2, segment.to]) {
        expect(point.y).toBeGreaterThanOrEqual(minY);
        expect(point.y).toBeLessThanOrEqual(maxY);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(THROUGHPUT_CHART_BOTTOM);
      }
    }
    expect(
      throughputCurveSegments(createSamples([1_000]), (sample) => sample.download, 10_000),
    ).toEqual([]);
  });

  it("曲线与面积路径覆盖全部采样点", () => {
    const segments = throughputCurveSegments(
      createSamples([0, 1_000, 2_000]),
      (sample) => sample.download,
      4_000,
    );
    const paths = throughputPaths(segments);
    const first = segments[0].from;
    const last = segments[segments.length - 1].to;
    expect(paths.line).toMatch(/^M .+ C /);
    expect(paths.line.match(/ C /g)).toHaveLength(2);
    expect(paths.area.startsWith(`M ${first.x.toFixed(2)} ${THROUGHPUT_CHART_BOTTOM} L `)).toBe(
      true,
    );
    expect(paths.area.endsWith(`L ${last.x.toFixed(2)} ${THROUGHPUT_CHART_BOTTOM} Z`)).toBe(true);
    expect(throughputPaths([])).toEqual({ line: "", area: "" });
  });

  it("纵轴平滑过渡并在目标变化时从当前值继续", () => {
    const axis = createThroughputAxis(1024, 0);
    const moved = retargetThroughputAxis(axis, 4096, 1000);
    expect(throughputAxisValue(moved, 1000)).toBe(1024);
    const middle = throughputAxisValue(moved, 1300);
    expect(middle).toBeGreaterThan(1024);
    expect(middle).toBeLessThan(4096);
    expect(throughputAxisValue(moved, 1600)).toBe(4096);
    const retargeted = retargetThroughputAxis(moved, 2048, 1300);
    expect(throughputAxisValue(retargeted, 1300)).toBeCloseTo(middle);
    expect(throughputAxisValue(retargeted, 1900)).toBe(2048);
    const snapped = retargetThroughputAxis(moved, 2048, 500, false);
    expect(snapped.from).toBe(2048);
    expect(snapped.to).toBe(2048);
  });

  it("纵轴上限保留峰值余量并遵守最小上限", () => {
    expect(throughputCeiling(0, 1024)).toBe(1024);
    expect(throughputCeiling(512, 1024)).toBe(1024);
    const peak = 3_000_000;
    const ceiling = throughputCeiling(peak, 1024);
    expect(ceiling).toBeGreaterThanOrEqual(peak * 1.15);
    expect(ceiling).toBeLessThanOrEqual(peak * 1.15 * 1.02);
  });
});
