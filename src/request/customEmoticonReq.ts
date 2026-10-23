/**
 * 米游社收藏表情读取请求
 * @since Beta v0.13.0
 */

import { getRequestHeader } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

import { parseCustomEmoticonList } from "../utils/bbs/customEmoticon.js";

const customEmoticonListUrl: Readonly<string> =
  "https://bbs-api.miyoushe.com/misc/api/customEmoticonList";

/**
 * 提取收藏表情请求所需的最小登录凭据
 * @since Beta v0.13.0
 * @param cookie - 包含 stuid、stoken、mid 与 ltuid 的 Cookie
 * @returns 仅包含 stuid、stoken 与 mid 的 Cookie
 */
function getAuthCookie(cookie: TGApp.App.Account.SignUidCookie): TGApp.App.Account.SignCookie {
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
  if (stuid !== ltuid) throw new Error("登录凭据 UID 不一致，请刷新登录凭据");
  return { stuid, stoken, mid };
}

/**
 * 获取收藏表情列表
 * @since Beta v0.13.0
 * @param cookie - 用户 Cookie，仅使用 stuid、stoken、mid 与 ltuid
 * @param signal - 可选的请求取消信号
 * @returns 可用的收藏表情列表
 */
async function getCustomEmoticonList(
  cookie: TGApp.App.Account.SignUidCookie,
  signal?: AbortSignal,
): Promise<Array<TGApp.BBS.CustomEmoticon.Item>> {
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(getAuthCookie(cookie), "GET", {}, "K2", true),
      "x-rpc-client_type": "2",
    },
  };
  if (signal !== undefined) config.signal = signal;

  const response = await TGHttps.get<TGApp.BBS.CustomEmoticon.ListResp>(
    customEmoticonListUrl,
    config,
  );
  if (typeof response.data !== "object" || response.data === null || Array.isArray(response.data)) {
    throw new TypeError("收藏表情列表响应无效");
  }
  if (typeof response.data.retcode !== "number") {
    throw new TypeError("收藏表情列表响应代码无效");
  }
  if (response.data.retcode !== 0) {
    const message =
      response.data.retcode === -100
        ? "登录状态无效，请重新登录米游社账号"
        : typeof response.data.message === "string" && response.data.message.trim()
          ? response.data.message
          : `retcode ${response.data.retcode}`;
    throw new Error(`获取收藏表情失败：${message}`);
  }
  return parseCustomEmoticonList(response.data.data);
}

const customEmoticonReq = {
  list: getCustomEmoticonList,
};

export default customEmoticonReq;
