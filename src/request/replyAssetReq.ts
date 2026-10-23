/**
 * 米游社回复资源请求
 * @since Beta v0.13.0
 */

import { matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import { prepareReplyImage } from "@utils/bbs/replyImage.js";
import { assertPositiveNumber, isNonBlankString, isRecord } from "@utils/common/typeGuards.js";
import { getRequestHeader } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

const replyApiBase: Readonly<string> = "https://bbs-api.miyoushe.com/";
const mentionUrl: Readonly<string> = `${replyApiBase}user/wapi/getUIDByNickname`;
const uploadParamsUrl: Readonly<string> = `${replyApiBase}apihub/wapi/getUploadParams`;
const customAvatarUploadParamsUrl: Readonly<string> = `${replyApiBase}apihub/sapi/getUploadParams`;
const ossUploadEndpoint: Readonly<string> =
  "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/";
const ossResponseHost: Readonly<string> = "upload-bbs.miyoushe.com";
const accountChangedMessage: Readonly<string> = "米游社当前账号已切换，请重试";
const uploadParamsFailedMessage: Readonly<string> = "米游社图片上传参数获取失败";
const ossUploadFailedMessage: Readonly<string> = "米游社图片上传失败";
const uploadContractMessage: Readonly<string> = "米游社图片上传参数无效";
const uploadPolicyMessage: Readonly<string> = "米游社图片上传策略无效";
// 官方上传 SDK 的 USER_AVATAR 枚举值；这里使用其线上的 key，而非展示名称。
const customAvatarUploadSource: Readonly<string> = "8";

const reservedFormFields: ReadonlySet<string> = new Set([
  "name",
  "key",
  "callback",
  "success_action_status",
  "file",
  "ossaccesskeyid",
  "policy",
  "signature",
  "x-oss-content-type",
  "x-oss-object-acl",
  "content-disposition",
]);

/**
 * OSS 图片上传参数
 * @since Beta v0.13.0
 */
type OssUploadParams = {
  accessid: string;
  callback: string;
  callbackVar: Array<TGApp.BBS.ReplyAsset.FormField>;
  contentDisposition?: string;
  extraFormData: Array<TGApp.BBS.ReplyAsset.FormField>;
  formName?: string;
  host: string;
  key: string;
  name: string;
  objectAcl?: string;
  policy: string;
  signature: string;
};

/**
 * 官方头像上传预签名响应
 * @since Beta v0.13.0
 */
type CustomUploadParamsResp = {
  retcode: number;
  message: string;
  data: unknown;
};

/**
 * 提取回复资源请求所需的登录凭据
 * @since Beta v0.13.0
 * @param cookie - 包含 ltoken 与 ltuid 的 Cookie
 * @returns 仅包含回复接口所需字段的 Cookie
 */
function getReplyCookie(cookie: TGApp.App.Account.LoginCookie): TGApp.App.Account.LoginCookie {
  if (!isRecord(cookie)) throw new TypeError("登录凭据无效");
  const ltoken = typeof cookie.ltoken === "string" ? cookie.ltoken.trim() : "";
  const ltuid = typeof cookie.ltuid === "string" ? cookie.ltuid.trim() : "";
  if (!ltoken || !ltuid) throw new Error("登录凭据缺少 ltoken 或 ltuid");
  return { ltoken, ltuid };
}

/**
 * 校验提及昵称
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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
 * 创建取消错误
 * @since Beta v0.13.0
 * @returns AbortError
 */
function createAbortError(): DOMException {
  return new DOMException("米游社图片上传已取消", "AbortError");
}

/**
 * 判断错误是否来自取消
 * @since Beta v0.13.0
 * @param error - 待判断的错误
 * @param signal - 请求信号
 * @returns 是否为取消错误
 */
function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return (
    signal.aborted ||
    (error instanceof Error && error.name === "AbortError") ||
    (isRecord(error) && error.name === "AbortError")
  );
}

/**
 * 传播取消错误
 * @since Beta v0.13.0
 * @param error - 原始错误
 * @param signal - 请求信号
 */
function throwCancellation(error: unknown, signal: AbortSignal): never {
  if (signal.aborted) {
    const reason = signal.reason;
    if (reason instanceof Error && reason.name === "AbortError") throw reason;
    throw createAbortError();
  }
  if (error instanceof Error && error.name === "AbortError") throw error;
  throw createAbortError();
}

