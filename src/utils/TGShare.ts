/**
 * @file utils/TGShare.ts
 * @description 生成分享截图并保存到本地
 * @since Beta v0.7.1
 */

import showSnackbar from "@comp/func/snackbar.js";
import { path } from "@tauri-apps/api";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import html2canvas from "html2canvas";
import { storeToRefs } from "pinia";

import TGHttp from "./TGHttp.js";
import TGLogger from "./TGLogger.js";
import { bytesToSize } from "./toolFunc.js";

import { useAppStore } from "@/store/modules/app.js";

/**
 * @description 保存图片-canvas
 * @since Beta v0.6.4
 * @param {Uint8Array} buffer - 图片数据
 * @param {string} filename - 文件名
 * @param {string} format - 文件格式
 * @returns {Promise<void>} 无返回值
 */
export async function saveCanvasImg(
  buffer: Uint8Array,
  filename: string,
  format?: string,
): Promise<void> {
  if (format === undefined) format = "png";
  const res = await save({
    title: "保存图片",
    filters: [{ name: "图片", extensions: [format] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}${filename}.${format}`,
  });
  if (res === null) {
    await TGLogger.Info(`[saveCanvasImg][${filename}] 未选择保存路径`);
    showSnackbar.cancel("未选择保存路径");
    return;
  }
  await writeFile(res, buffer);
  await TGLogger.Info(`[saveCanvasImg][${filename}] 已将图像保存到本地`);
  showSnackbar.success(`已将 ${filename} 保存到本地，大小为 ${bytesToSize(buffer.length)}`);
}

/**
 * @description 将图片保存到本地
 * @since Beta v0.5.0
 * @param {string} url - 图片链接
 * @returns {Promise<string>} 图片元素
 */
export async function saveImgLocal(url: string): Promise<string> {
  const res = await TGHttp<Uint8Array>(url, { method: "GET", isBlob: true });
  const buffer = new Uint8Array(res);
  const blob = new Blob([buffer], { type: "image/png" });
  return URL.createObjectURL(blob);
}

/**
 * @description 返回图片 buffer
 * @since Beta v0.5.0
 * @param {string} url - 图片链接
 * @returns {Promise<Uint8Array>} 图片 buffer
 */
export async function getImageBuffer(url: string): Promise<Uint8Array> {
  const res = await TGHttp<Uint8Array>(url, { method: "GET", isBlob: true });
  return new Uint8Array(res);
}

/**
 * @description 获取分享截图背景色
 * @since Beta v0.3.2
 * @returns {string} 背景色
 */
function getShareImgBgColor(): string {
  let theme = localStorage.getItem("theme");
  if (theme) theme = JSON.parse(theme).theme;
  if (theme === "dark") return "#1e1e1e";
  return "#f9f6f2";
}

/**
 * @description 生成分享截图
 * @since Beta v0.7.1
 * @param {string} fileName - 文件名
 * @param {HTMLElement} element - 元素
 * @param {number} scale - 缩放比例
 * @param {boolean} scrollable - 是否可滚动，一般为上下滚动
 * @returns {Promise<void>} 无返回值
 */
export async function generateShareImg(
  fileName: string,
  element: HTMLElement,
  scale: number = 1.2,
  scrollable: boolean = false,
): Promise<void> {
  const canvas = document.createElement("canvas");
  const maxHeight = element.style.maxHeight;
  if (scrollable) element.style.maxHeight = "100%";
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
  let canvasData;
  try {
    // @ts-expect-error This expression is not callable.
    canvasData = await html2canvas(element, opts);
  } catch (e) {
    await TGLogger.Error(`[generateShareImg][${fileName}] 生成分享截图失败 ${e}`);
    showSnackbar.error(`生成分享截图失败: ${e}`);
    return;
  }
  if (scrollable) element.style.maxHeight = maxHeight;
  const buffer = new Uint8Array(
    atob(canvasData.toDataURL("image/png").split(",")[1])
      .split("")
      .map((item) => item.charCodeAt(0)),
  );
  const size = buffer.length;
  const sizeStr = bytesToSize(size);
  await TGLogger.Info(`[generateShareImg][${fileName}] 图像大小为 ${sizeStr}`);
  const { shareDefaultFile } = storeToRefs(useAppStore());
  if (shareDefaultFile.value === 0) {
    await saveCanvasImg(buffer, fileName);
    return;
  }
  if (typeof shareDefaultFile.value === "number" && size > shareDefaultFile.value * 1024 * 1024) {
    await saveCanvasImg(buffer, fileName);
    return;
  }
  try {
    await copyToClipboard(buffer);
    showSnackbar.success(`已将 ${fileName} 复制到剪贴板，大小为 ${sizeStr}`);
    await TGLogger.Info(`[generateShareImg][${fileName}] 已将图像复制到剪贴板`);
  } catch (e) {
    await TGLogger.Error(`[generateShareImg][${fileName}] 复制到剪贴板失败 ${e}`);
    await saveCanvasImg(buffer, fileName);
  }
}

/**
 * @description 复制到剪贴板
 * @since Beta v0.6.8
 * @param {Uint8Array} buffer - 图片数据
 * @returns {Promise<void>} 无返回值
 */
export async function copyToClipboard(buffer: Uint8Array): Promise<void> {
  const blob = new Blob([buffer], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  // todo mac 会报错: https://bugs.webkit.org/show_bug.cgi?id=222262
  if (platform() === "macos") {
    // todo 待测试
    navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]).then(
      () => URL.revokeObjectURL(url),
      (err) => TGLogger.Error(`[copyToClipboard] 复制到剪贴板失败: ${err}`),
    );
    return;
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  URL.revokeObjectURL(url);
}
