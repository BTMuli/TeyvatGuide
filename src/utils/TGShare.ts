/**
 * @file utils/TGShare.ts
 * @description 生成分享截图并保存到本地
 * @since Beta v0.3.8
 */

import { dialog, fs, http, path } from "@tauri-apps/api";
import html2canvas from "html2canvas";

import { bytesToSize } from "./toolFunc";
import showConfirm from "../components/func/confirm";
import showSnackbar from "../components/func/snackbar";

/**
 * @description 保存图片-canvas
 * @since Beta v0.3.7
 * @param {Uint8Array} buffer - 图片数据
 * @param {string} filename - 文件名
 * @returns {Promise<void>} 无返回值
 */
async function saveCanvasImg(buffer: Uint8Array, filename: string): Promise<void> {
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
 * @since Beta v0.3.8
 * @param {string} fileName - 文件名
 * @param {HTMLElement} element - 元素
 * @param {number} scale - 缩放比例
 * @returns {Promise<void>} 无返回值
 */
export async function generateShareImg(
  fileName: string,
  element: HTMLElement,
  scale: number = 1.2,
): Promise<void> {
  const canvas = document.createElement("canvas");
  const width = element.clientWidth + 30;
  const height = element.clientHeight + 30;
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
    x: -10,
    y: -15,
    dpi: 350,
  };
  const canvasData = await html2canvas(element, opts);
  const buffer = new Uint8Array(
    atob(canvasData.toDataURL("image/png").split(",")[1])
      .split("")
      .map((item) => item.charCodeAt(0)),
  );
  const size = buffer.length;
  const sizeStr = bytesToSize(size);
  if (size > 80000000) {
    showSnackbar({
      text: `图像大小为 ${sizeStr}，过大，无法保存`,
      color: "warn",
      timeout: 3000,
    });
    return;
  }
  if (size > 20000000) {
    const sizeStr = bytesToSize(size);
    const saveFile = await showConfirm({
      title: "图像过大",
      text: `图像大小为 ${sizeStr}，是否保存到文件？`,
    });
    if (!saveFile) {
      showSnackbar({
        color: "warn",
        text: "将尝试报存到剪贴板",
      });
    } else {
      await saveCanvasImg(buffer, fileName);
      return;
    }
  }
  try {
    await copyToClipboard(buffer);
    showSnackbar({
      text: `已将 ${fileName} 复制到剪贴板，大小为 ${sizeStr}`,
    });
  } catch (e) {
    await saveCanvasImg(buffer, fileName);
  }
}

/**
 * @description 复制到剪贴板
 * @since Beta v0.3.7
 * @param {Uint8Array} buffer - 图片数据
 * @returns {Promise<void>} 无返回值
 */
async function copyToClipboard(buffer: Uint8Array): Promise<void> {
  const blob = new Blob([buffer], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
  URL.revokeObjectURL(url);
}
