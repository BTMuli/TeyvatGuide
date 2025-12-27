/**
 * 幻想真境剧诗相关请求
 * @since Beta v0.9.1
 */
import TGHttp from "@utils/TGHttp.js";

const CombatUrl: Readonly<string> = "https://homa.gentle.house/RoleCombat/";

/**
 * 获取数据
 * @since Beta v0.9.1
 * @param isLast - 是否获取上期数据
 * @returns 剧诗数据
 */
export async function getCombatStatistic(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Combat.Data | TGApp.Plugins.Hutao.Base.Resp> {
  const url = `${CombatUrl}Statistics`;
  const resp = await TGHttp<TGApp.Plugins.Hutao.Combat.Response>(url, {
    method: "GET",
    query: { Last: isLast },
  });
  if (resp.data) return resp.data;
  return { retcode: resp.retcode, message: resp.message };
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
