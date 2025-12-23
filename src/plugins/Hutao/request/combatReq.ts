/**
 * 幻想真境剧诗相关请求
 * @since Beta v0.6.3
 */
import TGHttp from "@utils/TGHttp.js";

const CombatUrl: Readonly<string> = "https://homa.snapgenshin.com/RoleCombat/";

/**
 * 获取数据
 * @since Beta v0.6.3
 * @param isLast - 是否获取上期数据
 * @returns 剧诗数据
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
 * 上传数据
 * @since Beta v0.6.3
 * @param data - 数据
 * @returns 上传返回
 */
export async function uploadCombatData(
  data: TGApp.Plugins.Hutao.Combat.UploadData,
): Promise<TGApp.Plugins.Hutao.Combat.UploadResp> {
  const url = `${CombatUrl}Upload`;
  return await TGHttp<TGApp.Plugins.Hutao.Combat.UploadResp>(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}
