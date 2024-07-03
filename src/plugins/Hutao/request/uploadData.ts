/**
 * @file plugins/Hutao/request/uploadData.ts
 * @description Hutao 数据上传请求函数集合
 * @since Beta v0.5.0
 */

import TGHttp from "../../../utils/TGHttp.js";
import HutaoApi from "../api/index.js";

/**
 * @description 上传用户数据
 * @since Beta v0.5.0
 * @param {TGApp.Plugins.Hutao.Abyss.RecordUpload} data 用户数据
 * @returns {Promise<TGApp.Plugins.Hutao.Abyss.UploadResponse>} 上传结果
 */
async function uploadData(
  data: TGApp.Plugins.Hutao.Abyss.RecordUpload,
): Promise<TGApp.Plugins.Hutao.Abyss.UploadResponse> {
  const url = HutaoApi.Abyss.upload;
  return await TGHttp<TGApp.Plugins.Hutao.Abyss.UploadResponse>(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export default uploadData;
