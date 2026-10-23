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

import { matchesPostKeyword, openCommunityProfile } from "../src/utils/communityProfile.js";

function createPost(subject: string, content: string): TGApp.BBS.Post.FullData {
  return <TGApp.BBS.Post.FullData>(<unknown>{ post: { subject, content } });
}

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

  it("emits a deep link from a child window", async () => {
    mocks.getCurrentWindow.mockReturnValue({ label: "post_detail" });

    await openCommunityProfile("123456789");

    expect(mocks.emit).toHaveBeenCalledWith(
      "active_deep_link",
      "router?path=/community/profile/123456789",
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

describe("matchesPostKeyword", () => {
  it("matches the subject case-insensitively", () => {
    expect(matchesPostKeyword(createPost("Genshin 攻略", ""), "genshin")).toBe(true);
  });

  it("matches the content", () => {
    expect(matchesPostKeyword(createPost("标题", "今日份的纳塔见闻"), "纳塔")).toBe(true);
  });

  it("rejects posts without the keyword", () => {
    expect(matchesPostKeyword(createPost("标题", "正文"), "须弥")).toBe(false);
  });
});
