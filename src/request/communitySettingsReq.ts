/**
 * 米游社个人中心设置请求
 * @since Beta v0.12.6
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

import { uploadCustomAvatarImage } from "./replyAssetReq.js";

const communityApiBaseUrl: Readonly<string> = "https://bbs-api.miyoushe.com/";
const customAvatarPolicyUrl: Readonly<string> = `${communityApiBaseUrl}user/api/edit_avatar/check`;
const customAvatarProfileUrl: Readonly<string> = `${communityApiBaseUrl}user/api/userInfoEdit`;
const avatarAssetsUrl: Readonly<string> = `${communityApiBaseUrl}pendant/api/assets/getMyBackpackAssets`;
const commentDecorationAssetsUrl: Readonly<string> = `${communityApiBaseUrl}pendant/api/setUserAssets`;
const commentDecorationAssetsType: Readonly<number> = 4;

/**
 * 提取设置请求所需的最小 Cookie
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @returns 用于请求头签名的最小 Cookie
 */
function getCommunityCookie(cookie: TGApp.App.Account.Cookie): TGApp.App.Account.CookieTokenCookie {
  return { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
}

/**
 * 提取自定义头像检查请求所需的米游社 App Cookie
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @returns 用于 App 端签名与 Cookie 注入的凭据
 */
function getCustomAvatarCookie(cookie: TGApp.App.Account.Cookie): TGApp.App.Account.SignCookie {
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
 * 创建设置写入请求头
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @param body - JSON 请求体
 * @returns 带签名的 JSON 请求头
 */
function getSettingsWriteHeaders(
  cookie: TGApp.App.Account.Cookie,
  body:
    | TGApp.BBS.CommunitySettings.PrivacyUpdate
    | TGApp.BBS.CommunitySettings.ProfileUpdate
    | TGApp.BBS.CommunitySettings.PendantUpdate,
): Record<string, string> {
  return {
    ...getRequestHeader(getCommunityCookie(cookie), "POST", JSON.stringify(body), "X4", true),
    "Content-Type": "application/json",
  };
}

/**
 * 将未知接口值转换为对象
 * @since Beta v0.12.6
 * @param value - 待转换值
 * @returns 对象值或 undefined
 */
function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return <Record<string, unknown>>value;
}

/**
 * 将资源 ID 归一为安全整数
 * @since Beta v0.12.6
 * @param value - 接口返回的资源 ID
 * @param errorMessage - 数据无效时的错误消息
 * @returns 资源数字 ID
 * @remarks ID 缺失、非整数或超出安全整数范围时抛出错误
 */
function getAssetId(value: unknown, errorMessage: string): number {
  const id = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) {
    throw new TypeError(errorMessage);
  }
  return id;
}

/**
 * 读取接口返回的获取方法
 * @since Beta v0.12.6
 * @param value - 接口资源对象
 * @returns 去除首尾空白后的获取方法，缺失或空字符串返回 undefined
 */
function getObtainMethod(value: Record<string, unknown>): string | undefined {
  const method = value.obtain_method ?? value.obtainMethod;
  if (typeof method !== "string") return undefined;
  const normalized = method.trim();
  return normalized === "" ? undefined : normalized;
}

/**
 * 校验隐私接口中的布尔值
 * @since Beta v0.12.6
 * @param value - 接口返回值
 * @returns 布尔值
 */
function readBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TypeError("隐私设置数据无效，请重新加载。");
  return value;
}

/**
 * 将官方隐私响应转换为设置界面值
 * @since Beta v0.12.6
 * @param info - 隐私接口返回数据，缺失或无效设置会被拒绝
 * @param profileUserCenterView - 个人资料中的主页访问值，1 为允许，2 为禁止
 * @returns 设置界面值
 * @remarks 隐私布尔值缺失、类型错误或主页权限非法时抛出错误
 */
function getPrivacyDraft(
  info: unknown,
  profileUserCenterView: number,
): TGApp.BBS.CommunitySettings.PrivacyDraft {
  const root = getRecord(info);
  const invisible = getRecord(root?.privacy_invisible);
  if (!invisible || (profileUserCenterView !== 1 && profileUserCenterView !== 2)) {
    throw new TypeError("隐私设置数据无效，请重新加载。");
  }
  return {
    showPosts: !readBoolean(invisible.post_and_instant),
    showReplies: !readBoolean(invisible.reply),
    showCollections: !readBoolean(invisible.collect),
    addWatermark: !readBoolean(invisible.watermark),
    showUserCenter: profileUserCenterView === 1,
  };
}

/**
 * 按官方请求协议生成完整的五项隐私设置
 * @since Beta v0.12.6
 * @param draft - 当前界面值
 * @returns 官方隐私写入参数
 */
