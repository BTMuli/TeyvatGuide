/**
 * 帖子视频节点的可播放分辨率辅助函数。
 * @since Beta v0.13.0
 */

import { isPostUrl } from "@utils/bbs/postDocument.js";
import { isRecord } from "@utils/common/typeGuards.js";

/**
 * 过滤并归一化播放器会直接消费的分辨率字段。
 * @since Beta v0.13.0
 * @param value - 未知的分辨率条目
 * @returns 可播放的分辨率；字段不足时返回 undefined
 */
function normalizePostVodResolution(value: unknown): TGApp.BBS.PostVod.Resolution | undefined {
  if (!isRecord(value) || !isPostUrl(value.url)) return undefined;
  const url = value.url;
  const width = value.width;
  const height = value.height;
  if (
    !url ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return undefined;
  }
  const size =
    typeof value.size === "number" && Number.isFinite(value.size) && value.size >= 0
      ? value.size
      : 0;
  const label =
    typeof value.label === "string" && value.label.trim()
      ? value.label
      : typeof value.definition === "string" && value.definition.trim()
        ? value.definition
        : `${Math.round(height)}P`;
  const format = typeof value.format === "string" && value.format.trim() ? value.format : "MP4";
  return { url, width, height, size, label, format };
}

/**
 * 提取播放器需要的有效视频分辨率，缺失或不完整的条目会被丢弃。
 * @since Beta v0.13.0
 * @param value - 未知的视频分辨率列表
 * @returns 可供播放器使用的分辨率列表
 */
export function getPostVodResolutions(value: unknown): Array<TGApp.BBS.PostVod.Resolution> {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePostVodResolution)
    .filter((item): item is TGApp.BBS.PostVod.Resolution => item !== undefined);
}

/**
 * 选择文件体积最大的可播放视频分辨率。
 * @since Beta v0.13.0
 * @param resolutions - 已归一化的视频分辨率
 * @returns 最适合播放的分辨率；没有可播放数据时返回 undefined
 */
export function pickPostVodResolution(
  resolutions: ReadonlyArray<TGApp.BBS.PostVod.Resolution>,
): TGApp.BBS.PostVod.Resolution | undefined {
  let selected: TGApp.BBS.PostVod.Resolution | undefined;
  for (const resolution of resolutions) {
    if (selected === undefined || resolution.size > selected.size) selected = resolution;
  }
  return selected;
}
