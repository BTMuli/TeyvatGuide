/**
 * @file utils/TGWindow.ts
 * @description 窗口创建相关工具函数
 * @since Beta v0.7.2
 */

import type { RenderCard } from "@comp/app/t-postcard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { core, webviewWindow, window as TauriWindow } from "@tauri-apps/api";
import { PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, WindowOptions } from "@tauri-apps/api/window";

import TGLogger from "./TGLogger.js";

/**
 * @description 创建TG窗口
 * @since Beta v0.5.0
 * @see https://github.com/tauri-apps/tauri/issues/5380
 * @param {string} url 窗口地址
 * @param {string} label 窗口标签
 * @param {string} title 窗口标题
 * @param {number} width 窗口宽度
 * @param {number} height 窗口高度
 * @param {boolean} resizable 是否可调整大小
 * @param {boolean} visible 是否可见
 * @returns {Promise<void>}
 */
export async function createTGWindow(
  url: string,
  label: string,
  title: string,
  width: number,
  height: number,
  resizable: boolean,
  visible: boolean = true,
): Promise<void> {
  const windowOpt: WindowOptions = {
    title,
    width,
    height,
    resizable,
    visible,
  };
  const window = await TauriWindow.Window.getByLabel(label);
  if (window !== null) await window.destroy();
  await core.invoke("create_window", { label, url, option: windowOpt });
}

/**
 * @description 打开帖子
 * @since Beta v0.4.2
 * @param {RenderCard | string | number} item 帖子内容或ID
 * @param {string} title 帖子标题
 * @returns {Promise<void>}
 */
export async function createPost(
  item: RenderCard | string | number,
  title?: string,
): Promise<void> {
  let postId: string, postTitle: string;
  if (typeof item === "string" || typeof item === "number") {
    postId = item.toString();
    postTitle = title ? `Post_${postId} ${title}` : `Post_${postId}`;
  } else {
    postId = item.postId.toString();
    postTitle = `Post_${postId} ${item.title}`;
  }
  const postPath = `/post_detail/${postId}`;
  await createTGWindow(postPath, "Sub_window", postTitle, 960, 720, false, false);
  await TGLogger.Info(`[createPost][${postId}] 打开帖子`);
}

/**
 * @description 打开观测枢
 * @since Beta 0.6.2
 * @param {string} contentId
 * @param {string} label
 * @returns {Promise<void>}
 */
export async function createObc(contentId: number, label: string): Promise<void> {
  const obcUrl = `https://bbs.mihoyo.com/ys/obc/content/${contentId}/detail?bbs_presentation_style=no_header`;
  await createTGWindow(obcUrl, "Sub_window", `Content_${contentId}_${label}`, 1200, 800, true);
}

/**
 * @description 获取不同label下的默认窗口大小
 * @since Beta v0.7.2
 * @param {string} label 窗口标签
 * @returns {PhysicalSize}
 */
export function getWindowSize(label: string): PhysicalSize {
  switch (label) {
    case "TeyvatGuide":
      return new PhysicalSize(1600, 900);
    case "Sub_window":
    case "Dev_JSON":
      return new PhysicalSize(960, 720);
    default:
      return new PhysicalSize(1280, 720);
  }
}

/**
 * @description 窗口适配
 * @since Beta v0.7.2
 * @returns Promise<void>
 */
export async function resizeWindow(): Promise<void> {
  const screen = await currentMonitor();
  if (screen === null) {
    showSnackbar.error("获取屏幕信息失败！", 3000);
    return;
  }
  const windowCur = webviewWindow.getCurrentWebviewWindow();
  if (await windowCur.isMaximized()) return;
  const designSize = getWindowSize(windowCur.label);
  const widthScale = screen.size.width / 1920;
  const heightScale = screen.size.height / 1080;
  await windowCur.setSize(
    new PhysicalSize(
      Math.round(designSize.width * widthScale),
      Math.round(designSize.height * heightScale),
    ),
  );
  await windowCur.setZoom((1 / screen.scaleFactor) * Math.min(widthScale, heightScale));
  await windowCur.setFocus();
}
