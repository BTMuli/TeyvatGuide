/**
 * 祈愿相关请求
 * @since Beta v0.10.1
 */
import TGHttps from "@utils/TGHttps.js";

import { getReqHeader } from "../utils/authUtils.js";

const HUTAO_GACHA_API = "https://homa.gentle.house/GachaLog/";

/**
 * 获取抽卡入口
 * @since Beta v0.10.1
 * @param tk - token
 * @returns 抽卡记录概况响应
 */
async function entry(tk: string): Promise<TGApp.Plugins.Hutao.Gacha.EntryResp> {
  const url = `${HUTAO_GACHA_API}Entries`;
  const header = await getReqHeader(tk);
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Gacha.EntryResp>(url, {
    headers: header,
  });
  return resp.data;
}

/**
 * 获取抽卡EndId
 * @since Beta v0.10.1
 * @param tk - token
 * @param uid - 记录UID
 * @returns EndId响应
 */
async function endIds(tk: string, uid: string): Promise<TGApp.Plugins.Hutao.Gacha.EndIdResp> {
  const url = `${HUTAO_GACHA_API}EndIds`;
  const header = await getReqHeader(tk);
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Gacha.EndIdResp>(url, {
    headers: header,
    query: { Uid: uid },
  });
  return resp.data;
}

/**
 * 获取抽卡记录
 * @since Beta v0.10.1
 * @param tk - token
 * @param uid - 记录UID
 * @param gType - 祈愿类型
 * @param count - 数量
 * @param endId - endId
 * @returns 抽卡记录响应
 */
async function logs(
  tk: string,
  uid: string,
  gType: number,
  count: number,
  endId: string | undefined = undefined,
): Promise<TGApp.Plugins.Hutao.Gacha.GachaLogResp> {
  const url = `${HUTAO_GACHA_API}LimitedRetrieve`;
  const header = await getReqHeader(tk);
  const params: Record<string, string | number> = {
    uid: uid,
    configType: gType,
    count: count,
  };
  if (endId) params.endId = endId;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Gacha.GachaLogResp>(url, {
    headers: header,
    query: params,
  });
  return resp.data;
}

/**
 * 上传抽卡记录
 * @since Beta v0.10.1
 * @param tk - token
 * @param data - 上传数据
 * @returns 上传结果
 */
async function upload(
  tk: string,
  data: TGApp.Plugins.Hutao.Gacha.UploadData,
): Promise<TGApp.Plugins.Hutao.Gacha.UploadResp> {
  const url = `${HUTAO_GACHA_API}Upload`;
  const header = await getReqHeader(tk);
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Gacha.UploadResp>(url, {
    headers: header,
    body: data,
  });
  return resp.data;
}

/**
 * 删除祈愿记录
 * @since Beta v0.10.1
 * @param tk - token
 * @param uid - uid
 * @returns 删除结果
 */
async function deleteLogs(tk: string, uid: string): Promise<TGApp.Plugins.Hutao.Gacha.DeleteResp> {
  const url = `${HUTAO_GACHA_API}Delete`;
  const header = await getReqHeader(tk);
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Gacha.DeleteResp>(url, {
    headers: header,
    query: { Uid: uid },
  });
  return resp.data;
}

const GachaReq = {
  entry,
  endIds,
  logs,
  upload,
  delete: deleteLogs,
};

export default GachaReq;
