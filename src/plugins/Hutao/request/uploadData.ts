/**
 * @file plugins Hutao request uploadData.ts
 * @description Hutao 数据上传请求函数集合
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// tauri
import { http } from "@tauri-apps/api";
// api
import HutaoApi from "../api";

/**
 * @description 上传用户数据
 * @since Alpha v0.2.0
 * @todo 上传用户数据
 * @param {TGApp.Plugins.Hutao.AbyssRecordUpload} data 用户数据
 * @returns {Promise<unknown>} 上传结果
 */
async function uploadData(data: TGApp.Plugins.Hutao.AbyssRecordUpload): Promise<unknown> {
  const url = HutaoApi.Abyss.upload;
  return await http
    .fetch(url, {
      method: "POST",
      body: http.Body.json(data),
    })
    .then((res) => res.data);
}

export default uploadData;
