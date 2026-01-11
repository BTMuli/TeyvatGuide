/**
 * 祈愿相关请求
 * @since Beta v0.9.1
 */
import { getReqHeader } from "@Hutao/utils/authUtils.js";
import TGHttp from "@utils/TGHttp.js";

const GachaUrl = "https://homa.gentle.house/GachaLog/";

/**
 * 获取抽卡入口
 * @param tk - token
 * @returns 抽卡记录概况
 */
export async function getEntries(
  tk: string,
): Promise<TGApp.Plugins.Hutao.Gacha.EntryRes | TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${GachaUrl}Entries`;
  const header = await getReqHeader(tk);
  const resp = await TGHttp<TGApp.Plugins.Hutao.Gacha.EntryResp>(url, {
    method: "GET",
    headers: header,
  });
  if (resp.retcode !== 0) return <TGApp.Plugins.Hutao.Base.Resp>resp;
  return <TGApp.Plugins.Hutao.Gacha.EntryRes>resp.data;
}

/**
 * 获取抽卡EndId
 * @param tk - token
 * @param uid - 记录UID
 * @returns EndId
 */
export async function getEndIds(
  tk: string,
  uid: string,
): Promise<TGApp.Plugins.Hutao.Gacha.EndIdRes | TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${GachaUrl}EndIds`;
  const header = await getReqHeader(tk);
  const resp = await TGHttp<TGApp.Plugins.Hutao.Gacha.EndIdResp>(url, {
    method: "GET",
    headers: header,
    query: { Uid: uid },
    hasBigInt: true,
  });
  if (resp.retcode !== 0) return <TGApp.Plugins.Hutao.Base.Resp>resp;
  return <TGApp.Plugins.Hutao.Gacha.EndIdRes>resp.data;
}

/**
 * 获取抽卡记录
 * @since Beta v0.9.1
 * @param tk - token
 * @param uid - 记录UID
 * @param gType - 祈愿类型，按照EndId来
 * @param endId - endId
 * @param count - 尺寸
 */
export async function getGachaLogs(
  tk: string,
  uid: string,
  gType: number,
  count: number,
  endId: string | undefined = undefined,
): Promise<TGApp.Plugins.Hutao.Gacha.GachaLogResp> {
  const url = `${GachaUrl}LimitedRetrieve`;
  const header = await getReqHeader(tk);
  const params: Record<string, string | number> = {
    uid: uid,
    configType: gType,
    count: count,
  };
  if (endId) params.endId = endId;
  return await TGHttp<TGApp.Plugins.Hutao.Gacha.GachaLogResp>(url, {
    method: "GET",
    headers: header,
    query: params,
    hasBigInt: true,
  });
}

/**
 * 上传抽卡记录
 * @since Beta v0.9.1
 * @param tk - token
 * @param data - 上传数据
 * @returns 上传结果
 */
export async function uploadGachaLogs(
  tk: string,
  data: TGApp.Plugins.Hutao.Gacha.UploadData,
): Promise<TGApp.Plugins.Hutao.Gacha.UploadResp> {
  const url = `${GachaUrl}Upload`;
  const header = await getReqHeader(tk);
  return await TGHttp<TGApp.Plugins.Hutao.Gacha.UploadResp>(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
}

/**
 * 删除祈愿记录
 * @since Beta v0.9.1
 * @param tk - token
 * @param uid - uid
 * @returns 删除结果
 */
export async function deleteGachaLogs(
  tk: string,
  uid: string,
): Promise<TGApp.Plugins.Hutao.Gacha.DeleteResp> {
  const url = `${GachaUrl}Delete`;
  const header = await getReqHeader(tk);
  return await TGHttp<TGApp.Plugins.Hutao.Gacha.DeleteResp>(url, {
    method: "GET",
    headers: header,
    query: { Uid: uid },
  });
}
