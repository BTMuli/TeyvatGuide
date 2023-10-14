/**
 * @file utils TGWindow.ts
 * @description 窗口创建相关工具函数
 * @since Beta v0.3.3
 */

import { window as TauriWindow } from "@tauri-apps/api";

import { useAppStore } from "../store/modules/app";

/**
 * @description 创建TG窗口
 * @since Alpha v0.1.2
 * @param {string} url 窗口地址
 * @param {string} label 窗口标签
 * @param {string} title 窗口标题
 * @param {number} width 窗口宽度
 * @param {number} height 窗口高度
 * @param {boolean} resizable 是否可调整大小
 * @param {boolean} visible 是否可见
 * @returns {void}
 */
export function createTGWindow(
  url: string,
  label: string,
  title: string,
  width: number,
  height: number,
  resizable: boolean,
  visible: boolean = true,
): void {
  // 计算窗口位置
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  // https://github.com/tauri-apps/tauri/issues/5380
  void new TauriWindow.WebviewWindow(label, {
    height,
    width,
    x: left,
    y: top,
    resizable,
    url,
    title,
    visible,
  });
  void new TauriWindow.WindowManager(label).close().then(() => {
    void new TauriWindow.WebviewWindow(label, {
      height,
      width,
      x: left,
      y: top,
      resizable,
      url,
      title,
      visible,
    });
  });
}

/**
 * @description 打开帖子
 * @since Beta v0.3.3
 * @param {TGApp.Plugins.Mys.News.RenderCard|string|number} item 帖子内容或ID
 * @param {string} title 帖子标题
 * @returns {void}
 */
export function createPost(
  item: TGApp.Plugins.Mys.News.RenderCard | string | number,
  title?: string,
): void {
  let postId, postTitle, jsonTitle;
  if (typeof item === "string" || typeof item === "number") {
    postId = item.toString();
    postTitle = title ? `Post_${postId} ${title}` : `Post_${postId}`;
    jsonTitle = title ? `Post_${postId}_JSON ${title}` : `Post_${postId}_JSON`;
  } else {
    postId = item.postId.toString();
    postTitle = `Post_${postId} ${item.title}`;
    jsonTitle = `Post_${postId}_JSON ${item.title}`;
  }
  const postPath = `/post_detail/${postId}`;
  const jsonPath = `/post_detail_json/${postId}`;
  const isDev = useAppStore().devMode ?? false;
  if (isDev) {
    createTGWindow(jsonPath, "Dev_JSON", jsonTitle, 960, 720, false, false);
  }
  createTGWindow(postPath, "Sub_window", postTitle, 960, 720, false, false);
}
