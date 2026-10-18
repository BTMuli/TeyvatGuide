/**
 * 米游社回复资源请求
 * @since Beta v0.12.6
 */
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const replyApiBase: Readonly<string> = "https://bbs-api.miyoushe.com/";
const mentionUrl: Readonly<string> = `${replyApiBase}user/wapi/getUIDByNickname`;
const imageUploadUnavailableMessage: Readonly<string> =
  "米游社回复图片上传暂不可用：官方上传域名与图片尺寸返回契约无法安全确认";

/**
 * 昵称解析响应
 * @since Beta v0.12.6
 */
type MentionResponse = {
  retcode: number;
  message: string;
  data: unknown;
};

/**
 * 判断值是否为普通对象
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为字符串键对象
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
 * 提取回复资源请求所需的登录凭据
 * @since Beta v0.12.6
 * @param cookie - 完整 Cookie
 * @returns 仅包含回复接口所需字段的 Cookie
 */
function getReplyCookie(cookie: Record<string, string>): Record<string, string> {
  if (!isRecord(cookie)) throw new TypeError("登录凭据无效");
  const ltoken = typeof cookie.ltoken === "string" ? cookie.ltoken.trim() : "";
  const ltuid = typeof cookie.ltuid === "string" ? cookie.ltuid.trim() : "";
  if (!ltoken || !ltuid) throw new Error("登录凭据缺少 ltoken 或 ltuid");
  return { ltoken, ltuid };
}

/**
 * 校验提及昵称
 * @since Beta v0.12.6
 * @param nickname - 待查询的昵称
 * @returns 去除首尾空白后的昵称
 */
function normalizeNickname(nickname: string): string {
  if (typeof nickname !== "string") throw new TypeError("昵称必须为字符串");
  const normalized = nickname.trim();
  if (!normalized) throw new TypeError("昵称不能为空");
  return normalized;
}

/**
 * 从官方昵称解析响应中提取 UID
 * @since Beta v0.12.6
 * @param data - 接口响应数据
 * @param nickname - 请求的昵称
 * @returns 用户 UID
 */
function getMentionUid(data: unknown, nickname: string): number {
  if (!isRecord(data) || !isRecord(data.nickname_uid_info)) {
    throw new Error("米游社昵称解析响应缺少 nickname_uid_info");
  }
  const value = data.nickname_uid_info[nickname];
  const uid =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[1-9]\d*$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(uid) || uid <= 0) throw new Error("米游社昵称解析响应缺少有效 UID");
  return uid;
}

/**
 * 解析米游社用户昵称
 * @since Beta v0.12.6
 * @param nickname - 待查询的昵称
 * @param cookie - 用户 Cookie，仅使用 ltoken 与 ltuid
 * @param gid - 社区 ID
 * @param signal - 可选的取消信号
 * @returns 用户 UID 与规范化昵称
 */
export async function resolveMention(
  nickname: string,
  cookie: Record<string, string>,
  gid: number,
  signal?: AbortSignal,
): Promise<TGApp.BBS.ReplyAsset.Mention> {
  const normalizedNickname = normalizeNickname(nickname);
  assertPositiveNumber(gid, "社区 ID");
  const authCookie = getReplyCookie(cookie);
  const body = { gids: String(gid), nickname_list: [normalizedNickname] };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(authCookie, "POST", body, "K2", true),
      "x-rpc-client_type": "2",
      "Content-Type": "application/json",
    },
    body,
  };
  if (signal !== undefined) config.signal = signal;

  const response = await TGHttps.post<MentionResponse>(mentionUrl, config);
  if (!isRecord(response.data) || typeof response.data.retcode !== "number") {
    throw new Error("米游社昵称解析响应无效");
  }
  if (response.data.retcode !== 0) {
    const message = typeof response.data.message === "string" ? response.data.message : "";
    throw new Error(message || "米游社昵称解析失败");
  }
  return {
    uid: getMentionUid(response.data.data, normalizedNickname),
    nickname: normalizedNickname,
  };
}

/**
 * 上传回复图片
 * @since Beta v0.12.6
 * @param file - 待上传的图片文件
 * @param cookie - 用户 Cookie，仅使用 ltoken 与 ltuid
 * @param gid - 社区 ID
 * @param signal - 可选的取消信号
 * @returns 已上传图片的信息
 * @remarks
 * 官方缓存只证明了签名入口和多种存储分支，未证明运行时上传域名白名单及 width/height 返回契约。
 * 共享 TGHttps 会将 FormData 序列化为 JSON，因此在契约完整前保持禁用，避免向未知域名发送 Cookie。
 */
export async function uploadImage(
  file: File,
  cookie: Record<string, string>,
  gid: number,
  signal?: AbortSignal,
): Promise<TGApp.BBS.ReplyAsset.UploadedImage> {
  if (!isRecord(file)) throw new TypeError("图片文件无效");
  getReplyCookie(cookie);
  assertPositiveNumber(gid, "社区 ID");
  if (signal?.aborted) throw new Error("请求已取消");
  throw new Error(imageUploadUnavailableMessage);
}

/**
 * 回复资源能力
 * @since Beta v0.12.6
 */
export const replyAssetCapabilities = <const>{ imageUpload: false, mention: true };

const replyAssetReq = { resolveMention, uploadImage };

export default replyAssetReq;
