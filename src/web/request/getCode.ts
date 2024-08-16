/**
 * @file web/request/getCode.ts
 * @description 获取兑换码相关请求
 * @since Beta v0.5.3
 */

import TGHttp from "../../utils/TGHttp.js";

/**
 * @description 获取兑换码请求
 * @since Beta v0.5.3
 * @param {string} act_id - 活动 id
 * @return {Promise<TGApp.BBS.Navigator.CodeData[]|TGApp.BBS.Response.Base>}
 */
async function getCode(
  act_id: string,
): Promise<TGApp.BBS.Navigator.CodeData[] | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode";
  const header = { "x-rpc-act_id": act_id };
  const res = await TGHttp<TGApp.BBS.Navigator.CodeResponse | TGApp.BBS.Response.Base>(url, {
    method: "GET",
    headers: header,
  });
  if (res.retcode !== 0) return <TGApp.BBS.Response.Base>res;
  return res.data.code_list;
}

export default getCode;
