/**
 * @file src/utils/linkParser.ts
 * @description 处理链接
 * @since Beta v0.4.7
 */

import { emit } from "@tauri-apps/api/event";

import showConfirm from "../components/func/confirm.js";
import showSnackbar from "../components/func/snackbar.js";

import TGClient from "./TGClient.js";
import { createPost } from "./TGWindow.js";

/**
 * @function parsePost
 * @since Beta v0.3.8
 * @description 处理帖子
 * @param {string} link
 * @returns {Promise<false|string>} - 处理情况，或者转换后的链接
 */
export async function parsePost(link: string): Promise<false | string> {
  const url = new URL(link);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    if (url.protocol === "mihoyobbs:") {
      if (url.pathname.startsWith("//article/")) {
        const postId = url.pathname.split("/").pop();
        if (!postId) return false;
        return postId;
      }
      if (url.pathname === "//webview" && url.search.startsWith("?link=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?link=", ""));
        return await parsePost(urlTransform);
      }
      // todo 不保证转换后的链接可用
      if (url.pathname === "//openURL" && url.search.startsWith("?url=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?url=", ""));
        return await parsePost(urlTransform);
      }
    }
    return false;
  }
  if (url.hostname === "bbs.mihoyo.com" || url.hostname === "www.miyoushe.com") {
    if (url.pathname.includes("/article/")) {
      const postId = url.pathname.split("/").pop();
      if (typeof postId !== "string") return false;
      return postId;
    }
  }
  return false;
}

/**
 * @function parseLink
 * @since Beta v0.4.7
 * @description 处理链接
 * @param {string} link - 链接
 * @param {boolean} useInner - 是否采用内置 JSBridge 打开
 * @returns {Promise<boolean|string>} - 处理情况，或者转换后的链接
 */
export async function parseLink(
  link: string,
  useInner: boolean = false,
): Promise<boolean | string> {
  const url = new URL(link);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    if (url.protocol === "mihoyobbs:") {
      if (url.pathname.startsWith("//article/")) {
        const postId = url.pathname.split("/").pop();
        if (!postId) return false;
        createPost(postId);
        return true;
      }
      if (url.pathname === "//webview" && url.search.startsWith("?link=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?link=", ""));
        return await parseLink(urlTransform, useInner);
      }
      // todo 不保证转换后的链接可用
      if (url.pathname === "//openURL" && url.search.startsWith("?url=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?url=", ""));
        return await parseLink(urlTransform, useInner);
      }
      console.log(url.pathname, url.search);
      // 处理特定路径
      if (url.pathname.startsWith("//discussion")) {
        await emit("active_deep_link", "router?path=/posts");
        return true;
      }
      if (link === "mihoyobbs://homeForum?game_id=2&tab_type=2") {
        await emit("active_deep_link", "router?path=/news/2/news");
        return true;
      }
    }
    return false;
  }
  if (url.hostname === "bbs.mihoyo.com" || url.hostname === "www.miyoushe.com") {
    if (url.pathname.includes("/article/")) {
      const postId = url.pathname.split("/").pop();
      if (typeof postId !== "string") return false;
      if (!useInner) {
        return "post";
      }
      createPost(postId);
      return true;
    }
  }
  if (url.hostname === "webstatic.mihoyo.com") {
    // 临时打的补丁
    if (url.pathname === "/bbs/event/signin/hkrpg/index.html") {
      return "https://act.mihoyo.com/bbs/event/signin/hkrpg/e202304121516551.html?bbs_auth_required=true&act_id=e202304121516551&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon";
    }
    if (url.pathname === "/bbs/event/signin-ys/index.html") {
      return "https://act.mihoyo.com/bbs/event/signin/hk4e/index.html?act_id=e202311201442471&bbs_auth_required=true&bbs_presentation_style=fullscreen&mhy_presentation_style=fullscreen&utm_source=bbs&utm_medium=ys&utm_campaign=icon";
    }
    if (url.pathname === "bh3/event/e20200511toolBox/index.html") {
      return "https://webstatic.mihoyo.com/bbs/event/e20200511toolbox/index.html?game_biz=ys_cn&bbs_show_back=true&bbs_auth_required=true";
    }
  }
  const prefix = [
    "m.miyoushe.com",
    "act.mihoyo.com",
    "mhyurl.cn",
    "webstatic.mihoyo.com",
    "bbs.mihoyo.com",
    "qaa.miyoushe.com",
  ];
  if (prefix.includes(url.hostname) && !useInner) {
    const openCheck = await showConfirm({
      title: "采用内置 JSBridge？",
      text: "取消则使用外部浏览器打开",
    });
    if (openCheck === undefined) {
      showSnackbar({
        text: "已取消打开",
        color: "warn",
      });
      return true;
    }
    if (!openCheck) return url.href;
    const typeCheck = await showConfirm({
      title: "采用宽屏模式？",
      text: "取消则使用默认竖屏",
    });
    if (!typeCheck) await TGClient.open("web_act_thin", link);
    else await TGClient.open("web_act", link);
    return true;
  }
  return url.href.toString();
}
