/**
 * 深渊相关请求
 * @since Beta v0.6.3
 */
import TGHttp from "@utils/TGHttp.js";

const AbyssUrl: Readonly<string> = `https://homa.snapgenshin.com/Statistics/`;

/**
 * 获取深渊概览数据
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 深渊概览数据
 */
export async function getAbyssOverview(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.OverviewData> {
  const url = `${AbyssUrl}Overview`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.OverviewResp>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色搭配数据
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 角色搭配数据
 */
export async function getAvatarCollect(
  isLast: boolean = false,
): Promise<Array<TGApp.Plugins.Hutao.Abyss.AvatarCollocation>> {
  const url = `${AbyssUrl}Avatar/AvatarCollocation`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarCollectResp>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色持有率数据
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 角色持有率数据
 */
export async function getAvatarHoldRate(
  isLast: boolean = false,
): Promise<Array<TGApp.Plugins.Hutao.Abyss.AvatarHold>> {
  const url = `${AbyssUrl}Avatar/HoldingRate`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarHoldResp>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色上场率数据
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 角色上场率数据
 */
export async function getAvatarUpRate(
  isLast: boolean = false,
): Promise<Array<TGApp.Plugins.Hutao.Abyss.AvatarUp>> {
  const url = `${AbyssUrl}Avatar/AttendanceRate`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUpResp>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色使用率
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 角色使用率
 */
export async function getAvatarUseRate(
  isLast: boolean = false,
): Promise<Array<TGApp.Plugins.Hutao.Abyss.AvatarUse>> {
  const url = `${AbyssUrl}Avatar/UtilizationRate`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.AvatarUseResp>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取队伍搭配数据
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 队伍搭配数据
 */
export async function getTeamCollect(
  isLast: boolean = false,
): Promise<Array<TGApp.Plugins.Hutao.Abyss.TeamCombination>> {
  const url = `${AbyssUrl}Team/Combination`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Abyss.TeamCombineResp>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 上传用户数据
 * @since Beta v0.5.0
 * @param data - 用户数据
 * @returns 上传结果
 */
export async function uploadAbyssData(
  data: TGApp.Plugins.Hutao.Abyss.RecordUpload,
): Promise<TGApp.Plugins.Hutao.Abyss.UploadResp> {
  const url = "https://homa.snapgenshin.com/Record/Upload";
  return await TGHttp<TGApp.Plugins.Hutao.Abyss.UploadResp>(url, {
    method: "POST",
    body: JSON.stringify(data),
    query: { returningRank: false },
    headers: { "Content-Type": "application/json" },
  });
}
