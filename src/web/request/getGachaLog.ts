/**
 * @file web/request/getGachaLog.ts
 * @description 获取抽卡记录请求函数
 * @since Beta v0.3.0
 */

import { http } from "@tauri-apps/api";

/**
 * @description 获取抽卡记录
 * @since Beta v0.3.0
 * @param {string} authkey authkey
 * @param {string} gachaType 抽卡类型
 * @param {string} endId 结束 id，默认为 0
 * @returns {Promise<TGApp.Game.Gacha.GachaItem[] | TGApp.BBS.Response.Base>} 抽卡记录
 */
export async function getGachaLog(
  authkey: string,
  gachaType: string,
  endId: string = "0",
): Promise<TGApp.Game.Gacha.GachaItem[] | TGApp.BBS.Response.Base> {
  const url = "https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog";
  const params = {
    lang: "zh-cn",
    auth_appid: "webview_gacha",
    authkey,
    authkey_ver: "1",
    sign_type: "2",
    gacha_type: gachaType,
    size: "20",
    end_id: endId,
  };
  return await http
    .fetch<TGApp.Game.Gacha.GachaLogResponse | TGApp.BBS.Response.Base>(url, {
      method: "GET",
      query: params,
    })
    .then((res) => {
      if (res.data.retcode === 0) return res.data.data.list;
      return res.data;
    });
}
