/**
 * @file utils/TGWindow.ts
 * @description 窗口创建相关工具函数
 * @since Beta v0.4.2
 */

import { invoke, window as TauriWindow } from "@tauri-apps/api";
import type { WindowOptions } from "@tauri-apps/api/window";

import TGLogger from "./TGLogger.js";

/**
 * @description 创建TG窗口
 * @since Beta v0.3.4
 * @see https://github.com/tauri-apps/tauri/issues/5380
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
  const option: WindowOptions = {
    height,
    width,
    resizable,
    url,
    title,
    visible,
    x: left,
    y: top,
  };
  const isGet = TauriWindow.WebviewWindow.getByLabel(label);
  if (isGet === null) {
    invoke("create_window", { label, option })
      .then(() => {
        createTGWindow(url, label, title, width, height, resizable, visible);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  } else {
    isGet
      .close()
      .then(() => {
        invoke("create_window", { label, option })
          .then(() => {
            console.log(`[createTGWindow][${label}] ${title} created.`);
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }
}

/**
 * @description 打开帖子
 * @since Beta v0.4.2
 * @param {TGApp.Plugins.Mys.News.RenderCard | string | number | TGApp.Plugins.Mys.Forum.RenderCard} item 帖子内容或ID
 * @param {string} title 帖子标题
 * @returns {void}
 */
export function createPost(
  item: TGApp.Plugins.Mys.News.RenderCard | string | number | TGApp.Plugins.Mys.Forum.RenderCard,
  title?: string,
): void {
  let postId: string, postTitle: string;
  if (typeof item === "string" || typeof item === "number") {
    postId = item.toString();
    postTitle = title ? `Post_${postId} ${title}` : `Post_${postId}`;
  } else {
    postId = item.postId.toString();
    postTitle = `Post_${postId} ${item.title}`;
  }
  const postPath = `/post_detail/${postId}`;
  createTGWindow(postPath, "Sub_window", postTitle, 960, 720, false, false);
  TGLogger.Info(`[createPost][${postId}] 打开帖子`).catch((err) => {
    console.error(err);
  });
}
