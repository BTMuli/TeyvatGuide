/**
 * 独立帖子编辑页面的草稿隔离与往返测试。
 * @since Beta v0.12.6
 */
import { beforeEach, describe, expect, it } from "vitest";

import { deletePostDraft, getPostDraft, savePostDraft } from "../src/utils/bbsPostDraft.js";

const settings: TGApp.BBS.PostEdit.Settings = {
  gid: 2,
  forumId: 26,
  subject: "编辑草稿",
  nodes: [{ insert: "草稿正文\n" }],
  topicIds: [],
  cateId: 0,
  isOriginal: 0,
  republishAuthorization: 0,
  cover: "",
};
const seed = <TGApp.BBS.Post.FullData>(<unknown>{
  post: { post_id: "123", uid: "1", structured_content: '[{"insert":"原帖\\n"}]' },
});

beforeEach(() => {
  for (const uid of ["1", "2"]) {
    for (const postId of ["123", "456"]) deletePostDraft(uid, postId);
  }
});

describe("post editor draft navigation", () => {
  it("restores only the same account and post", () => {
    savePostDraft("1", "123", { settings, seed });

    expect(getPostDraft("1", "123")?.settings.subject).toBe("编辑草稿");
    expect(getPostDraft("2", "123")).toBeUndefined();
    expect(getPostDraft("1", "456")).toBeUndefined();
  });

  it("keeps a snapshot independent of live editor changes and restored references", () => {
    const live = structuredClone({ settings, seed });
    savePostDraft("1", "123", live);
    live.settings.subject = "后续修改";
    live.seed.post.structured_content = "changed";
    const restored = getPostDraft("1", "123");
    if (!restored) throw new Error("Expected saved draft");
    restored.settings.nodes[0].insert = "修改副本";

    expect(getPostDraft("1", "123")).toEqual({ settings, seed });
  });

  it("clears a successful edit without deleting another account's draft", () => {
    savePostDraft("1", "123", { settings, seed });
    savePostDraft("2", "123", { settings, seed });
    deletePostDraft("1", "123");

    expect(getPostDraft("1", "123")).toBeUndefined();
    expect(getPostDraft("2", "123")).toEqual({ settings, seed });
  });
});
