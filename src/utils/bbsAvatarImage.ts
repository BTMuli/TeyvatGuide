/**
 * 米游社自定义头像的本地裁剪与静态图片转换。
 * @since Beta v0.13.0
 */

import { prepareReplyImage } from "@utils/bbsReplyImage.js";

// 本地输出规格，不代表米游社服务端的尺寸限制。
const maxAvatarSize = 512;

/**
 * 自定义头像裁剪参数。
 * @since Beta v0.13.0
 */
type CustomAvatarPrepareOptions = {
  /** 裁切位置，缺省时居中 */
  crop?: TGApp.BBS.CommunitySettings.AvatarCrop;
  /** 可选的取消信号 */
  signal?: AbortSignal;
};

/**
 * 将裁切位置限制在 0 到 1 之间。
 * @since Beta v0.13.0
 * @param value - 原始位置
 * @returns 有效的裁切位置
 */
function normalizeCropPosition(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/**
 * 校验图片并按指定位置转换为方形静态头像。
 * @since Beta v0.13.0
 * @param file - 用户选择的原始图片
 * @param options - 裁切位置与取消信号
 * @returns 最大 512px、保持透明度的 PNG 头像文件
 */
export async function prepareCustomAvatar(
  file: File,
  options: CustomAvatarPrepareOptions = {},
): Promise<File> {
  const signal = options.signal;
  await prepareReplyImage(file, signal);
  signal?.throwIfAborted();
  const bitmap = await createImageBitmap(file);
  try {
    signal?.throwIfAborted();
    const side = Math.min(bitmap.width, bitmap.height);
    if (side <= 0) throw new Error("无法读取头像尺寸，请重新选择图片");
    const cropX = (bitmap.width - side) * normalizeCropPosition(options.crop?.x);
    const cropY = (bitmap.height - side) * normalizeCropPosition(options.crop?.y);
    const canvas = document.createElement("canvas");
    const outputSize = Math.min(maxAvatarSize, side);
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法处理头像图片，请重新选择图片");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, cropX, cropY, side, side, 0, 0, outputSize, outputSize);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("无法生成头像图片，请重新选择图片"));
      }, "image/png");
    });
    signal?.throwIfAborted();
    const name = file.name.replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${name}.png`, { type: "image/png" });
  } finally {
    bitmap.close();
  }
}
