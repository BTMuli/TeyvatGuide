/**
 * 米游社帖子发布版块筛选。
 * @since Beta v0.12.6
 */

const publishableForumSrcTypes: ReadonlySet<number> = new Set([0, 2, 3]);

/**
 * 判断版块是否允许发布指定类型的帖子。
 * @since Beta v0.12.6
 * @param forum - 米游社版块信息
 * @param viewType - 帖子类型，1 为长文，2 为图文
 * @returns 是否允许发布
 */
export function canPublishForumPost(
  forum: Pick<TGApp.BBS.Forum.GameForumItem, "post_limit" | "visible" | "src_type" | "view_type">,
  viewType: 1 | 2,
): boolean {
  if (forum.post_limit !== 3 || forum.visible !== 1) return false;
  if (!publishableForumSrcTypes.has(forum.src_type)) return false;
  return viewType === 2 || forum.view_type === 1;
}
