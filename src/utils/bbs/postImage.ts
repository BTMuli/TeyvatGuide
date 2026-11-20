/**
 * 米游社帖子图片地址处理。
 * @since Beta v0.13.2
 */

/**
 * 获取帖子原图地址，保留图片处理以外的查询参数。
 * @since Beta v0.13.2
 * @param source - 帖子的图片地址
 * @returns 可预览的原图地址
 */
export function getPostImageOriginalUrl(source: string): URL | undefined {
  if (!URL.canParse(source)) return undefined;
  const url = new URL(source);
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  url.searchParams.delete("x-oss-process");
  return url;
}

/**
 * 按布局尺寸请求米游社图片缩略图，保留原图格式和比例。
 * @since Beta v0.13.2
 * @param source - 帖子的图片地址
 * @param size - 布局中的目标宽度或高度
 * @param quality - 有损图片的目标质量
 * @param dimension - 用于缩放的尺寸方向
 * @returns 缩略图地址
 */
export function getPostImageThumbnailUrl(
  source: string,
  size: number,
  quality: number,
  dimension: "width" | "height" = "width",
): string {
  if (!Number.isFinite(size) || size <= 0) return source;
  const url = getPostImageOriginalUrl(source);
  if (
    !url ||
    (url.hostname !== "upload-bbs.miyoushe.com" && url.hostname !== "upload-bbs.mihoyo.com")
  ) {
    return source;
  }
  const fitSize = Math.min(16384, Math.ceil(size));
  const axis = dimension === "height" ? "h" : "w";
  const qualityStep =
    /\.(?:jpe?g|webp)$/i.test(url.pathname) && quality >= 1 && quality < 100
      ? `/quality,Q_${Math.round(quality)}`
      : "";
  url.searchParams.set("x-oss-process", `image/resize,${axis}_${fitSize}${qualityStep}`);
  return url.href;
}
