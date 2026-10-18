/**
 * 当前窗口内按账号和帖子隔离的编辑草稿。
 * @since Beta v0.12.6
 */

/**
 * 保留来源快照的帖子编辑草稿。
 * @since Beta v0.12.6
 */
type PostDraft = {
  settings: TGApp.BBS.PostEdit.Settings;
  seed: TGApp.BBS.Post.FullData;
};

const drafts = new Map<string, PostDraft>();

/**
 * 读取当前窗口的帖子草稿副本。
 * @since Beta v0.12.6
 * @param uid - 编辑账号
 * @param postId - 帖子 ID
 * @returns 已保存的草稿或 undefined
 */
export function getPostDraft(uid: string, postId: string): PostDraft | undefined {
  const draft = drafts.get(`${uid}:${postId}`);
  return draft ? structuredClone(draft) : undefined;
}

/**
 * 保存当前账号的帖子草稿副本。
 * @since Beta v0.12.6
 * @param uid - 编辑账号
 * @param postId - 帖子 ID
 * @param draft - 正文设置和来源快照
 */
export function savePostDraft(uid: string, postId: string, draft: PostDraft): void {
  drafts.set(`${uid}:${postId}`, structuredClone(draft));
}

/**
 * 在保存成功后移除对应草稿。
 * @since Beta v0.12.6
 * @param uid - 编辑账号
 * @param postId - 帖子 ID
 */
export function deletePostDraft(uid: string, postId: string): void {
  drafts.delete(`${uid}:${postId}`);
}
