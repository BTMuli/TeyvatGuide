/**
 * @file plugins/Mys/request/getPostReply.ts
 * @description Mys 插件帖子回复请求
 * @since Beta v0.5.5
 */

import TGHttp from "../../../utils/TGHttp.js";
import MysApi from "../api/index.js";

/**
 * @description 获取帖子回复信息
 * @since Beta v0.5.5
 * @param {string} postId 帖子 ID
 * @param {number} gid 社区 ID
 * @param {boolean} isHot 是否热门
 * @param {boolean} onlyMaster 是否只看楼主
 * @param {number} orderType 排序类型
 * @param {string} lastId 最后 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.Plugins.Mys.Reply.ReplyData|TGApp.BBS.Response.Base>}
 */
export async function getPostReply(
  postId: string,
  gid: number,
  isHot: boolean = true,
  lastId?: string,
  onlyMaster: boolean = false,
  orderType?: 1 | 2,
  size: number = 20,
): Promise<TGApp.Plugins.Mys.Reply.ReplyData | TGApp.BBS.Response.Base> {
  const params: Record<string, string | number | boolean> = {
    post_id: postId,
    gids: gid,
    is_hot: isHot,
    size: size,
  };
  if (lastId) {
    params["last_id"] = lastId;
  }
  if (orderType) {
    params["order_type"] = orderType;
  }
  if (onlyMaster) {
    params["is_hot"] = false;
    params["only_master"] = onlyMaster;
  }
  const link = "https://bbs-api.miyoushe.com/post/wapi/getPostReplies";
  const resp = await TGHttp<TGApp.Plugins.Mys.Reply.Response>(link, {
    method: "GET",
    headers: { referer: MysApi.PostReferer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取帖子子回复根信息
 * @since Beta v0.5.5
 * @param {number} gid 社区 ID
 * @param {string} postId 帖子 ID
 * @param {string} replyId 回复 ID
 * @return {Promise<TGApp.Plugins.Mys.Reply.SubRootData|TGApp.BBS.Response.Base>}
 */
export async function getPostSubRoot(
  gid: number,
  postId: string,
  replyId: string,
): Promise<TGApp.Plugins.Mys.Reply.SubRootData | TGApp.BBS.Response.Base> {
  const link = "https://bbs-api.miyoushe.com/post/wapi/getRootReplyInfo";
  const params = { gids: gid, post_id: postId, reply_id: replyId };
  const resp = await TGHttp<TGApp.Plugins.Mys.Reply.SubRootResponse>(link, {
    method: "GET",
    headers: { referer: MysApi.PostReferer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 获取帖子子回复信息
 * @since Beta v0.5.5
 * @param {number} floorId 楼层 ID
 * @param {number} gid 社区 ID
 * @param {string} postId 帖子 ID
 * @param {string} lastId 最后 ID
 * @param {number} size 每页大小
 * @return {Promise<TGApp.Plugins.Mys.Reply.SubData|TGApp.BBS.Response.Base>}
 */
export async function getPostSubReply(
  floorId: number,
  gid: number,
  postId: string,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.Plugins.Mys.Reply.SubData | TGApp.BBS.Response.Base> {
  const params: Record<string, string | number> = {
    floor_id: floorId,
    gids: gid,
    post_id: postId,
    size: size,
  };
  if (lastId) {
    params["last_id"] = lastId;
  }
  const link = "https://bbs-api.miyoushe.com/post/wapi/getSubReplies";
  const resp = await TGHttp<TGApp.Plugins.Mys.Reply.SubResponse>(link, {
    method: "GET",
    headers: { referer: MysApi.PostReferer },
    query: params,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}
