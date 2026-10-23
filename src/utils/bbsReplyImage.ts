/**
 * 米游社回复图片的本地校验与尺寸读取
 * @since Beta v0.12.6
 */
import Md5 from "js-md5";

// 本地资源保护上限，独立于单位尚未确认的上传凭证 max_file_size。
const maxLocalImageSize = 20 * 1024 * 1024;

/**
 * 检查文件头的固定字节
 * @since Beta v0.12.6
 * @param bytes - 文件字节
 * @param expected - 预期字节
 * @param offset - 文件偏移
 * @returns 是否匹配
 */
function matchesHeader(bytes: Uint8Array, expected: Array<number>, offset: number = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

/**
 * 根据原始文件头识别支持的图片格式
 * @since Beta v0.12.6
 * @param bytes - 文件字节
 * @returns 图片格式
 */
function getImageFormat(
  bytes: Uint8Array,
): Pick<TGApp.BBS.ReplyAsset.PreparedImage, "ext" | "contentType"> {
  if (matchesHeader(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: "png", contentType: "image/png" };
  }
  if (matchesHeader(bytes, [0xff, 0xd8, 0xff])) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (
    matchesHeader(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matchesHeader(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return { ext: "gif", contentType: "image/gif" };
  }
  if (
    matchesHeader(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    matchesHeader(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { ext: "webp", contentType: "image/webp" };
  }
  throw new Error("请选择 PNG、JPEG、GIF 或 WebP 图片");
}

/**
 * 读取本地图片尺寸，并在结束或取消时释放临时 URL
 * @since Beta v0.12.6
 * @param file - 本地图片
 * @param signal - 取消信号
 * @returns 图片尺寸
 */
async function getImageDimensions(
  file: File,
  signal?: AbortSignal,
): Promise<Pick<TGApp.BBS.ReplyAsset.PreparedImage, "width" | "height">> {
  signal?.throwIfAborted();
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await new Promise((resolve, reject) => {
      abort = () => reject(signal?.reason ?? new DOMException("已取消上传", "AbortError"));
      signal?.addEventListener("abort", abort, { once: true });
      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (
          !Number.isSafeInteger(width) ||
          !Number.isSafeInteger(height) ||
          width <= 0 ||
          height <= 0
        ) {
          reject(new Error("无法读取图片尺寸，请重新选择图片"));
          return;
        }
        resolve({ width, height });
      };
      image.onerror = () => reject(new Error("无法读取图片，请确认文件未损坏"));
      timeout = setTimeout(() => reject(new Error("读取图片超时，请重新选择图片")), 15000);
      if (signal?.aborted) abort();
      else image.src = objectUrl;
    });
  } finally {
    clearTimeout(timeout);
    if (abort) signal?.removeEventListener("abort", abort);
    image.onload = null;
    image.onerror = null;
    image.src = "";
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 校验回复图片并准备原始文件摘要与尺寸
 * @since Beta v0.12.6
 * @param file - 用户选择的图片
 * @param signal - 取消信号
 * @returns 已准备的图片信息
 */
export async function prepareReplyImage(
  file: File,
  signal?: AbortSignal,
): Promise<TGApp.BBS.ReplyAsset.PreparedImage> {
  signal?.throwIfAborted();
  if (!(file instanceof File) || file.size === 0) throw new Error("请选择非空的图片文件");
  if (file.size > maxLocalImageSize) throw new Error("图片不能超过 20 MiB，请重新选择图片");
  const bytes = await file.arrayBuffer();
  signal?.throwIfAborted();
  const format = getImageFormat(new Uint8Array(bytes));
  if (file.type && file.type !== format.contentType) {
    throw new Error("图片类型与文件内容不一致，请重新选择图片");
  }
  const dimensions = await getImageDimensions(file, signal);
  signal?.throwIfAborted();
  return {
    bytes,
    md5: Md5.md5(bytes),
    ...format,
    size: file.size,
    ...dimensions,
  };
}
