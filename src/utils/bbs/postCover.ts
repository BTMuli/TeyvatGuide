/**
 * 帖子卡片封面解析。
 * @since Beta v0.14.1
 */

import { getPostImageOriginalUrl, getPostImageThumbnailUrl } from "@utils/bbs/postImage.js";

/**
 * 帖子封面最大显示高度。
 * @since Beta v0.14.1
 */
export const POST_COVER_MAX_HEIGHT = 480;

/**
 * 获取帖子卡片使用的封面及尺寸。
 * @since Beta v0.14.1
 * @param post - 帖子数据
 * @returns 封面地址与尺寸；没有可用图片时为 undefined
 */
export function getPostCover(post: TGApp.BBS.Post.FullData): TGApp.BBS.Post.CoverImage | undefined {
  const source =
    post.cover?.url || post.post.cover || post.post.images[0] || post.image_list[0]?.url;
  if (!source) return undefined;
  const sourceKey = getImageUrlKey(source);
  const sized = [post.cover, ...post.image_list].find(
    (image): image is TGApp.BBS.Post.Image =>
      image !== null &&
      image.url !== "" &&
      image.width > 0 &&
      image.height > 0 &&
      getImageUrlKey(image.url) === sourceKey,
  );
  return {
    url: source,
    width: sized?.width ?? 0,
    height: sized?.height ?? 0,
  };
}

/**
 * 获取帖子封面的显示比例，用于预估瀑布流高度。
 * @since Beta v0.14.1
 * @param post - 帖子数据
 * @returns 封面宽高比；缺少封面或尺寸时按空封面 69:32 处理
 */
export function getPostCoverRatio(post: TGApp.BBS.Post.FullData): number {
  const cover = getPostCover(post);
  if (!cover || cover.width <= 0 || cover.height <= 0) return 69 / 32;
  return cover.width / cover.height;
}

/**
 * 获取帖子卡片实际加载的封面地址。
 * @since Beta v0.14.1
 * @param source - 封面原地址
 * @param width - 卡片中的封面宽度
 * @param quality - 有损图片的目标质量
 * @param useOriginal - 是否强制使用原图
 * @returns 封面地址
 */
export function getPostCoverUrl(
  source: string,
  width: number,
  quality: number,
  useOriginal: boolean = false,
): string {
  if (!source) return "";
  const original = getPostImageOriginalUrl(source);
  const pathname = original?.pathname ?? source.split("?")[0];
  if (useOriginal || pathname.toLowerCase().endsWith(".gif")) {
    return original?.href ?? source;
  }
  return getPostImageThumbnailUrl(source, width, quality);
}

/**
 * 去掉查询参数后的图片地址，用于匹配同一张图片。
 * @since Beta v0.14.1
 * @param url - 图片地址
 * @returns 用于比较的地址
 */
function getImageUrlKey(url: string): string {
  return url.split("?")[0];
}
