/**
 * @file utils saveImg.ts
 * @description 用于保存图片的工具模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { dialog, fs, http } from "@tauri-apps/api";

/**
 * @description 保存图片-canvas
 * @since Alpha v0.2.0
 * @param {HTMLCanvasElement} canvas - canvas元素
 * @param {string} filename - 文件名
 * @returns {Promise<void>} 无返回值
 */
export async function saveCanvasImg (canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const buffer = new Uint8Array(atob(canvas.toDataURL("image/png").split(",")[1]).split("").map((item) => item.charCodeAt(0)));
  await dialog.save({
    defaultPath: filename,
    filters: [{ name: "图片", extensions: ["png"] }],
  }).then(async (res) => {
    if (res === null) return;
    await fs.writeBinaryFile({
      path: res,
      contents: buffer,
    });
  });
}

/**
 * @description 将图片保存到本地
 * @since Alpha v0.2.0
 * @param {string} url - 图片链接
 * @returns {Promise<string>} 图片元素
 */
export async function saveImgLocal (url: string): Promise<string> {
  return await http.fetch<ArrayBuffer>(url, {
    method: "GET",
    responseType: http.ResponseType.Binary,
  }).then(async (res) => {
    const buffer = new Uint8Array(res.data);
    const blob = new Blob([buffer], { type: "image/png" });
    return URL.createObjectURL(blob);
  });
}
