/**
 * 颜色转换回归测试。
 * @since Beta v0.13.0
 */
import { describe, expect, it } from "vitest";

import { hexToHsv, hsvToHex, normalizeHexColor } from "../src/utils/display/colorFunc.js";

describe("normalizeHexColor", () => {
  it("normalizes three- and six-digit hex colors", () => {
    expect(normalizeHexColor(" #F0A ")).toBe("#ff00aa");
    expect(normalizeHexColor("#3B82F6")).toBe("#3b82f6");
    expect(normalizeHexColor("3b82f6")).toBe("#3b82f6");
  });

  it("rejects malformed colors", () => {
    expect(normalizeHexColor("#ff00")).toBeUndefined();
    expect(normalizeHexColor("#gggggg")).toBeUndefined();
    expect(normalizeHexColor("")).toBeUndefined();
  });
});

describe("hexToHsv", () => {
  it("converts primary colors", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#00ff00").h).toBeCloseTo(120);
    expect(hexToHsv("#0000ff").h).toBeCloseTo(240);
  });

  it("reports grayscale colors without saturation", () => {
    expect(hexToHsv("#808080")).toEqual({ h: 0, s: 0, v: 128 / 255 });
  });

  it("rejects invalid input", () => {
    expect(() => hexToHsv("not-a-color")).toThrow(TypeError);
  });
});

describe("hsvToHex", () => {
  it("converts hue values and wraps full turns", () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00ff00");
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe("#ffffff");
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe("#000000");
  });

  it("round-trips common palette colors", () => {
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
    for (const color of colors) {
      expect(hsvToHex(hexToHsv(color))).toBe(color);
    }
  });
});
