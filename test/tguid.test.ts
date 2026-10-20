/**
 * UID 掩码工具回归测试
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  maskUid,
  maskUidName,
  maskUidTail,
  uidItemTitle,
  uidItemValue,
} from "../src/utils/TGUid.js";

const state = vi.hoisted(() => ({ hidden: false }));

vi.mock("@store/app.js", () => ({
  default: () => ({ hideUid: state.hidden }),
}));

describe("UID 掩码", () => {
  beforeEach(() => {
    state.hidden = false;
  });

  it("未开启隐藏时原样返回", () => {
    expect(maskUid("500299765")).toBe("500299765");
    expect(maskUidTail("500299765")).toBe("500299765");
    expect(maskUidName("500299765")).toBe("500299765");
  });

  it("开启隐藏后整串掩码", () => {
    state.hidden = true;
    expect(maskUid("500299765")).toBe("*********");
    expect(maskUid(123456789)).toBe("*********");
  });

  it("尾号掩码保留后四位", () => {
    state.hidden = true;
    expect(maskUidTail("500299765")).toBe("*****9765");
    expect(maskUidTail(500299765)).toBe("*****9765");
    expect(maskUidTail("1234")).toBe("****");
    expect(maskUidTail("123")).toBe("***");
  });

  it("文件名掩码保持可区分且不含非法字符", () => {
    state.hidden = true;
    expect(maskUidName("500299765")).toBe("UID9765");
    expect(maskUidName(147991965)).toBe("UID1965");
    expect(maskUidName("500299765")).not.toContain("*");
  });

  it("空值与 null 返回空串", () => {
    expect(maskUid("")).toBe("");
    expect(maskUid(null)).toBe("");
    expect(maskUid(undefined)).toBe("");
    expect(maskUidTail(null)).toBe("");
    expect(maskUidName(undefined)).toBe("");
    state.hidden = true;
    expect(maskUid(null)).toBe("");
    expect(maskUidTail("")).toBe("");
    expect(maskUidName(null)).toBe("");
  });

  it("下拉标题使用尾号，取值保持原始 UID", () => {
    state.hidden = true;
    expect(uidItemTitle("500299765")).toBe("*****9765");
    expect(uidItemTitle(500299765)).toBe("*****9765");
    expect(uidItemTitle({ value: "x" })).toBe("");
    expect(uidItemValue("500299765")).toBe("500299765");
    expect(uidItemValue(500299765)).toBe(500299765);
  });
});
