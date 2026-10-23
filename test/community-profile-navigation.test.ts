/**
 * 米游社用户主页导航回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  getCurrentWindow: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({ emit: mocks.emit }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: mocks.getCurrentWindow }));
vi.mock("@/router/index.js", () => ({ default: { push: mocks.push } }));

import { openCommunityProfile, parseCommunityProfileGid } from "../src/utils/community/profile.js";

beforeEach(() => {
  mocks.emit.mockReset();
  mocks.getCurrentWindow.mockReset();
  mocks.push.mockReset();
  mocks.emit.mockResolvedValue(undefined);
  mocks.push.mockResolvedValue(undefined);
});

describe("openCommunityProfile", () => {
  it("pushes the user route from the main window", async () => {
    mocks.getCurrentWindow.mockReturnValue({ label: "TeyvatGuide" });

    await openCommunityProfile(" 123456789 ");

    expect(mocks.push).toHaveBeenCalledWith({
      name: "用户信息",
      params: { uid: "123456789" },
    });
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("selects the source post's game section", async () => {
    mocks.getCurrentWindow.mockReturnValue({ label: "TeyvatGuide" });

    await openCommunityProfile("123456789", 3);

    expect(mocks.push).toHaveBeenCalledWith({
      name: "用户信息",
      params: { uid: "123456789" },
      query: { gid: "3" },
    });
  });

  it.each([0, -1, 1.5, Number.NaN])("ignores an invalid game section: %s", async (gameId) => {
    mocks.getCurrentWindow.mockReturnValue({ label: "TeyvatGuide" });

    await openCommunityProfile("123456789", gameId);

    expect(mocks.push).toHaveBeenCalledWith({
      name: "用户信息",
      params: { uid: "123456789" },
    });
  });

  it("emits a deep link from a child window", async () => {
    mocks.getCurrentWindow.mockReturnValue({ label: "post_detail" });

    await openCommunityProfile("123456789");

    expect(mocks.emit).toHaveBeenCalledWith(
      "active_deep_link",
      "router?path=/community/profile/123456789",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("keeps the source post's game section in a child-window deep link", async () => {
    mocks.getCurrentWindow.mockReturnValue({ label: "post_detail" });

    await openCommunityProfile("123456789", 3);

    expect(mocks.emit).toHaveBeenCalledWith(
      "active_deep_link",
      "router?path=/community/profile/123456789?gid=3",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each(["", "0", "-1", "1.5", "abc", "  "])(
    "does not navigate for an invalid user ID: %s",
    async (userId) => {
      await openCommunityProfile(userId);

      expect(mocks.getCurrentWindow).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
      expect(mocks.emit).not.toHaveBeenCalled();
    },
  );

  it("passes through route navigation failures", async () => {
    const error = new Error("route failure");
    mocks.getCurrentWindow.mockReturnValue({ label: "TeyvatGuide" });
    mocks.push.mockRejectedValue(error);

    await expect(openCommunityProfile("123456789")).rejects.toBe(error);
  });

  it("passes through deep-link emission failures", async () => {
    const error = new Error("deep-link failure");
    mocks.getCurrentWindow.mockReturnValue({ label: "post_detail" });
    mocks.emit.mockRejectedValue(error);

    await expect(openCommunityProfile("123456789")).rejects.toBe(error);
  });
});

describe("parseCommunityProfileGid", () => {
  it("parses a positive integer query value", () => {
    expect(parseCommunityProfileGid(" 3 ")).toBe(3);
  });

  it("uses the first value when the query repeats", () => {
    expect(parseCommunityProfileGid(["4", "5"])).toBe(4);
  });

  it.each([undefined, null, "", "0", "-1", "1.5", "abc"])(
    "returns undefined for an invalid query value: %s",
    (value) => {
      expect(parseCommunityProfileGid(value)).toBeUndefined();
    },
  );
});
