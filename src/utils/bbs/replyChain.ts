/**
 * 米游社回复祖先链工具
 * @since Beta v0.13.0
 */

/**
 * 构建一级主回复到目标子回复之间的祖先链。
 * @since Beta v0.13.0
 * @param root - 一级主回复
 * @param target - 被回复的子回复
 * @param knownReplies - 当前已加载的子回复
 * @param inheritedAncestors - 子级组件已解析的祖先，按一级主回复到直接上级排列
 * @returns 一级主回复在前、直接上级在后的祖先链
 */
export function resolveReplyAncestors(
  root: TGApp.BBS.Reply.ReplyFull,
  target: TGApp.BBS.Reply.ReplyFull,
  knownReplies: ReadonlyArray<TGApp.BBS.Reply.ReplyFull> = [],
  inheritedAncestors: ReadonlyArray<TGApp.BBS.Reply.ReplyFull> = [],
): Array<TGApp.BBS.Reply.ReplyFull> {
  const known = new Map<string, TGApp.BBS.Reply.ReplyFull>();
  const remember = (reply: TGApp.BBS.Reply.ReplyFull): void => {
    if (!known.has(reply.reply.reply_id)) known.set(reply.reply.reply_id, reply);
  };
  remember(root);
  root.sub_replies.forEach(remember);
  knownReplies.forEach(remember);
  inheritedAncestors.forEach(remember);

  const nearestFirst: Array<TGApp.BBS.Reply.ReplyFull> = [];
  const visited = new Set<string>([target.reply.reply_id]);
  let parentId = target.reply.f_reply_id;
  while (parentId !== "" && parentId !== "0" && !visited.has(parentId)) {
    if (parentId === root.reply.reply_id) break;
    const parent = known.get(parentId);
    if (parent === undefined) break;
    visited.add(parentId);
    nearestFirst.push(parent);
    parentId = parent.reply.f_reply_id;
  }
  for (const ancestor of [...inheritedAncestors].reverse()) {
    const replyId = ancestor.reply.reply_id;
    if (replyId === root.reply.reply_id || visited.has(replyId)) continue;
    visited.add(replyId);
    nearestFirst.push(ancestor);
  }
  return [root, ...nearestFirst.reverse()];
}