/**
 * 从本地策略中校验有效期与字节大小范围
 * @since Beta v0.13.0
 * @param policy - OSS Base64 策略
 * @param size - 图片字节数
 */
function validatePolicy(policy: string, size: number): void {
  let decoded: unknown;
  try {
    const binary = atob(policy);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    decoded = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(uploadPolicyMessage);
  }

  if (
    !isRecord(decoded) ||
    !isNonBlankString(decoded.expiration) ||
    !Array.isArray(decoded.conditions)
  ) {
    throw new Error(uploadPolicyMessage);
  }
  const expiration = Date.parse(decoded.expiration);
  if (!Number.isFinite(expiration) || expiration <= Date.now()) {
    throw new Error("米游社回复图片上传策略已过期");
  }

  const lengthCondition = decoded.conditions.find(
    (condition) => Array.isArray(condition) && condition[0] === "content-length-range",
  );
  if (lengthCondition === undefined) return;
  if (
    !Array.isArray(lengthCondition) ||
    lengthCondition.length < 3 ||
    typeof lengthCondition[1] !== "number" ||
    typeof lengthCondition[2] !== "number" ||
    !Number.isSafeInteger(lengthCondition[1]) ||
    !Number.isSafeInteger(lengthCondition[2]) ||
    lengthCondition[1] < 0 ||
    lengthCondition[2] < lengthCondition[1] ||
    size < lengthCondition[1] ||
    size > lengthCondition[2]
  ) {
    throw new Error("图片大小超出米游社上传策略范围");
  }
}

/**
 * 校验相对路径片段
 * @since Beta v0.13.0
 * @param value - 路径值
 * @param name - 错误信息中的字段名称
 */
function assertSafePathPart(value: unknown, name: string): asserts value is string {
  if (
    !isNonBlankString(value) ||
    value.startsWith("/") ||
    value.includes("\\") ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    }) ||
    value.includes("%") ||
    value.includes("?") ||
    value.includes("#") ||
    value.split("/").some((part) => part === ".." || part === ".")
  ) {
    throw new Error(`${name}不符合图片上传路径要求`);
  }
}

/**
 * 校验图片上传主机
 * @since Beta v0.13.0
 * @param value - 服务端返回的 host
 */
function validateOssHost(value: unknown): asserts value is string {
  if (value !== ossUploadEndpoint && value !== ossUploadEndpoint.slice(0, -1)) {
    throw new Error(uploadContractMessage);
  }
}

/**
 * 校验回调字段
 * @since Beta v0.13.0
 * @param value - 回调字段对象
 * @returns 保留官方顺序的回调字段
 */
function parseCallbackFields(value: unknown): Array<TGApp.BBS.ReplyAsset.FormField> {
  if (value === undefined) return [];
  if (!isRecord(value)) throw new Error(uploadContractMessage);
  return Object.entries(value).map(([key, fieldValue]) => {
    if (
      !isNonBlankString(key) ||
      !key.startsWith("x:") ||
      typeof fieldValue !== "string" ||
      reservedFormFields.has(key.toLowerCase())
    ) {
      throw new Error(uploadContractMessage);
    }
    return { key, value: fieldValue };
  });
}

/**
 * 校验 OSS 额外表单字段
 * @since Beta v0.13.0
 * @param value - 额外表单字段列表
 * @param objectAcl - 已声明的对象 ACL
 * @returns 保留官方顺序与重复键的字段
 */
function parseExtraFormData(
  value: unknown,
  objectAcl: string | undefined,
): Array<TGApp.BBS.ReplyAsset.FormField> {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(uploadContractMessage);
  return value.map((entry) => {
    if (!isRecord(entry) || !isNonBlankString(entry.key) || typeof entry.value !== "string") {
      throw new Error(uploadContractMessage);
    }
    const isObjectAcl = entry.key === "x-oss-object-acl";
    if (
      !/^x-oss-[A-Za-z0-9-]+$/.test(entry.key) ||
      (reservedFormFields.has(entry.key.toLowerCase()) &&
        (!isObjectAcl || objectAcl === undefined || entry.value !== objectAcl))
    ) {
      throw new Error(uploadContractMessage);
    }
    return { key: entry.key, value: entry.value };
  });
}

