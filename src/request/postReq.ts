/**
 * 帖子相关的请求
 * @since Beta v0.12.6
 */
import bbsEnum from "@enum/bbs.js";
import {
  getReplyContentFromSendNodes,
  serializeReplySendNodes,
  validateReplySendNodes,
} from "@utils/bbsReplyDocument.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const bapBu: Readonly<string> = "https://bbs-api.miyoushe.com/post/wapi/";
const apihubReplyLikeUrl: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/api/upvoteReply";
const Referer: Readonly<string> = "https://bbs.mihoyo.com/";

/**
 * 回复请求签名数据
 * @since Beta v0.12.6
 */
type ReplyRequestData = Record<string, string | number | boolean | Array<string>>;

/**
 * 校验回复请求中的 ID
 * @since Beta v0.12.6
 * @param value - 待校验的 ID
 * @param name - 错误信息中的字段名称
 */
function assertPositiveId(value: string, name: string): void {
  if (!/^[1-9]\d*$/.test(value)) throw new TypeError(`${name}必须为正整数`);
}

/**
 * 校验正整数参数
 * @since Beta v0.12.6
 * @param value - 待校验的数值
 * @param name - 错误信息中的字段名称
 */
function assertPositiveNumber(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name}必须为正整数`);
}

/**
 * 提取回复请求所需的登录凭据
 * @since Beta v0.12.6
 * @param cookie - 包含 ltoken 与 ltuid 的 Cookie
 * @returns 供请求头签名使用的最小 Cookie
 */
function getReplyCookie(cookie: TGApp.App.Account.LoginCookie): TGApp.App.Account.LoginCookie {
  const ltoken = cookie?.ltoken?.trim();
  const ltuid = cookie?.ltuid?.trim();
  if (!ltoken || !ltuid) throw new Error("登录凭据缺少 ltoken 或 ltuid");
  return { ltoken, ltuid };
}

/**
 * 创建回复读取请求头
 * @since Beta v0.12.6
 * @param cookie - 包含 ltoken 与 ltuid 的 Cookie
 * @param params - 请求参数
 * @returns 带签名的请求头
 */
function getReplyReadHeaders(
  cookie: TGApp.App.Account.LoginCookie,
  params: ReplyRequestData,
): Record<string, string> {
  return {
    ...getRequestHeader(getReplyCookie(cookie), "GET", params, "K2", true),
    "x-rpc-client_type": "2",
  };
}

/**
 * 创建回复变更请求头
 * @since Beta v0.12.6
 * @param cookie - 包含 ltoken 与 ltuid 的 Cookie
 * @param body - 请求体
 * @returns 带签名的 JSON 请求头
 */
function getReplyWriteHeaders(
  cookie: TGApp.App.Account.LoginCookie,
  body: ReplyRequestData,
): Record<string, string> {
  return {
    ...getRequestHeader(getReplyCookie(cookie), "POST", body, "K2", true),
    "x-rpc-client_type": "2",
    "Content-Type": "application/json",
  };
}

/**
 * 校验回复内容
 * @since Beta v0.12.6
 * @param content - 回复内容
 */
function assertReplyContent(content: string): void {
  if (typeof content !== "string" || content.trim() === "") {
    throw new TypeError("回复内容不能为空");
  }
}

/**
 * 获取单个帖子信息
 * @since Beta v0.10.1
 * @param postId - 帖子 ID
 * @param cookie - Cookie
 * @returns 帖子信息响应数据
 */
async function getPostFull(
  postId: number | string,
  cookie?: Record<string, string>,
): Promise<TGApp.BBS.Post.FullResp> {
  const param = { post_id: postId, read: 1 };
  const header = {
    ...getRequestHeader(cookie ?? {}, "GET", param, "K2", true),
    "x-rpc-client_type": "2",
  };
  const resp = await TGHttps.get<TGApp.BBS.Post.FullResp>(`${bapBu}getPostFull`, {
    headers: header,
    query: param,
  });
  return resp.data;
}

/**
 * 获取合集帖子
 * @since Beta v0.10.1
 * @param collectionId - 合集 ID
 * @returns 合集帖子响应数据
 */
async function getPostFullInCollection(
  collectionId: string,
): Promise<TGApp.BBS.Collection.PostsResp> {
  const resp = await TGHttps.get<TGApp.BBS.Collection.PostsResp>(
    `${bapBu}getPostFullInCollection`,
    {
      headers: { "Content-Type": "application/json", referer: Referer, cookie: "" },
      query: { collection_id: collectionId },
    },
  );
  return resp.data;
}

/**
 * 获取帖子回复信息
 * @since Beta v0.12.6
 * @param postId - 帖子 ID
 * @param gid - 社区 ID
 * @param isHot - 是否热门
 * @param onlyMaster - 是否只看楼主
 * @param orderType - 排序类型
 * @param lastId - 最后 ID
 * @param size - 每页大小
 * @param cookie - 用户 Cookie，用于读取自身操作状态
 * @returns 回复信息响应数据
 */
async function getPostReplies(
  postId: string,
  gid: number,
  isHot: boolean = true,
  lastId?: string,
  onlyMaster: boolean = false,
  orderType?: TGApp.BBS.Reply.ReplyOrderTypeEnum,
  size: number = 20,
  cookie?: TGApp.App.Account.LoginCookie,
): Promise<TGApp.BBS.Reply.MainResp> {
  const params: TGApp.BBS.Reply.MainReplyParam = {
    post_id: postId,
    gids: gid,
    is_hot: isHot,
    size: size,
  };
  if (lastId) params.last_id = lastId;
  if (orderType) params.order_type = orderType;
  if (onlyMaster) {
    params.is_hot = false;
    params.only_master = onlyMaster;
    params.order_type = 1;
  }
  const resp = await TGHttps.get<TGApp.BBS.Reply.MainResp>(`${bapBu}getPostReplies`, {
    headers: cookie === undefined ? { referer: Referer } : getReplyReadHeaders(cookie, params),
    query: params,
  });
  return resp.data;
}

/**
 * 获取帖子子回复信息
 * @since Beta v0.12.6
 * @param floorId - 楼层 ID
 * @param gid - 社区 ID
 * @param postId - 帖子 ID
 * @param lastId - 最后 ID
 * @param size - 每页大小
 * @param cookie - 用户 Cookie，用于读取自身操作状态
 * @returns 子回复响应数据
 */
async function getSubReplies(
  floorId: number,
  gid: number,
  postId: string,
  lastId?: string,
  size: number = 20,
  cookie?: TGApp.App.Account.LoginCookie,
): Promise<TGApp.BBS.Reply.SubResp> {
  const params: TGApp.BBS.Reply.SubReplyParam = {
    floor_id: floorId,
    gids: gid,
    post_id: postId,
    size: size,
  };
  if (lastId) params.last_id = lastId;
  const resp = await TGHttps.get<TGApp.BBS.Reply.SubResp>(`${bapBu}getSubReplies`, {
    headers: cookie === undefined ? { referer: Referer } : getReplyReadHeaders(cookie, params),
    query: params,
  });
  return resp.data;
}

/**
 * 发布回复
 * @since Beta v0.12.6
 * @param input - 回复参数
 * @param cookie - 用户 Cookie
 * @returns 回复变更响应
 */
async function createReply(
  input: TGApp.BBS.Reply.CreateParams,
  cookie: TGApp.App.Account.LoginCookie,
): Promise<TGApp.BBS.Reply.MutationResp> {
  assertPositiveId(input.postId, "帖子 ID");
  assertPositiveNumber(input.gid, "社区 ID");
  if (input.replyId !== undefined) assertPositiveId(input.replyId, "回复 ID");

  let content = input.content;
  let structuredContent: string;
  if (input.structuredContent === undefined) {
    assertReplyContent(input.content);
    structuredContent = JSON.stringify([{ insert: `${input.content}\n` }]);
  } else {
    const nodes = validateReplySendNodes(input.structuredContent);
    const generatedContent = getReplyContentFromSendNodes(nodes);
    if (input.content !== generatedContent) throw new TypeError("回复内容与结构化内容不一致");
    content = generatedContent;
    structuredContent = serializeReplySendNodes(nodes);
  }

  const body: Record<string, string> = {
    post_id: input.postId,
    // 沿用米游社网页请求层自动注入的字符串 gids。
    gids: String(input.gid),
    content,
    structured_content: structuredContent,
  };
  if (input.replyId !== undefined) body.reply_id = input.replyId;
  const resp = await TGHttps.post<TGApp.BBS.Reply.MutationResp>(`${bapBu}releaseReply`, {
    headers: getReplyWriteHeaders(cookie, body),
    body,
  });
  return resp.data;
}

/**
 * 点赞或取消点赞回复
 * @since Beta v0.12.6
 * @param postId - 帖子 ID
 * @param replyId - 回复 ID
 * @param cookie - 用户 Cookie
 * @param cancel - 是否取消点赞
 * @param gid - 可选社区 ID
 * @returns 回复变更响应
 */
async function likeReply(
  postId: string,
  replyId: string,
  cookie: TGApp.App.Account.LoginCookie,
  cancel: boolean = false,
  gid?: number,
): Promise<TGApp.BBS.Reply.MutationResp> {
  assertPositiveId(postId, "帖子 ID");
  assertPositiveId(replyId, "回复 ID");
  const body: ReplyRequestData = { is_cancel: cancel, post_id: postId, reply_id: replyId };
  if (gid !== undefined) {
    assertPositiveNumber(gid, "社区 ID");
    body.gids = String(gid);
  }
  const resp = await TGHttps.post<TGApp.BBS.Reply.MutationResp>(apihubReplyLikeUrl, {
    headers: getReplyWriteHeaders(cookie, body),
    body,
  });
  return resp.data;
}

/**
 * 删除回复
 * @since Beta v0.12.6
 * @param postId - 帖子 ID
 * @param replyId - 回复 ID
 * @param cookie - 用户 Cookie
 * @param gid - 可选社区 ID
 * @returns 回复变更响应
 */
async function deleteReply(
  postId: string,
  replyId: string,
  cookie: TGApp.App.Account.LoginCookie,
  gid?: number,
): Promise<TGApp.BBS.Reply.MutationResp> {
  assertPositiveId(postId, "帖子 ID");
  assertPositiveId(replyId, "回复 ID");
  const body: ReplyRequestData = { post_id: postId, reply_id: replyId };
  if (gid !== undefined) {
    assertPositiveNumber(gid, "社区 ID");
    body.gids = String(gid);
  }
  const resp = await TGHttps.post<TGApp.BBS.Reply.MutationResp>(`${bapBu}deleteReply`, {
    headers: getReplyWriteHeaders(cookie, body),
    body,
  });
  return resp.data;
}

/**
 * 置顶或取消置顶帖子回复
 * @since Beta v0.12.6
 * @param postId - 帖子 ID
 * @param replyId - 回复 ID
 * @param cookie - 用户 Cookie
 * @param cancel - 是否取消置顶
 * @param gid - 可选社区 ID
 * @returns 回复变更响应
 */
async function pinReply(
  postId: string,
  replyId: string,
  cookie: TGApp.App.Account.LoginCookie,
  cancel: boolean = false,
  gid?: number,
): Promise<TGApp.BBS.Reply.MutationResp> {
  assertPositiveId(postId, "帖子 ID");
  assertPositiveId(replyId, "回复 ID");
  const body: ReplyRequestData = { is_cancel: cancel, post_id: postId, reply_id: replyId };
  if (gid !== undefined) {
    assertPositiveNumber(gid, "社区 ID");
    body.gids = String(gid);
  }
  const resp = await TGHttps.post<TGApp.BBS.Reply.MutationResp>(`${bapBu}pin/post/reply`, {
    headers: getReplyWriteHeaders(cookie, body),
    body,
  });
  return resp.data;
}

/**
 * 获取特定话题帖子列表
 * @since Beta v0.10.1
 * @param gid - 游戏分区 ID
 * @param topicId - 话题 ID
 * @param orderType - 排序方式
 * @param lastId - 最后一条帖子 ID
 * @param size - 每页大小
 * @returns 话题帖子列表响应数据
 */
async function getTopicPostList(
  gid: number,
  topicId: string,
  orderType: TGApp.BBS.Post.PostTopicSortTypeEnum = bbsEnum.post.topicSortType.LATEST,
  lastId?: string,
  size: number = 20,
): Promise<TGApp.BBS.Topic.PostResp> {
  const resp = await TGHttps.get<TGApp.BBS.Topic.PostResp>(`${bapBu}getTopicPostList`, {
    headers: { referer: Referer },
    query: {
      gids: gid,
      game_id: gid,
      topic_id: topicId,
      list_type: orderType,
      last_id: lastId ?? "",
      page_size: size,
    },
  });
  return resp.data;
}

/**
 * 获取用户发布帖子
 * @since Beta v0.10.1
 * @param uid - 用户 ID
 * @param gid - 社区 ID
 * @param offset - 偏移量
 * @returns 用户帖子响应数据
 */
async function getUserPost(
  uid: string,
  gid: number,
  offset?: string,
): Promise<TGApp.BBS.Post.UserPostResp> {
  const params: Record<string, string | number> = offset
    ? { uid, gids: gid, offset, size: 20 }
    : { uid, gids: gid, size: 20 };
  const resp = await TGHttps.get<TGApp.BBS.Post.UserPostResp>(`${bapBu}userPost`, {
    headers: { referer: Referer },
    query: params,
  });
  return resp.data;
}

/**
 * 搜索帖子
 * @since Beta v0.10.1
 * @param gid - 游戏分区 ID
 * @param keyword - 关键词
 * @param lastId - 最后一条帖子 ID
 * @param orderType - 排序方式 1-最热，2-最新
 * @returns 搜索帖子响应数据
 */
async function searchPosts(
  gid: string = "2",
  keyword: string,
  lastId: string,
  orderType: TGApp.BBS.Post.SearchSortTypeEnum,
): Promise<TGApp.BBS.Post.SearchResp> {
  const resp = await TGHttps.get<TGApp.BBS.Post.SearchResp>(`${bapBu}searchPosts`, {
    headers: { "Content-Type": "application/json" },
    query: { gids: gid, keyword, last_id: lastId, size: 20, order_type: orderType },
  });
  return resp.data;
}

/**
 * 获取用户收藏帖子
 * @since Beta v0.10.1
 * @param cookie - 用户 cookie
 * @param uid - 用户 UID
 * @param offset - 偏移量
 * @returns 用户收藏帖子响应数据
 */
async function userFavouritePost(
  cookie: TGApp.App.Account.Cookie,
  uid: string,
  offset: string = "",
): Promise<TGApp.BBS.Collection.UserPostResp> {
  const ck = { cookie_token: cookie.cookie_token, account_id: cookie.account_id };
  const params = { size: "20", uid, offset };
  const resp = await TGHttps.get<TGApp.BBS.Collection.UserPostResp>(`${bapBu}userFavouritePost`, {
    headers: getRequestHeader(ck, "GET", params),
    query: params,
  });
  return resp.data;
}

const postReq = {
  collection: getPostFullInCollection,
  post: getPostFull,
  topic: getTopicPostList,
  reply: {
    main: getPostReplies,
    sub: getSubReplies,
    create: createReply,
    like: likeReply,
    delete: deleteReply,
    pin: pinReply,
  },
  search: searchPosts,
  user: { post: getUserPost, favorite: userFavouritePost },
};

export default postReq;
