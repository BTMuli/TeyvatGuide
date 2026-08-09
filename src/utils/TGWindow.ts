/**
 * 窗口创建相关工具函数
 * @since Beta v0.11.3
 */

import showSnackbar from "@comp/func/snackbar.js";
import { core, webviewWindow } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, WindowOptions } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";

import TGLogger from "./TGLogger.js";

type TGWindowRequest = {
  url: string;
  title: string;
  width: number;
  height: number;
  resizable: boolean;
  visible: boolean;
};

type TGWindowTask = {
  request: TGWindowRequest;
  promise: Promise<void>;
  settled: boolean;
};

type PostInfo = { postId: string; title?: string };

const windowTasks = new Map<string, TGWindowTask>();

function isSameWindowRequest(first: TGWindowRequest, second: TGWindowRequest): boolean {
  return (
    first.url === second.url &&
    first.title === second.title &&
    first.width === second.width &&
    first.height === second.height &&
    first.resizable === second.resizable &&
    first.visible === second.visible
  );
}

function getPostId(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value.toString() : null;
  }
  if (typeof value !== "string") return null;
  const postId = value.trim();
  if (!/^[1-9]\d*$/.test(postId)) return null;
  return Number.isSafeInteger(Number(postId)) ? postId : null;
}

function getPostInfo(item: unknown): PostInfo | null {
  const postId = getPostId(item);
  if (postId !== null) return { postId };
  if (typeof item !== "object" || item === null || !("postId" in item)) return null;
  const objectPostId = getPostId(item.postId);
  if (objectPostId === null) return null;
  const title = "title" in item && typeof item.title === "string" ? item.title : undefined;
  return { postId: objectPostId, title };
}

async function openTGWindow(label: string, request: TGWindowRequest): Promise<void> {
  const windowOpt: WindowOptions = {
    title: request.title,
    width: request.width,
    height: request.height,
    resizable: request.resizable,
    visible: request.visible,
  };
  await core.invoke<void>("create_window", { label, url: request.url, option: windowOpt });
}

/**
 * 创建TG窗口
 * @since Beta v0.11.3
 * @param url - 窗口地址
 * @param label - 窗口标签
 * @param title - 窗口标题
 * @param width - 窗口宽度
 * @param height - 窗口高度
 * @param resizable - 是否可调整大小
 * @param visible - 是否可见
 * @returns 无返回值
 */
export function createTGWindow(
  url: string,
  label: string,
  title: string,
  width: number,
  height: number,
  resizable: boolean,
  visible: boolean = true,
): Promise<void> {
  const request: TGWindowRequest = { url, title, width, height, resizable, visible };
  const previousTask = windowTasks.get(label);
  if (
    previousTask !== undefined &&
    !previousTask.settled &&
    isSameWindowRequest(previousTask.request, request)
  ) {
    return previousTask.promise;
  }

  const previousPromise = previousTask?.promise;
  const promise = (
    previousPromise === undefined ? Promise.resolve() : previousPromise.catch(() => undefined)
  ).then(async () => openTGWindow(label, request));
  const task: TGWindowTask = { request, promise, settled: false };
  windowTasks.set(label, task);
  void promise.then(
    () => {
      task.settled = true;
      if (windowTasks.get(label) === task) windowTasks.delete(label);
    },
    () => {
      task.settled = true;
      if (windowTasks.get(label) === task) windowTasks.delete(label);
    },
  );
  return promise;
}

/**
 * 打开帖子
 * @since Beta v0.11.3
 * @param item - 帖子内容或ID
 * @param title - 帖子标题
 * @returns 无返回值
 */
export async function createPost(item: unknown, title?: string): Promise<void> {
  const postInfo = getPostInfo(item);
  if (postInfo === null) {
    showSnackbar.warn("帖子 ID 无效");
    await TGLogger.Warn("[createPost] 无效的帖子参数");
    return;
  }
  const { postId } = postInfo;
  let postTitle: string;
  if (postInfo.title === undefined) {
    postTitle = title ? `Post_${postId} ${title}` : `Post_${postId}`;
  } else {
    postTitle = `Post_${postId} ${postInfo.title}`;
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
 * 判断窗口位置，确保窗口不超出屏幕并居中
 * @since Beta v0.10.2
 * @remarks 当窗口超出屏幕时回滚到 resizeWindow，此时回正配置默认生效
 * @returns 无返回值
 */
export async function setWindowPos(): Promise<void> {
  const screen = await currentMonitor();
  const NAV_BAR_HEIGHT = 28;
  if (screen === null) {
    showSnackbar.error("获取屏幕信息失败！", 3000);
    return;
  }
  const windowCur = webviewWindow.getCurrentWebviewWindow();
  if (await windowCur.isMaximized()) return;
  const designSize = getWindowSize(windowCur.label);
  const screenScale = screen.scaleFactor;
  const targetWidth = Math.round(designSize.width * screenScale);
  const targetHeight = Math.round(designSize.height * screenScale);
  const cpWidth = screen.size.width - NAV_BAR_HEIGHT * screenScale;
  const cpHeight = screen.size.height - NAV_BAR_HEIGHT * screenScale;
  if (targetWidth > cpWidth && targetHeight > cpHeight) {
    await resizeWindow();
    await windowCur.center();
  } else if (targetHeight > cpHeight) {
    const left = Math.round((screen.size.width - targetWidth) / 2);
    await windowCur.setSize(new PhysicalSize(targetWidth, targetHeight));
    await windowCur.setPosition(new PhysicalPosition(left, 24));
  } else if (targetWidth > screen.size.width) {
    const top = Math.round((screen.size.height - targetHeight) / 2);
    await windowCur.setSize(new PhysicalSize(targetWidth, targetHeight));
    await windowCur.setPosition(new PhysicalPosition(24, top));
  } else {
    await windowCur.setSize(new PhysicalSize(targetWidth, targetHeight));
    await windowCur.center();
  }
  await windowCur.setZoom(1);
}

/**
 * 窗口适配
 * @since Beta v0.9.6
 * @returns 无返回值
 */
export async function resizeWindow(): Promise<void> {
  const screen = await currentMonitor();
  if (screen === null) {
    showSnackbar.error("获取屏幕信息失败！", 3000);
    return;
  }
  const windowCur = webviewWindow.getCurrentWebviewWindow();
  const textScale = await invoke<number>("read_text_scale");
  if (await windowCur.isMaximized()) return;
  const designSize = getWindowSize(windowCur.label);
  const widthScale = screen.size.width / 1920;
  const heightScale = screen.size.height / 1080;
  const targetWidth = Math.round(designSize.width * widthScale);
  const targetHeight = Math.round(designSize.height * heightScale);
  if (await windowCur.isMaximized()) {
    await windowCur.unmaximize();
  }
  await windowCur.setSize(new PhysicalSize(targetWidth, targetHeight));
  const targetZoom = Math.min(widthScale, heightScale) / (screen.scaleFactor * textScale);
  await windowCur.setZoom(targetZoom);
}
