/**
 * @file plugins/Hutao/request/combatReq.ts
 * @description 幻想真境剧诗相关请求
 * @since Beta v0.6.3
 */
import TGHttp from "../../../utils/TGHttp.js";

const CombatUrl = "https://homa.snapgenshin.com/RoleCombat/";

/**
 * @description 获取数据
 * @since Beta v0.6.3
 * @param {boolean} isLast
 * @return {Promise<TGApp.Plugins.Hutao.Combat.Data>}
 */
export async function getCombatStatistic(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Combat.Data | undefined> {
  const url = `${CombatUrl}Statistics`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Combat.Response>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * @description 上传数据
 * @since Beta v0.6.3
 * @param {TGApp.Plugins.Hutao.Combat.UploadData} data
 * @returns {Promise<TGApp.Plugins.Hutao.Combat.UploadResponse>}
 */
export async function uploadCombatData(
  data: TGApp.Plugins.Hutao.Combat.UploadData,
): Promise<TGApp.Plugins.Hutao.Combat.UploadResponse> {
  const url = `${CombatUrl}Upload`;
  return await TGHttp<TGApp.Plugins.Hutao.Combat.UploadResponse>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}
