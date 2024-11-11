/**
 * @file plugins/Hutao/request/abyssReq.ts
 * @description 深渊相关请求
 * @since Beta v0.6.3
 */
import TGHttp from "../../../utils/TGHttp.js";

const AbyssUrl = `https://homa.snapgenshin.com/Statistics/`;

/**
 * @description 获取深渊概览数据
 * @since Beta v0.6.3
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.OverviewData>}
 */
export async function getAbyssOverview(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.OverviewData> {
  const url = `${AbyssUrl}Overview`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.OverviewResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 获取角色搭配数据
 * @since Beta v0.6.3
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]>}
 */
export async function getAvatarCollect(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollocation[]> {
  const url = `${AbyssUrl}Avatar/AvatarCollocation`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarCollocationResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 获取角色持有率数据
 * @since Beta v0.6.3
 * @param {boolean} isLast 是否获取上期数据
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]>}
 */
export async function getAvatarHoldRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarHold[]> {
  const url = `${AbyssUrl}Avatar/HoldingRate`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarHoldResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 获取角色上场率数据
 * @since Beta v0.6.3
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>}
 */
export async function getAvatarUpRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUp[]> {
  const url = `${AbyssUrl}Avatar/AttendanceRate`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUpResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 获取角色使用率
 * @since Beta v0.6.3
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>}
 */
export async function getAvatarUseRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUse[]> {
  const url = `${AbyssUrl}Avatar/UtilizationRate`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUseResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 获取队伍搭配数据
 * @since Beta v0.6.3
 * @param {boolean} isLast 是否获取上期数据
 * @return {Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]>}
 */
export async function getTeamCollect(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.TeamCombination[]> {
  const url = `${AbyssUrl}Team/Combination`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.TeamCombinationResponse>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 上传用户数据
 * @since Beta v0.5.0
 * @param {TGApp.Plugins.Hutao.Abyss.RecordUpload} data 用户数据
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.UploadResponse>} 上传结果
 */
export async function uploadAbyssData(
  data: TGApp.Plugins.Hutao.Abyss.RecordUpload,
): Promise<TGApp.Plugins.Hutao.Abyss.UploadResponse> {
  const url = "https://homa.snapgenshin.com/Record/Upload";
  return await TGHttp<TGApp.Plugins.Hutao.Abyss.UploadResponse>(url, {
    method: "POST",
    body: JSON.stringify(data),
    query: { returningRank: false },
    headers: { "Content-Type": "application/json" },
  });
}