function buildPrivacyUpdate(
  draft: TGApp.BBS.CommunitySettings.PrivacyDraft,
): TGApp.BBS.CommunitySettings.PrivacyUpdate {
  return {
    privacy_invisible_post_and_instant: !draft.showPosts,
    privacy_invisible_collect: !draft.showCollections,
    privacy_invisible_watermark: !draft.addWatermark,
    privacy_visible_reply: draft.showReplies,
    privacy_user_center_view: draft.showUserCenter ? 1 : 2,
  };
}

export { buildPrivacyUpdate, getPrivacyDraft };

/**
 * 获取当前账户的隐私设置
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @returns 隐私设置响应数据
 */
async function getPrivacy(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.CommunitySettings.PrivacyInfoResp> {
  const resp = await TGHttps.get<TGApp.BBS.CommunitySettings.PrivacyInfoResp>(
    `${communityApiBaseUrl}user/wapi/getUserCommunityInfo`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", {}, "X4", true),
    },
  );
  return resp.data;
}

/**
 * 更新当前账户的隐私设置
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param settings - 完整的五项隐私设置参数
 * @returns 隐私设置响应数据
 */
async function setPrivacy(
  cookie: TGApp.App.Account.Cookie,
  settings: TGApp.BBS.CommunitySettings.PrivacyUpdate,
): Promise<TGApp.BBS.CommunitySettings.PrivacyUpdateResp> {
  const body: TGApp.BBS.CommunitySettings.PrivacyUpdate = {
    privacy_invisible_post_and_instant: readBoolean(settings.privacy_invisible_post_and_instant),
    privacy_invisible_collect: readBoolean(settings.privacy_invisible_collect),
    privacy_invisible_watermark: readBoolean(settings.privacy_invisible_watermark),
    privacy_visible_reply: readBoolean(settings.privacy_visible_reply),
    privacy_user_center_view: settings.privacy_user_center_view,
  };
  if (body.privacy_user_center_view !== 1 && body.privacy_user_center_view !== 2) {
    throw new TypeError("隐私设置数据无效，请重新加载。");
  }
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.PrivacyUpdateResp>(
    `${communityApiBaseUrl}user/wapi/userPrivacySetting`,
    {
      headers: getSettingsWriteHeaders(cookie, body),
      body,
    },
  );
  return resp.data;
}

/**
 * 更新当前账户的昵称和简介
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param profile - 资料编辑参数
 * @param signal - 可选的请求取消信号
 * @returns 资料编辑响应数据
 */
