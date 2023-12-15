/**
 * @file utils/TGWindow.ts
 * @description 窗口创建相关工具函数
 * @since Beta v0.3.8
 */

import { invoke, window as TauriWindow } from "@tauri-apps/api";
import type { WindowOptions } from "@tauri-apps/api/window";

import { useAppStore } from "../store/modules/app";

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
      .catch((err) => {
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
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

/**
 * @description 打开帖子
 * @since Beta v0.3.7
 * @param {TGApp.Plugins.Mys.News.RenderCard | string | number | TGApp.Plugins.Mys.Forum.RenderCard} item 帖子内容或ID
 * @param {string} title 帖子标题
 * @returns {void}
 */
export function createPost(
  item: TGApp.Plugins.Mys.News.RenderCard | string | number | TGApp.Plugins.Mys.Forum.RenderCard,
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

/**
 * @description 打开公告
 * @since Beta v0.3.3
 * @param {TGApp.App.Announcement.ListCard} item 公告内容或ID
 * @returns {void}
 */
export function createAnno(item: TGApp.App.Announcement.ListCard): void {
  const annoPath = `/anno_detail/${item.id}`;
  const annoJsonPath = `/anno_detail_json/${item.id}`;
  const annoTitle = `Anno_${item.id} ${item.title}`;
  const annoJsonTitle = `Anno_${item.id}_JSON ${item.title}`;
  const isDev = useAppStore().devMode ?? false;
  if (isDev) {
    createTGWindow(annoJsonPath, "Dev_JSON", annoJsonTitle, 960, 720, false, false);
  }
  createTGWindow(annoPath, "Sub_window", annoTitle, 960, 720, false, false);
}

/**
 * @description 打开 Wiki
 * @since Beta v0.3.8
 * @param {string} dir 目录
 * @param {string} name 文件名
 * @returns {void}
 */
export function createWiki(dir: string, name: string): void {
  // if(dir !== "Character") return;
  const dirName = dir === "GCG" ? dir : dir.toLowerCase();
  const wikiPath = `/wiki/detail/${dirName}/${name}`;
  createTGWindow(wikiPath, "Sub_window", `Wiki_${dirName}_${name}`, 960, 720, false, false);
}