/**
 * 解析 OSS 上传参数
 * @since Beta v0.13.0
 * @param data - 签名接口 data
 * @param prepared - 已准备的图片
 * @returns 可安全发送的 OSS 参数
 */
function parseOssUploadParams(
  data: unknown,
  prepared: TGApp.BBS.ReplyAsset.PreparedImage,
): OssUploadParams {
  if (!isRecord(data) || data.type !== "oss" || !isRecord(data.oss)) {
    throw new Error(uploadContractMessage);
  }
  const oss = data.oss;
  validateOssHost(oss.host);
  assertSafePathPart(oss.name, "图片名称");
  assertSafePathPart(oss.dir, "图片目录");
  if (!oss.dir.startsWith("upload/") || !oss.dir.endsWith("/") || oss.name.includes("/")) {
    throw new Error(uploadContractMessage);
  }
  if (!isNonBlankString(oss.callback)) throw new Error(uploadContractMessage);
  if (!isNonBlankString(oss.accessid)) throw new Error(uploadContractMessage);
  if (!isNonBlankString(oss.policy)) throw new Error(uploadContractMessage);
  if (!isNonBlankString(oss.signature)) throw new Error(uploadContractMessage);
  if (oss.x_oss_content_type !== prepared.contentType) {
    throw new Error(uploadContractMessage);
  }

  if (oss.object_acl !== undefined && !isNonBlankString(oss.object_acl)) {
    throw new Error(uploadContractMessage);
  }
  if (oss.content_disposition !== undefined && typeof oss.content_disposition !== "string") {
    throw new Error(uploadContractMessage);
  }
  const objectAcl = oss.object_acl;

  return {
    accessid: oss.accessid,
    callback: oss.callback,
    callbackVar: parseCallbackFields(oss.callback_var),
    contentDisposition: oss.content_disposition || undefined,
    extraFormData: parseExtraFormData(oss.extra_form_data, objectAcl),
    host: oss.host,
    key: `${oss.dir}${oss.name}`,
    name: oss.name,
    objectAcl,
    policy: oss.policy,
    signature: oss.signature,
  };
}

/**
 * 解析官方头像上传器返回的 OSS 参数。
 * @since Beta v0.13.0
 * @param data - `apihub/sapi/getUploadParams` 的 data 字段
 * @param prepared - 已准备的图片
 * @returns 可安全发送的 OSS 参数与官方表单文件名
 */
function parseCustomAvatarUploadParams(
  data: unknown,
  prepared: TGApp.BBS.ReplyAsset.PreparedImage,
): OssUploadParams {
  if (!isRecord(data) || data.type !== "oss" || !isRecord(data.params)) {
    throw new Error(uploadContractMessage);
  }
  if (!isNonBlankString(data.file_name)) throw new Error(uploadContractMessage);
  const params = data.params;
  validateOssHost(params.host);
  assertSafePathPart(params.name, "图片名称");
  assertSafePathPart(params.dir, "图片目录");
  assertSafePathPart(data.file_name, "图片文件名");
  if (!params.dir.startsWith("upload/") || !params.dir.endsWith("/") || params.name.includes("/")) {
    throw new Error(uploadContractMessage);
  }
  if (!isNonBlankString(params.callback)) throw new Error(uploadContractMessage);
  if (!isNonBlankString(params.accessid)) throw new Error(uploadContractMessage);
  if (!isNonBlankString(params.policy)) throw new Error(uploadContractMessage);
  if (!isNonBlankString(params.signature)) throw new Error(uploadContractMessage);
  if (params.x_oss_content_type !== prepared.contentType) {
    throw new Error(uploadContractMessage);
  }
  if (params.content_disposition !== undefined && typeof params.content_disposition !== "string") {
    throw new Error(uploadContractMessage);
  }

  const callbackVar = params.callback_var;
  if (!isRecord(callbackVar) || typeof callbackVar.extra !== "string") {
    throw new Error(uploadContractMessage);
  }

  return {
    accessid: params.accessid,
    callback: params.callback,
    callbackVar: parseCallbackFields({ "x:extra": callbackVar.extra }),
    contentDisposition: params.content_disposition || undefined,
    extraFormData: parseExtraFormData(params.extra_form_data, undefined),
    formName: data.file_name,
    host: params.host,
    key: `${params.dir}${params.name}`,
    name: params.name,
    policy: params.policy,
    signature: params.signature,
  };
}

