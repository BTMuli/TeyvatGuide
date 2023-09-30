/**
 * @file src web request operVerification.ts
 * @description 验证码操作请求函数
 * @since Beta v0.3.3
 */

import TGUtils from "../utils/TGUtils";
import { http } from "@tauri-apps/api";
import showSnackbar from "../../components/func/snackbar";

/**
 * @description 发起验证请求
 * @param {string} Ltoken ltoken
 * @param {string} Ltuid ltuid
 * @return {Promise<TGApp.Plugins.Geetest.getData|TGApp.BBS.Response.Base>} 验证码参数
 */
export async function getVerification(
  Ltoken: string,
  Ltuid: string,
): Promise<TGApp.BBS.Geetest.getData | TGApp.BBS.Response.Base> {
  const url = "https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/createVerification";
  const cookie = {
    ltoken: Ltoken,
    ltuid: Ltuid,
  };
  const params = { is_high: "true" };
  const header = TGUtils.User.getHeader(cookie, "GET", params, "common");
  return await http
    .fetch<TGApp.BBS.Geetest.getResponse>(url, {
      method: "GET",
      headers: header,
      query: params,
    })
    .then((res) => {
      if (res.data.retcode !== 0) return res.data;
      return res.data.data;
    });
}

/**
 * @description 将验证完的参数提交给米游社
 * @since Beta v0.3.3
 * @todo 待测试
 * @param {Record<string, string>} cookie cookie
 * @param {TGApp.BBS.Geetest.GeetestValidate} validate 验证码参数
 * @return {Promise<TGApp.BBS.Response.Base|unknown>} 提交结果
 */
export async function submitVerification(
  cookie: Record<string, string>,
  validate: TGApp.BBS.Geetest.GeetestValidate,
): Promise<TGApp.BBS.Response.Base | unknown> {
  const url = "https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/verifyVerification";
  const data = {
    geetest_challenge: validate.geetest_challenge,
    geetest_validate: validate.geetest_validate,
    geetest_seccode: validate.geetest_seccode,
  };
  console.log(data);
  const header = TGUtils.User.getHeader(cookie, "POST", data, "lk2", true);
  const reqHeader = {
    ...header,
    "x-rpc-challenge_game": "2",
    "x-rpc-challenge_trace": validate.geetest_challenge,
    "x-rpc-validate": validate.geetest_validate,
    "x-rpc-seccode": validate.geetest_seccode,
  };
  console.log(reqHeader);
  return await http
    .fetch<TGApp.BBS.Response.Base>(url, {
      method: "POST",
      headers: reqHeader,
      body: http.Body.json(data),
    })
    .then((res) => {
      if (res.data.retcode !== 0) {
        showSnackbar({
          text: `[${res.data.retcode}] ${res.data.message}`,
          color: "error",
        });
        console.error(res.data);
      }
      return res.data;
    });
}
