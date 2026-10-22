/**
 * 米游社个人中心设置请求
 * @since Beta v0.12.6
 */

import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const communityApiBaseUrl: Readonly<string> = "https://bbs-api.miyoushe.com/";

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
 * @returns 资料编辑响应数据
 */
async function updateProfile(
  cookie: TGApp.App.Account.Cookie,
  profile: TGApp.BBS.CommunitySettings.ProfileUpdate,
): Promise<TGApp.BBS.CommunitySettings.ProfileUpdateResp> {
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.ProfileUpdateResp>(
    `${communityApiBaseUrl}user/wapi/userInfoEdit`,
    {
      headers: getSettingsWriteHeaders(cookie, profile),
      body: profile,
    },
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
  return resp.data;
}

/**
 * 设置当前账户使用的头像框
 * @since Beta v0.12.6
 * @param cookie - 账户 Cookie
 * @param pendantId - 头像框 ID，0 表示不使用头像框
 * @returns 头像框设置响应数据
 */
async function setPendant(
  cookie: TGApp.App.Account.Cookie,
  pendantId: number,
): Promise<TGApp.BBS.CommunitySettings.PendantUpdateResp> {
  if (!Number.isInteger(pendantId) || pendantId < 0) throw new TypeError("头像框 ID 无效");
  const body: TGApp.BBS.CommunitySettings.PendantUpdate = { pendant_id: pendantId };
  const resp = await TGHttps.post<TGApp.BBS.CommunitySettings.PendantUpdateResp>(
    `${communityApiBaseUrl}pendant/wapi/setUserPendant`,
    {
      headers: getSettingsWriteHeaders(cookie, body),
      body,
    },
  );
  return resp.data;
}

const communitySettingsReq = {
  getPrivacy,
  setPrivacy,
  updateProfile,
  getAvatars,
  getPendantList,
  setPendant,
};

export { getAvatars, getPendantList, getPrivacy, setPendant, setPrivacy, updateProfile };
export default communitySettingsReq;