/**
 * 在上传阶段之间同步校验账号和取消状态
 * @since Beta v0.13.0
 * @param snapshot - 回复账号快照
 * @param storage - 当前账号存储
 * @param signal - 合并取消信号
 */
function assertUploadActive(
  snapshot: TGApp.BBS.Reply.AccountSnapshot,
  storage: Pick<Storage, "getItem">,
  signal: AbortSignal,
): void {
  if (!matchesCurrentAccount(snapshot, storage)) {
    throw new Error(accountChangedMessage);
  }
  if (signal.aborted) throwCancellation(signal.reason, signal);
}

/**
 * 校验自定义头像上传阶段使用的 App Cookie 是否仍为当前账号。
 * @since Beta v0.13.0
 * @param snapshot - 回复账号快照
 * @param cookie - 自定义头像签名使用的 App Cookie
 * @param storage - 当前账号存储
 * @param signal - 合并取消信号
 */
function assertCustomAvatarUploadActive(
  snapshot: TGApp.BBS.Reply.AccountSnapshot,
  cookie: TGApp.App.Account.EditorCookie,
  storage: Pick<Storage, "getItem">,
  signal: AbortSignal,
): void {
  if (!matchesCustomAvatarAccount(snapshot, cookie, storage)) {
    throw new Error(accountChangedMessage);
  }
  if (signal.aborted) throwCancellation(signal.reason, signal);
}

/**
 * 判断自定义头像上传期间的网页登录账号与 App 凭据是否仍一致。
 * @since Beta v0.13.0
 * @param snapshot - 回复账号快照
 * @param cookie - 自定义头像签名使用的 App Cookie
 * @param storage - 当前账号存储
 * @returns 是否仍为同一账号与凭据
 */
function matchesCustomAvatarAccount(
  snapshot: TGApp.BBS.Reply.AccountSnapshot,
  cookie: TGApp.App.Account.EditorCookie,
  storage: Pick<Storage, "getItem">,
): boolean {
  if (!matchesCurrentAccount(snapshot, storage)) return false;
  try {
    const serialized = storage.getItem("curAccount");
    if (serialized === null) return false;
    const persisted: unknown = JSON.parse(serialized);
    return (
      isRecord(persisted) &&
      isRecord(persisted.cookie) &&
      persisted.cookie.stuid === cookie.stuid &&
      persisted.cookie.stoken === cookie.stoken &&
      persisted.cookie.mid === cookie.mid
    );
  } catch {
    return false;
  }
}

/**
 * 保留可诊断的 HTTP 状态，避免把上传凭证或原始响应放入错误链
 * @since Beta v0.13.0
 * @param message - 用户可见错误
 * @param error - 传输层错误
 * @returns 已移除敏感响应的错误
 */
function createUploadRequestError(message: string, error: unknown): Error {
  const status =
    isRecord(error) && typeof error.status === "number" && Number.isFinite(error.status)
      ? error.status
      : undefined;
  return new Error(message, { cause: { status } });
}

/**
 * 发出受控 JSON 请求
 * @since Beta v0.13.0
 * @param url - 请求地址
 * @param config - 请求配置
 * @param snapshot - 回复账号快照
 * @param storage - 当前账号存储
 * @param signal - 合并取消信号
 * @returns 响应数据
 */
async function postJson<T>(
  url: string,
  config: TGApp.App.Response.ReqConfParams,
  snapshot: TGApp.BBS.Reply.AccountSnapshot,
  storage: Pick<Storage, "getItem">,
  signal: AbortSignal,
): Promise<T> {
  try {
    const response = await TGHttps.post<T>(url, config);
    return response.data;
  } catch (error) {
    if (isAbortError(error, signal)) {
      if (!matchesCurrentAccount(snapshot, storage)) {
        throw createUploadRequestError(accountChangedMessage, error);
      }
      throwCancellation(error, signal);
    }
    throw createUploadRequestError(
      url === uploadParamsUrl ? uploadParamsFailedMessage : ossUploadFailedMessage,
      error,
    );
  }
}

