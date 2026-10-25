/**
 * 祈愿记录虚拟网格分组回归测试
 * @since Beta v0.13.0
 */

import { chunkGachaRecords, getGachaRecordColumns } from "@utils/gacha/recordGrid.js";
import { describe, expect, it } from "vitest";

describe("祈愿记录网格列数", () => {
  it.each([
    [0, 1],
    [80, 1],
    [104, 1],
    [215.9, 1],
    [216, 2],
    [327.9, 2],
    [328, 3],
    [439.9, 3],
    [440, 4],
  ])("可用宽度 %s 时使用 %s 列", (width, columns) => {
    expect(getGachaRecordColumns(width)).toBe(columns);
  });
});

describe("祈愿记录虚拟行", () => {
  const records = Object.freeze([
    Object.freeze({ id: "105", count: 80, isUp: true }),
    Object.freeze({ id: "104", count: 15, isUp: false }),
    Object.freeze({ id: "103", count: 2, isUp: undefined }),
    Object.freeze({ id: "102", count: 6, isUp: true }),
    Object.freeze({ id: "101", count: 9, isUp: false }),
  ]);

  it("列表与网格保留同一顺序、抽数、UP 状态和记录引用", () => {
    for (const columns of [1, 2, 3, 8]) {
      const rows = chunkGachaRecords(records, columns);
      expect(rows).toHaveLength(Math.ceil(records.length / columns));
      expect(rows.flat()).toEqual(records);
      expect(rows.flat().every((record, index) => record === records[index])).toBe(true);
      expect(rows.every((row) => row.length > 0 && row.length <= columns)).toBe(true);
    }
  });

  it("缩放后重新分行保留末行记录，空筛选结果不产生占位行", () => {
    expect(chunkGachaRecords(records, 2).map((row) => row.map((record) => record.id))).toEqual([
      ["105", "104"],
      ["103", "102"],
      ["101"],
    ]);
    expect(chunkGachaRecords(records, 3).map((row) => row.map((record) => record.id))).toEqual([
      ["105", "104", "103"],
      ["102", "101"],
    ]);
    expect(chunkGachaRecords([], 3)).toEqual([]);
    expect(chunkGachaRecords(records.slice(0, 1), 3)).toEqual([[records[0]]]);
  });

  it("零列退回单列，避免隐藏区域分组无法前进", () => {
    expect(chunkGachaRecords(records, 0)).toEqual(records.map((record) => [record]));
  });

  it("十万条记录分行没有遗漏或深拷贝，重排不改变输入", () => {
    const largeRecords = Object.freeze(
      Array.from({ length: 100_001 }, (_, index) => ({ id: String(100_001 - index) })),
    );
    const rows = chunkGachaRecords(largeRecords, 3);
    expect(rows).toHaveLength(33_334);
    expect(rows.at(-1)).toHaveLength(2);
    expect(rows.flat().every((record, index) => record === largeRecords[index])).toBe(true);
    expect(largeRecords[0].id).toBe("100001");
    expect(largeRecords.at(-1)?.id).toBe("1");
  });
});
