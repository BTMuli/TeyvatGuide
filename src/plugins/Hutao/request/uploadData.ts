/**
 * @file plugins Hutao request uploadData.ts
 * @description Hutao 数据上传请求函数集合
 * @since Alpha v0.2.1
 */

import { http } from "@tauri-apps/api";

import HutaoApi from "../api";

/**
 * @description 上传用户数据
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Hutao.Abyss.RecordUpload} data 用户数据
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.UploadResponse>} 上传结果
 */
async function uploadData(
  data: TGApp.Plugins.Hutao.Abyss.RecordUpload,
): Promise<TGApp.Plugins.Hutao.Abyss.UploadResponse> {
  const url = HutaoApi.Abyss.upload;
  return await http
    .fetch<TGApp.Plugins.Hutao.Abyss.UploadResponse>(url, {
      method: "POST",
      body: http.Body.json(data),
    })
    .then((res) => res.data);
}

export default uploadData;