/**
 * 发出受控 JSON GET 请求
 * @since Beta v0.13.0
 * @param url - 请求地址
 * @param config - 请求配置
 * @param snapshot - 回复账号快照
 * @param storage - 当前账号存储
 * @param signal - 合并取消信号
 * @returns 响应数据
 */
async function getJson<T>(
  url: string,
  config: TGApp.App.Response.ReqConfParams,
  snapshot: TGApp.BBS.Reply.AccountSnapshot,
  storage: Pick<Storage, "getItem">,
  signal: AbortSignal,
): Promise<T> {
  try {
    const response = await TGHttps.get<T>(url, config);
    return response.data;
  } catch (error) {
    if (isAbortError(error, signal)) {
      if (!matchesCurrentAccount(snapshot, storage)) {
        throw createUploadRequestError(accountChangedMessage, error);
      }
      throwCancellation(error, signal);
    }
    throw createUploadRequestError(uploadParamsFailedMessage, error);
  }
}

/**
 * 校验 OSS 响应 URL
 * @since Beta v0.13.0
 * @param value - OSS 响应 URL
 * @param key - 已签名对象键
 * @returns 原始 URL
 */
function validateUploadedUrl(value: unknown, key: string): string {
  if (typeof value !== "string" || !/^https:\/\/upload-bbs\.miyoushe\.com\//.test(value)) {
    throw new Error(ossUploadFailedMessage);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(ossUploadFailedMessage);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== ossResponseHost ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(ossUploadFailedMessage);
  }
  const expectedPath = `/${key}`;
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    throw new Error(ossUploadFailedMessage);
  }
  if (!expectedPath.startsWith("/upload/") || decodedPath !== expectedPath) {
    throw new Error(ossUploadFailedMessage);
  }
  return value;
}

/**
 * 解析并校验 OSS 上传响应
 * @since Beta v0.13.0
 * @param data - OSS 响应数据
 * @param key - 已签名对象键
 * @returns 上传 URL
 */
function parseOssResponse(data: unknown, key: string): string {
  if (!isRecord(data) || data.retcode !== 0 || !isRecord(data.data)) {
    throw new Error(ossUploadFailedMessage);
  }
  const result = data.data;
  const url = validateUploadedUrl(result.url, key);
  if ("object" in result && result.object !== key) throw new Error(ossUploadFailedMessage);
  return url;
}

/**
 * 构造 OSS multipart 表单
 * @since Beta v0.13.0
 * @param params - OSS 上传参数
 * @param file - 原始文件
 * @param prepared - 已准备的图片
 * @returns multipart 表单
 */
function createOssForm(
  params: OssUploadParams,
  file: File,
  prepared: TGApp.BBS.ReplyAsset.PreparedImage,
): FormData {
  const form = new FormData();
  form.append("name", params.formName ?? params.name);
  form.append("key", params.key);
  form.append("callback", params.callback);
  form.append("success_action_status", "200");
  for (const field of params.callbackVar) form.append(field.key, field.value);
  form.append("x-oss-content-type", prepared.contentType);
  for (const field of params.extraFormData) form.append(field.key, field.value);
  form.append("OSSAccessKeyId", params.accessid);
  form.append("policy", params.policy);
  form.append("signature", params.signature);
  if (params.objectAcl !== undefined) form.append("x-oss-object-acl", params.objectAcl);
  if (params.contentDisposition !== undefined) {
    form.append("Content-Disposition", params.contentDisposition);
  }
  form.append("file", new Blob([prepared.bytes], { type: prepared.contentType }), file.name);
  return form;
}

/**
 * 合并外部取消信号与账号切换取消信号
 * @since Beta v0.13.0
 * @param signal - 外部取消信号
 * @param accountSignal - 账号切换取消信号
 * @returns 合并后的信号
 */
function combineSignals(signal: AbortSignal | undefined, accountSignal: AbortSignal): AbortSignal {
  return signal === undefined ? accountSignal : AbortSignal.any([signal, accountSignal]);
}

/**
 * 解析米游社用户昵称
 * @since Beta v0.13.0
 * @param nickname - 待查询的昵称
 * @param cookie - 用户 Cookie，仅使用 ltoken 与 ltuid
 * @param gid - 社区 ID
 * @param signal - 可选的取消信号
 * @returns 用户 UID 与规范化昵称
 */
