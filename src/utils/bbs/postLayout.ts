/**
 * 帖子列表布局模式。
 * @since Beta v0.14.1
 */

/** 帖子列表布局模式。 */
export const postLayout = <const>{
  GRID: "grid",
  WATERFALL: "waterfall",
  LIST: "list",
};

/** 帖子列表布局模式类型。 */
export type PostLayout = (typeof postLayout)[keyof typeof postLayout];
