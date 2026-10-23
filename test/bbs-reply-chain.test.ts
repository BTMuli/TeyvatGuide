/**
 * 米游社回复祖先链回归测试。
 * @since Beta v0.12.6
 */

import { describe, expect, it } from "vitest";

import { resolveReplyAncestors } from "../src/utils/bbsReplyChain.js";

/**
 * 创建仅包含祖先链所需字段的回复。
 * @since Beta v0.12.6
 * @param id - 回复 ID
 * @param parentId - 直接上级回复 ID
 * @returns 回复测试数据
 */
function createReply(id: string, parentId: string): TGApp.BBS.Reply.ReplyFull {
  return <TGApp.BBS.Reply.ReplyFull>(<unknown>{
    reply: { reply_id: id, f_reply_id: parentId },
    sub_replies: [],
  });
}

/**
 * 提取回复链中的 ID。
 * @since Beta v0.12.6
 * @param chain - 回复链
 * @returns 回复 ID 列表
 */
function getReplyIds(chain: Array<TGApp.BBS.Reply.ReplyFull>): Array<string> {
  return chain.map((item) => item.reply.reply_id);
}

const main = createReply("main", "0");
const first = createReply("first", "main");
const second = createReply("second", "first");
const target = createReply("target", "second");
const knownReplies = [first, second];

describe("resolveReplyAncestors", () => {
  it("walks sub replies up to the first-level main reply", () => {
    expect(getReplyIds(resolveReplyAncestors(main, target, knownReplies))).toEqual([
      "main",
      "first",
      "second",
    ]);
  });

  it("keeps inherited ancestors in root-to-parent order when data is incomplete", () => {
    expect(getReplyIds(resolveReplyAncestors(main, target, [first], [first, second]))).toEqual([
      "main",
      "first",
      "second",
    ]);
  });

  it("always includes the first-level main reply when the parent is unavailable", () => {
    expect(getReplyIds(resolveReplyAncestors(main, target))).toEqual(["main"]);
  });

  it("stops on malformed parent references and cycles", () => {
    const malformed = createReply("malformed", "0");
    expect(getReplyIds(resolveReplyAncestors(main, malformed, [], [first, second]))).toEqual([
      "main",
      "first",
      "second",
    ]);

    const cyclic = createReply("cyclic", "cyclic");
    expect(getReplyIds(resolveReplyAncestors(main, cyclic, [], [first, second]))).toEqual([
      "main",
      "first",
      "second",
    ]);
  });
});
