/**
 * 最近一次回复目标的内存草稿回归测试。
 * @since Beta v0.13.1
 */

import { afterEach, describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import { createReplyDraft, useReplyDraft } from "../src/hooks/useReplyDraft.js";

const scopes: Array<ReturnType<typeof effectScope>> = [];

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

/**
 * 创建与浮层使用相同响应式输入的页面会话。
 * @since Beta v0.13.1
 * @returns 会话输入与真实草稿状态
 */
function createSession() {
  const open = ref<boolean>(false);
  const target = ref<string>();
  const postId = ref<string>("post-1");
  const gid = ref<number>(2);
  const uid = ref<string>("account-1");
  const token = ref<string>("token-1");
  const scope = effectScope();
  scopes.push(scope);
  const draft = scope.run(() =>
    useReplyDraft(
      () => open.value,
      () => target.value,
      () => [postId.value, gid.value, uid.value, token.value],
    ),
  );
  if (draft === undefined) throw new Error("草稿会话未初始化");
  return { open, target, postId, gid, uid, token, draft };
}

describe("回复内存草稿", () => {
  it.each([undefined, "reply-a"])("关闭后再次打开同一目标 %s 保留正文与附件", async (targetId) => {
    const session = createSession();
    session.target.value = targetId;
    session.open.value = true;
    await nextTick();
    const saved: TGApp.BBS.Reply.Draft = {
      content: "@旅行者 未发布的回复",
      mentions: [{ uid: 10001, nickname: "旅行者" }],
      images: [{ url: "https://example.com/reply.png", width: 640, height: 480 }],
      customEmoticon: {
        id: "custom-1",
        url: "https://example.com/custom.webp",
        size: { width: 128, height: 128 },
      },
      gameUid: {
        game_biz: "hk4e_cn",
        game_name: "原神",
        game_uid: "100000001",
        level: 60,
        nickname: "旅行者",
        region_name: "天空岛",
      },
    };
    session.draft.value = saved;
    session.open.value = false;
    // 父组件关闭动画结束后会清理展示用的回复目标。
    session.target.value = undefined;
    await nextTick();
    // 模拟 Vue 在同一轮更新中先同步 v-model，再同步 target prop。
    session.open.value = true;
    session.target.value = targetId;
    await nextTick();
    expect(session.draft.value).toEqual(saved);
  });

  it("换目标时丢弃上一个草稿，返回旧目标也不恢复历史草稿", async () => {
    const session = createSession();
    session.target.value = "reply-a";
    session.open.value = true;
    await nextTick();
    session.draft.value.content = "给 A 的回复";
    session.open.value = false;
    session.target.value = "reply-b";
    session.open.value = true;
    await nextTick();
    expect(session.draft.value).toEqual(createReplyDraft());
    session.draft.value.content = "给 B 的回复";
    session.target.value = "reply-a";
    await nextTick();
    expect(session.draft.value).toEqual(createReplyDraft());
  });

  it("普通评论与定向回复之间切换时清空草稿", async () => {
    const session = createSession();
    session.open.value = true;
    await nextTick();
    session.draft.value.content = "普通评论";
    session.target.value = "reply-a";
    await nextTick();
    expect(session.draft.value).toEqual(createReplyDraft());
    session.draft.value.content = "定向回复";
    session.target.value = undefined;
    await nextTick();
    expect(session.draft.value).toEqual(createReplyDraft());
  });

  it.each(<const>["postId", "gid", "uid", "token"])(
    "%s 变化时清空隐藏浮层的草稿",
    async (field) => {
      const session = createSession();
      session.open.value = true;
      await nextTick();
      session.draft.value.content = "旧上下文的内容";
      session.open.value = false;
      if (field === "gid") session.gid.value = 5;
      else session[field].value = "changed";
      expect(session.draft.value).toEqual(createReplyDraft());
    },
  );

  it("发布清空后重开不会恢复旧内容，新页面会话也不继承草稿", async () => {
    const session = createSession();
    session.target.value = "reply-a";
    session.open.value = true;
    await nextTick();
    session.draft.value.content = "已发布内容";
    session.draft.value = createReplyDraft();
    session.open.value = false;
    session.open.value = true;
    await nextTick();
    expect(session.draft.value).toEqual(createReplyDraft());
    session.draft.value.content = "刷新前的内容";
    const refreshed = createSession();
    refreshed.target.value = "reply-a";
    refreshed.open.value = true;
    await nextTick();
    expect(refreshed.draft.value).toEqual(createReplyDraft());
  });
});
