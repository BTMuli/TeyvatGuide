/**
 * 米游社收藏表情请求
 * @since Beta v0.13.0
 */

import { getAppSignCookie, getRequestHeader } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

import { parseCustomEmoticonList } from "../utils/bbs/customEmoticon.js";

const customEmoticonListUrl: Readonly<string> =
  "https://bbs-api.miyoushe.com/misc/api/customEmoticonList";
const customEmoticonAddUrl: Readonly<string> =
  "https://bbs-api.miyoushe.com/misc/api/addCustomEmoticon";
const customEmoticonRemoveUrl: Readonly<string> =
  "https://bbs-api.miyoushe.com/misc/api/removeCustomEmoticon";

/**
 * 获取收藏表情接口的失败提示
 * @since Beta v0.13.0
 * @param retcode - 响应代码
 * @param message - 响应消息
 * @returns 可用于界面展示的失败原因
 */
function getFailureMessage(retcode: number, message: unknown): string {
  if (retcode === -100) return "登录状态无效，请重新登录米游社账号";
  if (typeof message === "string" && message.trim()) return message;
  return `retcode ${retcode}`;
}

/**
 * 校验收藏表情写入接口的响应
 * @since Beta v0.13.0
 * @param response - 接口响应
 * @param action - 操作名称
 */
function assertWriteSucceeded(
  response: TGApp.BBS.CustomEmoticon.WriteResp,
  action: "添加" | "删除",
): void {
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    throw new TypeError(`${action}收藏表情响应无效`);
  }
  if (typeof response.retcode !== "number") {
    throw new TypeError(`${action}收藏表情响应代码无效`);
  }
  if (response.retcode !== 0) {
    throw new Error(
      `${action}收藏表情失败：${getFailureMessage(response.retcode, response.message)}`,
    );
  }
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
      ...getRequestHeader(getAppSignCookie(cookie), "GET", {}, "K2", true),
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
    throw new Error(
      `获取收藏表情失败：${getFailureMessage(response.data.retcode, response.data.message)}`,
    );
  }
  return parseCustomEmoticonList(response.data.data);
}

/**
 * 新增收藏表情
 * @since Beta v0.13.0
 * @param cookie - 用户 Cookie，仅使用 stuid、stoken、mid 与 ltuid
 * @param image - 已上传的图片地址、尺寸与文件大小
 * @param signal - 可选的请求取消信号
 */
async function addCustomEmoticon(
  cookie: TGApp.App.Account.SignUidCookie,
  image: TGApp.BBS.CustomEmoticon.AddImage,
  signal?: AbortSignal,
): Promise<void> {
  const authCookie = getAppSignCookie(cookie);
  const body: TGApp.BBS.CustomEmoticon.AddInfo = {
    img_url: image.url,
    img_ext: {
      width: image.width,
      height: image.height,
      file_size: image.fileSize,
    },
  };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(authCookie, "POST", JSON.stringify(body), "K2", true),
      "x-rpc-client_type": "2",
      "Content-Type": "application/json",
    },
    body,
  };
  if (signal !== undefined) config.signal = signal;

  const response = await TGHttps.post<TGApp.BBS.CustomEmoticon.WriteResp>(
    customEmoticonAddUrl,
    config,
  );
  assertWriteSucceeded(response.data, "添加");
}

/**
 * 删除收藏表情
 * @since Beta v0.13.0
 * @param cookie - 用户 Cookie，仅使用 stuid、stoken、mid 与 ltuid
 * @param id - 收藏表情 ID
 * @param signal - 可选的请求取消信号
 */
async function removeCustomEmoticon(
  cookie: TGApp.App.Account.SignUidCookie,
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  const emoticonId = id.trim();
  if (!emoticonId) throw new TypeError("收藏表情 ID 无效");
  const authCookie = getAppSignCookie(cookie);
  const body: TGApp.BBS.CustomEmoticon.RemoveInfo = { ids: [emoticonId] };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(authCookie, "POST", JSON.stringify(body), "K2", true),
      "x-rpc-client_type": "2",
      "Content-Type": "application/json",
    },
    body,
  };
  if (signal !== undefined) config.signal = signal;

  const response = await TGHttps.post<TGApp.BBS.CustomEmoticon.WriteResp>(
    customEmoticonRemoveUrl,
    config,
  );
  assertWriteSucceeded(response.data, "删除");
}

const customEmoticonReq = {
  add: addCustomEmoticon,
  list: getCustomEmoticonList,
  remove: removeCustomEmoticon,
};

export default customEmoticonReq;
