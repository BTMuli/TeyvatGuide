/**
 * 图区榜单类型与封面。
 * @since Beta v0.14.1
 */

/** 榜单类型选项。 @since Beta v0.14.1 */
type ImageRankOption = {
  /** 榜单名称 */
  title: string;
  /** 榜单类型值 */
  value: number;
  /** 榜单图标 */
  icon: string;
};

const imageRankOptions: Array<ImageRankOption> = [
  { title: "日榜", value: 1, icon: "mdi-calendar-today" },
  { title: "周榜", value: 2, icon: "mdi-calendar-week" },
  { title: "月榜", value: 3, icon: "mdi-calendar-month-outline" },
  { title: "新人榜", value: 4, icon: "mdi-account-star-outline" },
];

/**
 * 取出版块已开放的榜单类型。
 * @since Beta v0.13.2
 * @param types - 版块返回的榜单类型
 * @returns 用于选择榜单的选项
 */
export function getImageRankOptions(
  types: Array<number>,
): Array<{ title: string; value: number; icon: string }> {
  return imageRankOptions.filter(({ value }) => types.includes(value));
}

/**
 * 获取单个榜单类型选项。
 * @since Beta v0.14.1
 * @param value - 榜单类型值
 * @returns 榜单选项；未知类型时为 undefined
 */
export function getImageRankOption(value: number): ImageRankOption | undefined {
  return imageRankOptions.find((item) => item.value === value);
}

/**
 * 获取带尺寸的榜单封面，优先使用帖子封面。
 * @since Beta v0.13.2
 * @param post - 榜单帖子
 * @returns 带尺寸的封面
 */
export function getRankCover(
  post: TGApp.BBS.Forum.ImageRankPost,
): TGApp.BBS.Forum.ImageRankCover | undefined {
  return post.cover?.url ? post.cover : post.image_list[0];
}

/**
 * 获取榜单封面的显示比例，用于预估瀑布流高度。
 * @since Beta v0.13.2
 * @param post - 榜单帖子
 * @returns 封面宽高比
 */
export function getRankCoverRatio(post: TGApp.BBS.Forum.ImageRankPost): number {
  const cover = getRankCover(post);
  if (!cover || cover.width <= 0 || cover.height <= 0) return 4 / 3;
  return Math.min(2.2, Math.max(0.65, cover.width / cover.height));
}
