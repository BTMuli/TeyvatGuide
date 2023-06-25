/**
 * @file plugins Hutao request getUserData.ts
 * @description 涉及 uid 的请求
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 查询是否存在该数据
 * @since Alpha v0.2.0
 * @todo 未完成
 * @param {string} uid
 * @return {Promise<boolean>}
 */
export async function checkUid(uid: string): Promise<boolean> {
  const url = HutaoApi.Abyss.user.check.replace("{uid}", uid);
  return await http
    .fetch<TGApp.Plugins.Hutao.AbyssRecordExistResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}

/**
 * @description 获取用户数据
 * @since Alpha v0.2.0
 * @todo 未完成
 * @param {string} uid
 * @return {Promise<TGApp.Plugins.Hutao.AbyssRecordRank>}
 */
export async function getUserData(uid: string): Promise<TGApp.Plugins.Hutao.AbyssRecordRank> {
  const url = HutaoApi.Abyss.user.rank.replace("{uid}", uid);
  return await http
    .fetch<TGApp.Plugins.Hutao.AbyssRecordRankResponse>(url, {
      method: "GET",
    })
    .then((res) => {
      return res.data.data;
    });
}
