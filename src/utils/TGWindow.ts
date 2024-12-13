/**
 * @file utils/TGWindow.ts
 * @description 窗口创建相关工具函数
 * @since Beta v0.6.2
 */

import { core, window as TauriWindow } from "@tauri-apps/api";
import type { WindowOptions } from "@tauri-apps/api/window";

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
 * @param {TGApp.Plugins.Mys.News.RenderCard | string | number | TGApp.Plugins.Mys.Forum.RenderCard} item 帖子内容或ID
 * @param {string} title 帖子标题
 * @returns {Promise<void>}
 */
export async function createPost(
  item: TGApp.Plugins.Mys.News.RenderCard | string | number | TGApp.Plugins.Mys.Forum.RenderCard,
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
