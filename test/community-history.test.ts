/**
 * 浏览历史删除后的列表与分页状态回归测试。
 * @since Beta v0.13.1
 */

import { describe, expect, it } from "vitest";

import { applyHistoryDeletion } from "../src/utils/community/history.js";

const page = {
  entries: [{ id: "1" }, { id: "2" }, { id: "3" }],
  total: 100,
  offset: "next-page",
  isLast: false,
};

describe("history deletion state", () => {
  it("clears all history, including unloaded pages, without leaving a pagination trigger", () => {
    expect(applyHistoryDeletion(page, new Set(), true)).toEqual({
      entries: [],
      total: 0,
      offset: "",
      isLast: true,
    });
    expect(page.entries).toHaveLength(3);
    expect(page.total).toBe(100);
  });

  it("retains only excluded history when deleting all other loaded and unloaded entries", () => {
    const result = applyHistoryDeletion(page, new Set(["2"]), true);
    expect(result).toEqual({
      entries: [{ id: "2" }],
      total: 1,
      offset: "",
      isLast: true,
    });
    expect(result.entries[0]).toBe(page.entries[1]);
  });

  it("removes selected entries while retaining the cursor for unloaded history", () => {
    expect(applyHistoryDeletion(page, new Set(["1", "3"]), false)).toEqual({
      entries: [{ id: "2" }],
      total: 98,
      offset: "next-page",
      isLast: false,
    });
  });

  it("keeps pagination finished after deleting every entry on the last page", () => {
    const lastPage = { ...page, total: 3, isLast: true };
    expect(applyHistoryDeletion(lastPage, new Set(["1", "2", "3"]), false)).toEqual({
      entries: [],
      total: 0,
      offset: "next-page",
      isLast: true,
    });
  });

  it("uses the loaded count when the server total is missing or lower than the list length", () => {
    const result = applyHistoryDeletion({ ...page, total: 0 }, new Set(["1"]), false);
    expect(result.total).toBe(2);
    expect(result.entries.map((entry) => entry.id)).toEqual(["2", "3"]);
  });
});
