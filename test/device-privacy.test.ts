/**
 * 设备隐私展示掩码回归测试
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { maskDeviceValue } from "../src/utils/display/devicePrivacy.js";

describe("设备隐私展示掩码", () => {
  it("保留首尾字符并掩码中间内容", () => {
    expect(maskDeviceValue("12345678")).toBe("12****78");
    expect(maskDeviceValue("12345")).toBe("12*45");
  });

  it("短值也至少隐藏一部分", () => {
    expect(maskDeviceValue("1234")).toBe("1**4");
    expect(maskDeviceValue("123")).toBe("1*3");
    expect(maskDeviceValue("12")).toBe("**");
    expect(maskDeviceValue("1")).toBe("*");
  });

  it("空值保持为空字符串", () => {
    expect(maskDeviceValue("")).toBe("");
  });
});
