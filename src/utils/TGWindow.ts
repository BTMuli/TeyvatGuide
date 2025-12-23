/**
 * 窗口创建相关工具函数
 * @since Beta v0.7.9
 */

import type { RenderCard } from "@comp/app/t-postcard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { core, webviewWindow, window as TauriWindow } from "@tauri-apps/api";
import { PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, WindowOptions } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";

import TGLogger from "./TGLogger.js";

/**
 * 创建TG窗口
 * @since Beta v0.5.0
 * @param url - 窗口地址
 * @param label - 窗口标签
 * @param title - 窗口标题
 * @param width - 窗口宽度
 * @param height - 窗口高度
 * @param resizable - 是否可调整大小
 * @param visible - 是否可见
 * @returns 无返回值
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
 * 打开帖子
 * @since Beta v0.4.2
 * @param item - 帖子内容或ID
 * @param title - 帖子标题
 * @returns 无返回值
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
 * 打开观测枢
 * @since Beta 0.7.6
 * @param contentId - 观测枢内容ID
 * @returns 无返回值
 */
export async function toObcPage(contentId: number): Promise<void> {
  const obcUrl = `https://bbs.mihoyo.com/ys/obc/content/${contentId}/detail?bbs_presentation_style=no_header`;
  await openUrl(obcUrl);
}

/**
 * 获取不同label下的默认窗口大小
 * @since Beta v0.7.2
 * @param label - 窗口标签
 * @returns 物理大小
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
 * 窗口适配
 * @since Beta v0.7.9
 * @returns 无返回值
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
  const targetWidth = Math.round(designSize.width * widthScale);
  const targetHeight = Math.round(designSize.height * heightScale);
  await windowCur.setSize(new PhysicalSize(targetWidth, targetHeight));
  const targetZoom = Math.min(widthScale, heightScale) / screen.scaleFactor;
  await windowCur.setZoom(targetZoom);
  await windowCur.setFocus();
}