export async function resolveMention(
  nickname: string,
  cookie: TGApp.App.Account.LoginCookie,
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

  const response = await TGHttps.post<TGApp.BBS.ReplyAsset.MentionResp>(mentionUrl, config);
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
 * 校验图片文件
 * @since Beta v0.13.0
 * @param file - 待上传的图片文件
 */
function assertImageFile(file: File): void {
  if (typeof File === "undefined" || !(file instanceof File) || !isNonBlankString(file.name)) {
    throw new TypeError("图片文件无效");
  }
}

/**
 * 提取自定义头像上传所需的 App Cookie
 * @since Beta v0.13.0
 * @param cookie - 包含 stuid、stoken、mid 与 ltuid 的 Cookie
 * @returns 用于 API_BBS K2 签名的 Cookie
 */
function getCustomAvatarUploadCookie(
  cookie: TGApp.App.Account.EditorCookie,
): TGApp.App.Account.SignCookie {
  if (!isRecord(cookie)) throw new TypeError("登录凭据无效");
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
 * 上传自定义头像图片
 * @since Beta v0.13.0
 * @param file - 待上传的图片
 * @param cookie - 用户 App Cookie
 * @param signal - 可选的取消信号
 * @returns 已上传图片的信息
 * @remarks 官方 USER_AVATAR 上传使用 `apihub/sapi/getUploadParams` 的 GET 协议，上传源 key 为 8。
 */
export async function uploadCustomAvatarImage(
  file: File,
  cookie: TGApp.App.Account.EditorCookie,
  signal?: AbortSignal,
): Promise<TGApp.BBS.ReplyAsset.UploadedImage> {
  assertImageFile(file);
  const authCookie = getCustomAvatarUploadCookie(cookie);
  if (signal?.aborted) throwCancellation(signal.reason, signal);

  if (typeof window === "undefined") throw new Error("当前账号状态不可用");
  const storage = window.localStorage;
  const snapshot: TGApp.BBS.Reply.AccountSnapshot = {
    uid: cookie.ltuid,
    cookie: { ltoken: cookie.ltoken, ltuid: cookie.ltuid },
  };
  const accountAbortController = new AbortController();
  const requestSignal = combineSignals(signal, accountAbortController.signal);
  const onStorageChange = (): void => {
    if (!matchesCustomAvatarAccount(snapshot, cookie, storage)) {
      accountAbortController.abort(createAbortError());
    }
  };
  window.addEventListener("storage", onStorageChange);

  try {
    assertCustomAvatarUploadActive(snapshot, cookie, storage, requestSignal);
    const prepared = await prepareReplyImage(file, requestSignal);
    assertCustomAvatarUploadActive(snapshot, cookie, storage, requestSignal);
    const query = {
      md5: prepared.md5,
      ext: prepared.ext,
      support_content_type: 1,
      upload_source: customAvatarUploadSource,
    };
    const signConfig: TGApp.App.Response.ReqConfParams = {
      headers: {
        ...getRequestHeader(authCookie, "GET", query, "K2", true),
        "x-rpc-client_type": "2",
      },
      query,
      maxRedirections: 0,
      signal: requestSignal,
    };
    assertCustomAvatarUploadActive(snapshot, cookie, storage, requestSignal);
    const signedData = await getJson<CustomUploadParamsResp>(
      customAvatarUploadParamsUrl,
      signConfig,
      snapshot,
      storage,
      requestSignal,
    );
    assertCustomAvatarUploadActive(snapshot, cookie, storage, requestSignal);
    if (!isRecord(signedData) || signedData.retcode !== 0) {
      throw new Error(uploadParamsFailedMessage);
    }
    const params = parseCustomAvatarUploadParams(signedData.data, prepared);
    validatePolicy(params.policy, prepared.size);
    const form = createOssForm(params, file, prepared);
    const ossConfig: TGApp.App.Response.ReqConfParams = {
      headers: { Cookie: "" },
      body: form,
      maxRedirections: 0,
      signal: requestSignal,
    };
    assertCustomAvatarUploadActive(snapshot, cookie, storage, requestSignal);
    const ossData = await postJson<TGApp.BBS.ReplyAsset.UploadResp>(
      params.host,
      ossConfig,
      snapshot,
      storage,
      requestSignal,
    );
    assertCustomAvatarUploadActive(snapshot, cookie, storage, requestSignal);
    return {
      url: parseOssResponse(ossData, params.key),
      width: prepared.width,
      height: prepared.height,
    };
  } finally {
    window.removeEventListener("storage", onStorageChange);
  }
}

/**
 * 上传回复图片
 * @since Beta v0.13.0
 * @param file - 待上传的图片文件
 * @param cookie - 用户 Cookie，仅使用 ltoken 与 ltuid
 * @param gid - 社区 ID
 * @param signal - 可选的取消信号
 * @returns 已上传图片的信息
 */
export async function uploadImage(
  file: File,
  cookie: TGApp.App.Account.LoginCookie,
  gid: number,
  signal?: AbortSignal,
): Promise<TGApp.BBS.ReplyAsset.UploadedImage> {
  assertImageFile(file);
  const authCookie = getReplyCookie(cookie);
  assertPositiveNumber(gid, "社区 ID");
  if (signal?.aborted) throwCancellation(signal.reason, signal);

  if (typeof window === "undefined") throw new Error("当前账号状态不可用");
  const storage = window.localStorage;
  const snapshot: TGApp.BBS.Reply.AccountSnapshot = {
    uid: authCookie.ltuid,
    cookie: authCookie,
  };
  if (!matchesCurrentAccount(snapshot, storage)) throw new Error(accountChangedMessage);

  const accountAbortController = new AbortController();
  const requestSignal = combineSignals(signal, accountAbortController.signal);
  const onStorageChange = (): void => {
    if (!matchesCurrentAccount(snapshot, storage)) accountAbortController.abort(createAbortError());
  };
  window.addEventListener("storage", onStorageChange);

  try {
    const prepared = await prepareReplyImage(file, requestSignal);
    assertUploadActive(snapshot, storage, requestSignal);

    const body = {
      md5: prepared.md5,
      ext: prepared.ext,
      biz: "community",
      support_content_type: true,
      support_extra_form_data: true,
      extra: { upload_source: "UPLOAD_SOURCE_COMMUNITY" },
    };
    const bodyJson = JSON.stringify(body);
    const signConfig: TGApp.App.Response.ReqConfParams = {
      headers: {
        ...getRequestHeader(authCookie, "POST", bodyJson, "K2", true),
        "Content-Type": "application/json",
      },
      body: bodyJson,
      maxRedirections: 0,
      signal: requestSignal,
    };
    assertUploadActive(snapshot, storage, requestSignal);
    const signedData = await postJson<TGApp.BBS.ReplyAsset.UploadParamsResp>(
      uploadParamsUrl,
      signConfig,
      snapshot,
      storage,
      requestSignal,
    );
    assertUploadActive(snapshot, storage, requestSignal);
    if (!isRecord(signedData) || signedData.retcode !== 0) {
      throw new Error(uploadParamsFailedMessage);
    }
    const params = parseOssUploadParams(signedData.data, prepared);
    // max_file_size 与 expire 的单位尚未确认，大小和有效期按标准 OSS policy 校验。
    validatePolicy(params.policy, prepared.size);
    const form = createOssForm(params, file, prepared);
    const ossConfig: TGApp.App.Response.ReqConfParams = {
      // 显式空 Cookie 阻止当前 plugin-http 的持久 cookie jar 注入；升级依赖时需复核此语义。
      headers: { Cookie: "" },
      body: form,
      maxRedirections: 0,
      signal: requestSignal,
    };
    assertUploadActive(snapshot, storage, requestSignal);
    const ossData = await postJson<TGApp.BBS.ReplyAsset.UploadResp>(
      ossUploadEndpoint,
      ossConfig,
      snapshot,
      storage,
      requestSignal,
    );
    assertUploadActive(snapshot, storage, requestSignal);
    return {
      url: parseOssResponse(ossData, params.key),
      width: prepared.width,
      height: prepared.height,
    };
  } finally {
    window.removeEventListener("storage", onStorageChange);
  }
}

/**
 * 回复资源能力
 * @since Beta v0.13.0
 */
export const replyAssetCapabilities = <const>{ imageUpload: true, mention: true };

const replyAssetReq = { resolveMention, uploadImage };

export default replyAssetReq;
