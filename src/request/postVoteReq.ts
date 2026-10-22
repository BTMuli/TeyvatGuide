/**
 * 米游社帖子投票创建请求。
 * @since Beta v0.12.6
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const voteApiUrl: Readonly<string> = "https://bbs-api.miyoushe.com/apihub/sapi/";

/**
 * 校验并提取投票请求使用的登录 Cookie。
 * @since Beta v0.12.6
 * @param cookie - 用户 Cookie
 * @returns 可用于签名的 Cookie
 */
function getAuthCookie(
  cookie: Record<string, string>,
  expectedUid?: string,
): Record<string, string> {
  if (typeof cookie !== "object" || cookie === null || Array.isArray(cookie)) {
    throw new TypeError("登录凭据无效");
  }
  const stuid = typeof cookie.stuid === "string" ? cookie.stuid.trim() : "";
  const stoken = typeof cookie.stoken === "string" ? cookie.stoken.trim() : "";
  const mid = typeof cookie.mid === "string" ? cookie.mid.trim() : "";
  const ltuid = typeof cookie.ltuid === "string" ? cookie.ltuid.trim() : "";
  if (!stuid || !stoken || !mid || !ltuid) {
    throw new Error("登录凭据不完整，请刷新登录凭据");
  }
  const snapshotUid = expectedUid?.trim() || ltuid;
  if (stuid !== ltuid || ltuid !== snapshotUid) {
    throw new Error("登录凭据 UID 不一致，请刷新登录凭据");
  }
  return { stuid, stoken, mid };
}

/**
 * 构建 APK sapi 投票请求头。
 * @since Beta v0.12.6
 * @param cookie - 用户 Cookie
 * @param body - 请求体
 * @returns 带 K2 签名的请求头
 */
function getVoteHeaders(
  cookie: Record<string, string>,
  body: TGApp.BBS.Vote.CreateRequest,
  expectedUid?: string,
): Record<string, string> {
  return {
    ...getRequestHeader(
      getAuthCookie(cookie, expectedUid),
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    ),
    "x-rpc-client_type": "2",
    urlname: "API_BBS",
    "Content-Type": "application/json",
  };
}

/**
 * 创建米游社投票。
 *
 * APK 只在该请求成功后返回投票数据；调用方应保存成功响应中的 ID，再将投票节点插入帖子。
 * @since Beta v0.12.6
 * @param body - APK CreateVoteVoBean 字段
 * @param cookie - 用户 Cookie
 * @param expectedUid - 当前账号快照 UID
 * @returns 服务端投票响应
 */
export async function createVote(
  body: TGApp.BBS.Vote.CreateRequest,
  cookie: Record<string, string>,
  expectedUid?: string,
): Promise<TGApp.BBS.Vote.CreateResp> {
  const response = await TGHttps.post<TGApp.BBS.Vote.CreateResp>(`${voteApiUrl}createVote`, {
    headers: getVoteHeaders(cookie, body, expectedUid),
    body,
  });
  return response.data;
}

const postVoteReq = { create: createVote };

export default postVoteReq;
