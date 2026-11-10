/**
 * 背包材料记录差值回归测试
 * @since Beta v0.13.1
 */
import {
  getMaterialRecordChanges,
  getMaterialRecordLogScale,
  restoreMaterialRecordLogValue,
} from "@utils/game/materialRecord.js";
import { describe, expect, it } from "vitest";

describe("材料记录数量变化", () => {
  it("按时间计算增减，保留手动标记和零变化，不修改原记录", () => {
    const records = Object.freeze([
      Object.freeze({ time: 4, count: 0 }),
      Object.freeze({ time: 2, count: 15, manual: true }),
      Object.freeze({ time: 1, count: 10 }),
      Object.freeze({ time: 3, count: 15 }),
    ]);

    expect(getMaterialRecordChanges(records)).toEqual([
      { time: 2, count: 15, manual: true, diff: 5 },
      { time: 3, count: 15, diff: 0 },
      { time: 4, count: 0, diff: -15 },
    ]);
    expect(records.map((record) => record.time)).toEqual([4, 2, 1, 3]);
  });

  it("空记录和只有基准记录时不产生数量变化", () => {
    expect(getMaterialRecordChanges([])).toEqual([]);
    expect(getMaterialRecordChanges([{ time: 1, count: 100 }])).toEqual([]);
  });
});

describe("材料变化对数刻度", () => {
  it("增减均按绝对值缩放，保留零值和原数据", () => {
    const values = Object.freeze([-5460000, -1000, -1, 0, 1, 1000, 1180000]);
    const scale = getMaterialRecordLogScale(values);

    expect(scale.values[3]).toBe(0);
    expect(scale.values.map(Math.sign)).toEqual([1, 1, 1, 0, 1, 1, 1]);
    expect(scale.values[4]).toBeCloseTo(Math.log10(2));
    expect(Math.abs(scale.values[0]) / scale.values[4]).toBeLessThan(25);
    expect(scale.values[1]).toBeCloseTo(scale.values[5]);
    expect(scale.values[2]).toBeCloseTo(scale.values[4]);
    expect(values).toEqual([-5460000, -1000, -1, 0, 1, 1000, 1180000]);
  });

  it("刻度可还原为真实变化幅度", () => {
    const values = [-5460000, -1000, -1, 0, 1, 1000, 1180000];
    const scale = getMaterialRecordLogScale(values);

    for (const [index, value] of scale.values.entries()) {
      expect(restoreMaterialRecordLogValue(value)).toBeCloseTo(Math.abs(values[index]), 6);
    }
    expect(restoreMaterialRecordLogValue(0)).toBe(0);
  });

  it("纵轴包含所有变化幅度，零点固定在最底部", () => {
    const scale = getMaterialRecordLogScale([-5460000, -1, 0, 1, 1180000]);

    expect(scale.values.every((value) => value >= scale.minimum && value <= scale.maximum)).toBe(
      true,
    );
    expect(scale.minimum).toBe(0);
    expect(scale.maximum).toBeGreaterThan(0);
    expect(scale.ticks).toContain(0);
    expect(scale.ticks.every((tick) => tick >= scale.minimum && tick <= scale.maximum)).toBe(true);
  });

  it("几百万的变化不会把轴范围扩到十亿", () => {
    const scale = getMaterialRecordLogScale([-5460000, 1180000]);

    expect(restoreMaterialRecordLogValue(scale.minimum)).toBe(0);
    expect(restoreMaterialRecordLogValue(scale.maximum)).toBeLessThan(10000000);
  });

  it("刻度采用真实整数量级，408 位于 100 和 1000 之间", () => {
    const scale = getMaterialRecordLogScale([-5460000, 408, 1180000]);
    const quantities = scale.ticks.map((tick) => Math.round(restoreMaterialRecordLogValue(tick)));

    expect(quantities).toEqual([0, 10, 100, 1000, 10000, 100000, 1000000]);
    expect(scale.values[1]).toBeGreaterThan(scale.ticks[2]);
    expect(scale.values[1]).toBeLessThan(scale.ticks[3]);
  });

  it("空数据、全零及单侧变化均有有效范围", () => {
    for (const values of [[], [0, 0], [1, 100000], [-1, -100000]]) {
      const scale = getMaterialRecordLogScale(values);

      expect(Number.isFinite(scale.minimum)).toBe(true);
      expect(Number.isFinite(scale.maximum)).toBe(true);
      expect(scale.minimum).toBe(0);
      expect(scale.maximum).toBeGreaterThanOrEqual(0);
      expect(scale.maximum).toBeGreaterThan(scale.minimum);
      expect(scale.ticks).toContain(0);
    }
  });
});
