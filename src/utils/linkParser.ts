/**
 * @file src/utils/linkParser.ts
 * @description 处理链接
 * @since Beta v0.7.3
 */

import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { emit } from "@tauri-apps/api/event";

import TGClient from "./TGClient.js";
import { createPost } from "./TGWindow.js";

/**
 * @function parsePost
 * @since Beta v0.6.9
 * @description 处理帖子
 * @param {string} link
 * @returns {Promise<false|string>} - 处理情况，或者转换后的链接
 */
export async function parsePost(link: string): Promise<false | string> {
  const url = new URL(link);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    if (url.protocol === "mihoyobbs:") {
      if (url.hostname === "article") {
        const postId = url.pathname.split("/").pop();
        if (!postId) return false;
        return postId;
      }
      if (url.hostname === "webview" && url.search.startsWith("?link=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?link=", ""));
        return await parsePost(urlTransform);
      }
      // 不保证转换后的链接可用
      if (url.hostname === "openURL" && url.search.startsWith("?url=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?url=", ""));
        return await parsePost(urlTransform);
      }
    }
    return false;
  }
  if (url.hostname.endsWith(".mihoyo.com") || url.hostname.endsWith(".miyoushe.com")) {
    if (url.pathname.includes("/article/")) {
      const postId = url.pathname.split("/").pop();
      if (typeof postId !== "string") return false;
      return postId;
    } else if (url.hash.startsWith("#/article/")) {
      const postId = url.hash.split("/").pop();
      if (typeof postId !== "string") return false;
      return postId;
    }
  }
  return false;
}

/**
 * @function parseLink
 * @since Beta v0.7.2
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
      if (url.hostname === "article") {
        const postId = url.pathname.split("/").pop();
        if (!postId) return false;
        await createPost(postId);
        return true;
      }
      if (url.hostname === "webview" && url.search.startsWith("?link=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?link=", ""));
        return await parseLink(urlTransform, useInner);
      }
      // 不保证转换后的链接可用
      if (url.hostname === "openURL" && url.search.startsWith("?url=")) {
        const urlTransform = decodeURIComponent(url.search.replace("?url=", ""));
        return await parseLink(urlTransform, useInner);
      }
      console.log(url);
      // 处理特定路径
      if (url.hostname === "discussion") {
        const gid = url.pathname.split("/").pop();
        const forum = url.searchParams.get("forum_id");
        await emit("active_deep_link", `router?path=/posts/forum/${gid}/${forum}`);
        return true;
      }
      if (url.hostname === "homeForum") {
        const game_id = url.searchParams.get("game_id");
        const tab_type = url.searchParams.get("tab_type");
        if (game_id && tab_type) {
          const tabList = ["", "notice", "activity", "news"];
          if (["1", "2", "3"].includes(tab_type)) {
            await emit(
              "active_deep_link",
              `router?path=/news/${game_id}/${tabList[parseInt(tab_type)]}`,
            );
            return true;
          }
        }
      }
    }
    return false;
  }
  if (url.hostname === "bbs.mihoyo.com" || url.hostname === "www.miyoushe.com") {
    if (url.pathname.includes("/article/")) {
      const postId = url.pathname.split("/").pop();
      if (typeof postId !== "string") return false;
      if (!useInner) return "post";
      await createPost(postId);
      return true;
    }
    if (url.pathname.includes("/topicDetail/")) {
      const regex = /\/(\w+)\/topicDetail\/(\d+)/;
      const result = url.pathname.match(regex);
      if (!result) return false;
      const [, game, topicId] = result;
      const bbsStore = localStorage.getItem("bbs");
      if (!bbsStore) return false;
      const gameList: Array<TGApp.BBS.Game.Item> = JSON.parse(bbsStore)["gameList"];
      const id = gameList.find((item) => item.en_name === game)?.id;
      await emit("active_deep_link", `router?path=/posts/topic/${id}/${topicId}`);
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
    "ys.mihoyo.com",
    "mhyurl.cn",
    "webstatic.mihoyo.com",
    "webstatic.miyoushe.com",
    "bbs.mihoyo.com",
    "qaa.miyoushe.com",
    "mihoyo.genshinnet.com",
  ];
  if (prefix.includes(url.hostname) && !useInner) {
    const openCheck = await showDialog.check("采用内置 JSBridge？", "取消则使用外部浏览器打开");
    if (openCheck === undefined) {
      showSnackbar.cancel("已取消打开");
      return true;
    }
    if (!openCheck) return url.href;
    const typeCheck = await showDialog.check("采用宽屏模式？", "取消则使用默认竖屏");
    if (!typeCheck) await TGClient.open("web_act_thin", link);
    else await TGClient.open("web_act", link);
    return true;
  }
  return url.href.toString();
}
