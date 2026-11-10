/**
 * 米游社通知入口提醒规则回归测试。
 * @since Beta v0.13.1
 */

import { describe, expect, it } from "vitest";

import {
  clearNotificationBadge,
  getNotificationBadge,
  shouldRenderNotificationOrigin,
} from "../src/utils/community/notification.js";

/**
 * 创建完整的消息设置测试数据。
 * @since Beta v0.13.0
 * @param overrides - 本次用例覆盖的设置
 * @returns 消息设置
 */
function createSettings(
  overrides: Partial<TGApp.BBS.Notification.Settings> = {},
): TGApp.BBS.Notification.Settings {
  return {
    reply: "All",
    mention: "All",
    active_mention: "All",
    upvote: "All",
    follow: "All",
    system: true,
    chat: true,
    push_reply_and_mention: "ON",
    push_follow: "ON",
    push_upvote: "ON",
    push_system_v2: "OPTION_ALL",
    low_freq_notify_at_ts: "0",
    ...overrides,
  };
}

/**
 * 创建通知原内容测试数据。
 * @since Beta v0.13.1
 * @param overrides - 本次用例覆盖的原内容字段
 * @returns 通知原内容
 */
function createOrigin(
  overrides: Partial<TGApp.BBS.Notification.Origin> = {},
): TGApp.BBS.Notification.Origin {
  return {
    text: "",
    structured_content: "",
    image: null,
    is_deleted: false,
    origin_is_missing: false,
    ...overrides,
  };
}

/** 被点赞评论的原内容，含正文与配图。 @since Beta v0.13.1 */
const likedComment = createOrigin({
  text: "帅_(得意)",
  image: {
    image_url: "https://upload-bbs.miyoushe.com/upload/cover.jpg",
    width: 1280,
    height: 720,
    type: "jpg",
  },
});

const interactions: Array<{
  category: TGApp.BBS.Notification.Category;
  setting: "reply" | "active_mention" | "upvote";
}> = [
  { category: "reply", setting: "reply" },
  { category: "active_mention", setting: "active_mention" },
  { category: "comment", setting: "upvote" },
];

describe.each(interactions)("$category notification badge", ({ category, setting }) => {
  const counts = { [category]: 12, [`${category}_focus`]: 3 };

  it("shows the total reminder count when receiving from everyone", () => {
    expect(getNotificationBadge(category, counts, createSettings())).toEqual({
      count: 12,
      dot: false,
      label: "12 条新提醒",
    });
  });

  it("shows only followed users' count when receiving from followed users", () => {
    expect(getNotificationBadge(category, counts, createSettings({ [setting]: "Follow" }))).toEqual(
      { count: 3, dot: false, label: "3 条来自关注用户的新提醒" },
    );
  });

  it("uses a dot for other users when no followed-user reminders remain", () => {
    expect(
      getNotificationBadge(category, { [category]: 12 }, createSettings({ [setting]: "Follow" })),
    ).toEqual({ count: 0, dot: true, label: "有新消息" });
  });

  it("uses a dot instead of a count when reminders are disabled", () => {
    expect(getNotificationBadge(category, counts, createSettings({ [setting]: "Never" }))).toEqual({
      count: 0,
      dot: true,
      label: "有新消息",
    });
  });
});

describe("system notification badge", () => {
  it("uses the numeric reminder count when the web system setting is enabled", () => {
    expect(getNotificationBadge("system", { system: 7 }, createSettings())).toEqual({
      count: 7,
      dot: false,
      label: "7 条新提醒",
    });
  });

  it("uses a dot when the web system setting is disabled", () => {
    expect(
      getNotificationBadge("system", { system: 7 }, createSettings({ system: false })),
    ).toEqual({ count: 0, dot: true, label: "有新消息" });
  });
});

describe("notification badge boundaries", () => {
  it("falls back to a dot while settings are unavailable", () => {
    expect(getNotificationBadge("reply", { reply: 12 })).toEqual({
      count: 0,
      dot: true,
      label: "有新消息",
    });
  });

  it("does not show a badge when no reminders exist", () => {
    expect(getNotificationBadge("reply", {}, createSettings())).toEqual({
      count: 0,
      dot: false,
      label: "",
    });
    expect(getNotificationBadge("system", { system: 0 })).toEqual({
      count: 0,
      dot: false,
      label: "",
    });
  });

  it("keeps the full count for the tooltip when the display exceeds 99", () => {
    expect(getNotificationBadge("comment", { comment: 150 }, createSettings())).toEqual({
      count: 150,
      dot: false,
      label: "150 条新提醒",
    });
  });

  it("updates the badge immediately when the receiving scope changes", () => {
    const counts = { reply: 12, reply_focus: 3 };
    expect(getNotificationBadge("reply", counts, createSettings()).count).toBe(12);
    expect(getNotificationBadge("reply", counts, createSettings({ reply: "Follow" })).count).toBe(
      3,
    );
    expect(getNotificationBadge("reply", counts, createSettings({ reply: "Never" })).dot).toBe(
      true,
    );
  });
});

describe("clearNotificationBadge", () => {
  it("clears ordinary and followed-user reminders without changing another category", () => {
    const counts = Object.freeze({ reply: 12, reply_focus: 3, system: 7, comment: 8 });
    const cleared = clearNotificationBadge(counts, "reply");

    expect(cleared).toEqual({ reply: 0, reply_focus: 0, system: 7, comment: 8 });
    expect(counts.reply).toBe(12);
    expect(counts.reply_focus).toBe(3);
    expect(getNotificationBadge("reply", cleared, createSettings({ reply: "Follow" }))).toEqual({
      count: 0,
      dot: false,
      label: "",
    });
  });
});

describe("notification origin quote", () => {
  it("does not repeat a liked comment that the notification body already renders", () => {
    expect(shouldRenderNotificationOrigin("comment", likedComment, true)).toBe(false);
  });

  it("keeps the liked comment as the only content when the body is empty", () => {
    expect(shouldRenderNotificationOrigin("comment", likedComment, false)).toBe(true);
    expect(
      shouldRenderNotificationOrigin("comment", createOrigin({ is_deleted: true }), false),
    ).toBe(true);
  });

  it("keeps the quoted content that replies and mentions refer to", () => {
    expect(shouldRenderNotificationOrigin("reply", likedComment, true)).toBe(true);
    expect(shouldRenderNotificationOrigin("active_mention", likedComment, true)).toBe(true);
  });

  it("treats original content as visible when it only carries an image", () => {
    const imageOnly = createOrigin({
      image: {
        image_url: "https://upload-bbs.miyoushe.com/upload/post.jpg",
        width: 0,
        height: 0,
        type: "jpg",
      },
    });
    expect(shouldRenderNotificationOrigin("reply", imageOnly, true)).toBe(true);
    expect(shouldRenderNotificationOrigin("comment", imageOnly, true)).toBe(false);
  });

  it("skips the quote when the notification has no original content", () => {
    expect(shouldRenderNotificationOrigin("reply", null, true)).toBe(false);
    expect(shouldRenderNotificationOrigin("reply", createOrigin({ text: "   " }), true)).toBe(
      false,
    );
  });

  it("still reports deleted original content for replies", () => {
    expect(shouldRenderNotificationOrigin("reply", createOrigin({ is_deleted: true }), true)).toBe(
      true,
    );
    expect(
      shouldRenderNotificationOrigin("reply", createOrigin({ origin_is_missing: true }), false),
    ).toBe(true);
  });
});