async function updateProfile(
  cookie: TGApp.App.Account.Cookie,
  profile: TGApp.BBS.CommunitySettings.ProfileUpdate,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.ProfileUpdateResp> {
  const config: TGApp.App.Response.ReqConfParams = {
    headers: getSettingsWriteHeaders(cookie, profile),
    body: profile,
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.ProfileUpdateResp>(
    `${communityApiBaseUrl}user/wapi/userInfoEdit`,
    config,
  );
  return resp.data;
}

/**
 * 解析自定义头像费用检查结果
 * @since Beta v0.12.6
 * @param value - 检查接口 data 字段
 * @returns 头像更换的有效费用与米游币余额
 */
function parseCustomAvatarPolicy(value: unknown): TGApp.BBS.CommunitySettings.CustomAvatarPolicy {
  const info = getRecord(value);
  const balance = info?.current_myb;
  const paidCost = info?.edit_custom_avatar_cost_myb;
  const isFirstEdit = info?.is_first_edit_custom_avatar;
  const isUserInit = info?.is_user_init;
  if (
    typeof balance !== "number" ||
    !Number.isSafeInteger(balance) ||
    balance < 0 ||
    typeof paidCost !== "number" ||
    !Number.isSafeInteger(paidCost) ||
    paidCost < 0 ||
    typeof isFirstEdit !== "boolean" ||
    typeof isUserInit !== "boolean"
  ) {
    throw new TypeError("自定义头像费用数据无效，请重新加载。");
  }
  return {
    cost: isFirstEdit || isUserInit ? 0 : paidCost,
    rawCost: paidCost,
    balance,
  };
}

/**
 * 获取自定义头像更换费用与余额
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param signal - 可选的请求取消信号
 * @returns 有效费用与米游币余额
 */
async function getCustomAvatarPolicy(
  cookie: TGApp.App.Account.Cookie,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.CustomAvatarPolicy> {
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(getCustomAvatarCookie(cookie), "POST", "", "K2", true),
      "x-rpc-client_type": "2",
    },
    body: "",
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.CustomAvatarCheckResp>(
    customAvatarPolicyUrl,
    config,
  );
  if (resp.data.retcode !== 0) {
    throw new Error(resp.data.message || "自定义头像费用检查失败");
  }
  return parseCustomAvatarPolicy(resp.data.data);
}

/**
 * 上传自定义头像并生成资料更新字段
 * @since Beta v0.12.6
 * @param file - 已完成本地裁剪的头像图片
 * @param cookie - 账户 Cookie
 * @param signal - 可选的请求取消信号
 * @returns 自定义头像资料更新字段
 */
async function uploadCustomAvatar(
  file: File,
  cookie: TGApp.App.Account.Cookie,
  signal?: AbortSignal,
): Promise<
  Pick<TGApp.BBS.CommunitySettings.ProfileUpdate, "avatar" | "avatar_url" | "avatar_assets_id">
> {
  const uploaded = await uploadCustomAvatarImage(file, cookie, signal);
  return { avatar: "", avatar_url: uploaded.url, avatar_assets_id: "" };
}

/**
 * 构造官方 App 资料更新参数
 * @since Beta v0.12.6
 * @param profile - 包含资料与头像地址的更新参数
 * @returns 仅包含官方 App 资料接口支持的字段
 * @remarks 自定义头像要求 upload-bbs 地址；动态头像允许携带查询参数的官方资源地址
 */
function buildAppProfile(
  profile: TGApp.BBS.CommunitySettings.ProfileUpdate,
): TGApp.BBS.CommunitySettings.ProfileUpdate {
  const nickname = profile.nickname;
  const introduce = profile.introduce;
  const gender = profile.gender;
  const avatarUrl = profile.avatar_url;
  const rawAvatarAssetsId = profile.avatar_assets_id ?? "";
  if (typeof nickname !== "string" || nickname.trim() === "") {
    throw new TypeError("昵称不能为空");
  }
  if (typeof introduce !== "string") throw new TypeError("个人简介无效");
  if (typeof gender !== "number" || !Number.isSafeInteger(gender)) {
    throw new TypeError("性别数据无效");
  }
  if (typeof rawAvatarAssetsId !== "string") throw new TypeError("动态头像数据无效");
  if (typeof avatarUrl !== "string" || avatarUrl.trim() === "") {
    throw new TypeError("自定义头像地址无效");
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(avatarUrl);
  } catch {
    throw new TypeError("自定义头像地址无效");
  }
  const avatarAssetsId = rawAvatarAssetsId.trim();
  const isDynamicAvatar = avatarAssetsId !== "";
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.port !== "" ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== ""
  ) {
    throw new TypeError("自定义头像地址无效");
  }
  if (
    !isDynamicAvatar &&
    (parsedUrl.hostname !== "upload-bbs.miyoushe.com" ||
      parsedUrl.search !== "" ||
      parsedUrl.hash !== "")
  ) {
    throw new TypeError("自定义头像地址无效");
  }
  return {
    avatar: "",
    avatar_url: avatarUrl,
    avatar_assets_id: avatarAssetsId,
    gender,
    introduce: introduce.trim(),
    nickname: nickname.trim(),
  };
}

/**
 * 使用官方 API_BBS 接口提交资料、自定义头像或动态头像
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @param profile - 包含昵称、简介、性别和头像资料的参数
 * @param signal - 可选的请求取消信号
 * @returns 资料编辑响应数据
 */
async function updateAppProfile(
  cookie: TGApp.App.Account.Cookie,
  profile: TGApp.BBS.CommunitySettings.ProfileUpdate,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.ProfileUpdateResp> {
  const body = buildAppProfile(profile);
  const authCookie = getCustomAvatarCookie(cookie);
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(authCookie, "POST", JSON.stringify(body), "K2", true),
      "x-rpc-client_type": "2",
      "Content-Type": "application/json",
    },
    body,
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.ProfileUpdateResp>(
    customAvatarProfileUrl,
    config,
  );
  return resp.data;
}

/**
 * 获取米游社可选头像列表
 * @since Beta v0.12.6
 * @returns 可选头像分组响应数据
 */
async function getAvatars(): Promise<TGApp.BBS.CommunitySettings.AvatarSetResp> {
  const resp = await TGHttps.get<TGApp.BBS.CommunitySettings.AvatarSetResp>(
    `${communityApiBaseUrl}misc/api/avatar_set`,
    {},
  );
  return resp.data;
}

/**
 * 获取当前账户拥有的动态头像列表
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param signal - 可选的请求取消信号
 * @returns 动态头像列表响应数据
 */
async function getAvatarAssets(
  cookie: TGApp.App.Account.Cookie,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.AvatarAssetResp> {
  const query = { assets_type: 3 };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(getCustomAvatarCookie(cookie), "GET", query, "K2", true),
      "x-rpc-client_type": "2",
    },
    query,
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.get<TGApp.BBS.CommunitySettings.AvatarAssetResp>(
    avatarAssetsUrl,
    config,
  );
  return resp.data;
}

/**
 * 将接口返回的头像框 ID 归一为数字
 * @since Beta v0.12.6
 * @param value - 接口返回的头像框 ID，官方接口可能以字符串返回
 * @returns 头像框数字 ID
 * @remarks ID 缺失、非整数或为负数时抛出错误
 */
function getPendantId(value: unknown): number {
  return getAssetId(value, "头像框数据无效，请重新加载。");
}

/**
 * 保留评论装扮资源 ID 的字符串精度
 * @since Beta v0.12.6
 * @param value - 接口返回的评论装扮资源 ID
 * @returns 去除首尾空白后的字符串 ID
 * @remarks 官方资源 ID 为 19 位整数，超出 Number 安全范围，必须按字符串保存
 */
function getCommentDecorationId(value: unknown): string {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new TypeError("评论装扮数据无效，请重新加载。");
}

/**
 * 将接口返回的可选数字字段归一化
 * @since Beta v0.12.6
 * @param value - 接口返回值
 * @returns 有限数字或 undefined
 */
function getOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/**
 * 将接口返回的评论装扮资源归一化
 * @since Beta v0.12.6
 * @param value - 评论装扮资源对象
 * @param owned - 是否属于已拥有列表
 * @returns 评论装扮选择项
 * @remarks 评论装扮图片位于 resource.reply_bubble，缺失时回退到资源自身的 url
 */
function normalizeCommentDecoration(
  value: unknown,
  owned: boolean,
): TGApp.BBS.CommunitySettings.CommentDecoration {
  const record = getRecord(value);
  const resource = getRecord(record?.resource);
  const replyBubble = getRecord(resource?.reply_bubble ?? resource?.replyBubble);
  const id = getCommentDecorationId(record?.id ?? record?.assets_id);
  const name = record?.name;
  if (typeof name !== "string") {
    throw new TypeError("评论装扮数据无效，请重新加载。");
  }
  const url =
    record?.url ??
    resource?.url ??
    replyBubble?.url ??
    replyBubble?.animation_effects_gif_url ??
    replyBubble?.gif_url ??
    replyBubble?.animation_effects_pag_url ??
    replyBubble?.pag_url;
  const decoration: TGApp.BBS.CommunitySettings.CommentDecoration = {
    id,
    name,
    url: typeof url === "string" ? url : "",
    owned:
      typeof record?.owned === "boolean"
        ? record.owned
        : typeof record?.is_owned === "boolean"
          ? record.is_owned
          : owned,
    is_used: typeof record?.is_used === "boolean" ? record.is_used : false,
  };
  const description = record?.description ?? record?.desc;
  if (typeof description === "string") decoration.description = description;
  if (typeof replyBubble?.bg_color === "string") decoration.bg_color = replyBubble.bg_color;
  if (typeof record?.author === "string") decoration.author = record.author;
  const remainTime = getOptionalNumber(record?.remain_time);
  if (remainTime !== undefined) decoration.remain_time = remainTime;
  const expiredTime = getOptionalNumber(record?.expired_time);
  if (expiredTime !== undefined) decoration.expired_time = expiredTime;
  const obtainMethod = record ? getObtainMethod(record) : undefined;
  if (obtainMethod !== undefined) decoration.obtainMethod = obtainMethod;
  return decoration;
}

/**
 * 提取评论装扮接口列表
 * @since Beta v0.12.6
 * @param value - 评论装扮接口 data 字段
 * @returns 已拥有与未拥有的原始列表
 * @remarks 背包接口返回 assets_list / unowned_assets_list，兼容旧版 list 字段
 */
function getCommentDecorationRecords(value: unknown): {
  owned: Array<unknown>;
  unowned: Array<unknown>;
} {
  const data = getRecord(value);
  const owned = Array.isArray(data?.assets_list)
    ? data.assets_list
    : Array.isArray(data?.list)
      ? data.list
      : undefined;
  if (!owned) throw new TypeError("评论装扮数据无效，请重新加载。");
  const unowned = Array.isArray(data?.unowned_assets_list) ? data.unowned_assets_list : [];
  return { owned, unowned };
}

/**
 * 获取当前账户拥有的头像框列表
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @returns 头像框列表响应数据
 */
async function getPendantList(
  cookie: TGApp.App.Account.Cookie,
): Promise<TGApp.BBS.CommunitySettings.PendantListResp> {
  const resp = await TGHttps.get<TGApp.BBS.CommunitySettings.PendantListResp>(
    `${communityApiBaseUrl}pendant/wapi/getUserPendantList`,
    {
      headers: getRequestHeader(getCommunityCookie(cookie), "GET", {}, "X4", true),
    },
  );
  if (resp.data.retcode === 0) {
    resp.data.data.list = resp.data.data.list.map((pendant) => {
      const obtainMethod = getObtainMethod(<Record<string, unknown>>(<unknown>pendant));
      return {
        ...pendant,
        id: getPendantId(pendant.id),
        ...(obtainMethod === undefined ? {} : { obtainMethod }),
      };
    });
  }
  return resp.data;
}

/**
 * 获取当前账户的评论装扮列表
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @param signal - 可选的请求取消信号
 * @returns 评论装扮列表响应数据
 */
async function getCommentDecorationList(
  cookie: TGApp.App.Account.Cookie,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.CommentDecorationListResp> {
  const query = { assets_type: commentDecorationAssetsType };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(getCustomAvatarCookie(cookie), "GET", query, "K2", true),
      "x-rpc-client_type": "2",
    },
    query,
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.get<TGApp.BBS.Response.BaseWithData<unknown>>(avatarAssetsUrl, config);
  if (resp.data.retcode !== 0) {
    return <TGApp.BBS.CommunitySettings.CommentDecorationListResp>resp.data;
  }
  const records = getCommentDecorationRecords(resp.data.data);
  const ownedList = records.owned.map((item) => normalizeCommentDecoration(item, true));
  const ownedIds = new Set(ownedList.map((decoration) => decoration.id));
  const unownedList = records.unowned
    .map((item) => normalizeCommentDecoration(item, false))
    .filter((decoration) => !ownedIds.has(decoration.id));
  return { ...resp.data, data: { list: [...ownedList, ...unownedList] } };
}

/**
 * 设置当前账户使用的头像框
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param pendantId - 头像框 ID，0 表示不使用头像框
 * @param signal - 可选的请求取消信号
 * @returns 头像框设置响应数据
 */
async function setPendant(
  cookie: TGApp.App.Account.Cookie,
  pendantId: number,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.PendantUpdateResp> {
  if (!Number.isSafeInteger(pendantId) || pendantId < 0) throw new TypeError("头像框 ID 无效");
  const body: TGApp.BBS.CommunitySettings.PendantUpdate = { pendant_id: pendantId };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: getSettingsWriteHeaders(cookie, body),
    body,
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.PendantUpdateResp>(
    `${communityApiBaseUrl}pendant/wapi/setUserPendant`,
    config,
  );
  return resp.data;
}

/**
 * 设置当前账户使用的评论装扮
 * @since Beta v0.12.6
 * @param cookie - 完整账户 Cookie
 * @param id - 评论装扮 ID，空字符串或 0 表示不使用评论装扮
 * @param signal - 可选的请求取消信号
 * @returns 评论装扮设置响应数据
 */
async function setCommentDecoration(
  cookie: TGApp.App.Account.Cookie,
  id: string,
  signal?: AbortSignal,
): Promise<TGApp.BBS.CommunitySettings.CommentDecorationUpdateResp> {
  const assetsId = id.trim() || "0";
  if (!/^\d+$/.test(assetsId)) throw new TypeError("评论装扮 ID 无效");
  const query = { assets_id: assetsId, assets_type: commentDecorationAssetsType };
  const config: TGApp.App.Response.ReqConfParams = {
    headers: {
      ...getRequestHeader(getCustomAvatarCookie(cookie), "POST", query, "K2", true),
      "x-rpc-client_type": "2",
    },
    query,
  };
  if (signal !== undefined) config.signal = signal;
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.CommentDecorationUpdateResp>(
    commentDecorationAssetsUrl,
    config,
  );
  return resp.data;
}

const communitySettingsReq = {
  getPrivacy,
  setPrivacy,
  updateProfile,
  getCustomAvatarPolicy,
  uploadCustomAvatar,
  updateAppProfile,
  getAvatars,
  getAvatarAssets,
  getPendantList,
  setPendant,
  getCommentDecorationList,
  setCommentDecoration,
};

export {
  getAvatarAssets,
  getAvatars,
  getCommentDecorationList,
  getCustomAvatarPolicy,
  getPendantList,
  getPrivacy,
  setCommentDecoration,
  setPendant,
  setPrivacy,
  updateAppProfile,
  updateProfile,
  uploadCustomAvatar,
};
export default communitySettingsReq;
