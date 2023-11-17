/**
 * @file utils TGShare.ts
 * @description 生成分享截图并保存到本地
 * @since Beta v0.3.6
 */

import { dialog, fs, http, path } from "@tauri-apps/api";
import html2canvas from "html2canvas";

import showSnackbar from "../components/func/snackbar";

/**
 * @description 保存图片-canvas
 * @since Beta v0.3.4
 * @param {HTMLCanvasElement} canvas - canvas元素
 * @param {string} filename - 文件名
 * @returns {Promise<void>} 无返回值
 */
async function saveCanvasImg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const buffer = new Uint8Array(
    atob(canvas.toDataURL("image/png").split(",")[1])
      .split("")
      .map((item) => item.charCodeAt(0)),
  );
  await dialog
    .save({
      title: "保存图片",
      filters: [{ name: "图片", extensions: ["png"] }],
      defaultPath: `${await path.downloadDir()}${path.sep}${filename}.png`,
    })
    .then(async (res) => {
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
export async function saveImgLocal(url: string): Promise<string> {
  return await http
    .fetch<ArrayBuffer>(url, {
      method: "GET",
      responseType: http.ResponseType.Binary,
    })
    .then(async (res) => {
      const buffer = new Uint8Array(res.data);
      const blob = new Blob([buffer], { type: "image/png" });
      return URL.createObjectURL(blob);
    });
}

/**
 * @description 获取分享截图背景色
 * @since Beta v0.3.2
 * @returns {string} 背景色
 */
function getShareImgBgColor(): string {
  let theme = localStorage.getItem("theme");
  if (theme) {
    theme = JSON.parse(theme).theme;
  }
  if (theme === "dark") {
    return "#1e1e1e";
  } else {
    return "#f9f6f2";
  }
}

/**
 * @description 生成分享截图
 * @since Beta v0.3.6
 * @param {string} fileName - 文件名
 * @param {HTMLElement} element - 元素
 * @param {number} scale - 缩放比例
 * @param {number} offset - 偏移量
 * @returns {Promise<void>} 无返回值
 */
export async function generateShareImg(
  fileName: string,
  element: HTMLElement,
  scale: number = 1.2,
  offset: number = 30,
): Promise<void> {
  const canvas = document.createElement("canvas");
  const width = element.clientWidth + offset;
  const height = element.clientHeight + offset;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const opts = {
    backgroundColor: getShareImgBgColor(),
    windowHeight: height,
    scale,
    width,
    height,
    useCORS: true,
    canvas,
    x: (-offset / 2) * scale,
    y: (-offset / 2) * scale,
    dpi: 350,
  };
  const canvasData = await html2canvas(element, opts);
  try {
    await copyToClipboard(canvasData);
    showSnackbar({
      text: `已将 ${fileName} 复制到剪贴板`,
    });
  } catch (e) {
    await saveCanvasImg(canvasData, fileName);
  }
}

/**
 * @description 复制到剪贴板
 * @since Beta v0.3.2
 * @param {HTMLCanvasElement} canvas - canvas元素
 * @returns {Promise<void>} 无返回值
 */
async function copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const buffer = new Uint8Array(
    atob(canvas.toDataURL("image/png").split(",")[1])
      .split("")
      .map((item) => item.charCodeAt(0)),
  );
  const blob = new Blob([buffer], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
  URL.revokeObjectURL(url);
}
