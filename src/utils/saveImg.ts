/**
 * @file utils saveImg.ts
 * @description 用于保存图片的工具模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { dialog, fs } from "@tauri-apps/api";

/**
 * @description 保存图片-canvas
 * @since Alpha v0.2.0
 * @param {HTMLCanvasElement} canvas - canvas元素
 * @param {string} filename - 文件名
 * @returns {Promise<void>} 无返回值
 */
export async function saveCanvasImg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const buffer = new Uint8Array(atob(canvas.toDataURL("image/png").split(",")[1]).split("").map((item) => item.charCodeAt(0)));
  await dialog.save({
    defaultPath: filename,
    filters: [{ name: "图片", extensions: ["png"] }]
  }).then(async (res) => {
    if (res === null) return;
    await fs.writeBinaryFile({
      path: res,
      contents: buffer
    });
  });
}