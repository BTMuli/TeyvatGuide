/**
 * @file request/miscReq.ts
 * @description 杂项请求
 * @since Beta v0.7.1
 */
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttp from "@utils/TGHttp.js";

// BBSApiMiscBaseUrl => bamBu
const bamBu: Readonly<string> = "https://bbs-api.miyoushe.com/misc/api/";

/**
 * @description 创建极验验证
 * @since Beta v0.7.1
 * @param {Record<string,string>} cookie Cookie
 * @param {boolean} useK2 是否使用 K2
 * @returns {Promise<TGApp.BBS.Response.Base | TGApp.BBS.Geetest.CreateRes>}
 */
async function createVerification(
  cookie: Record<string, string>,
  useK2: boolean = true,
): Promise<TGApp.BBS.Response.Base | TGApp.BBS.Geetest.CreateRes> {
  const param = { is_high: true };
  let header;
  if (useK2) {
    header = {
      ...getRequestHeader(cookie, "GET", param, "K2", true),
      "x-rpc-client_type": "2",
    };
  } else header = getRequestHeader(cookie, "GET", param, "X4", true);
  const resp = await TGHttp<TGApp.BBS.Geetest.CreateResp>(`${bamBu}createVerification`, {
    method: "GET",
    headers: header,
    query: param,
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data;
}

/**
 * @description 验证极验验证
 * @since Beta v0.7.1
 * @param {TGApp.BBS.Geetest.GeetestVerifyRes} data 极验验证数据
 * @param {Record<string,string>} cookie Cookie
 * @param {boolean} useK2 是否使用 K2
 * @returns {Promise<TGApp.BBS.Response.Base|string>}
 */
async function verifyVerification(
  data: TGApp.BBS.Geetest.GeetestVerifyRes,
  cookie: Record<string, string>,
  useK2: boolean = true,
): Promise<TGApp.BBS.Response.Base | string> {
  let header;
  if (useK2) {
    header = {
      ...getRequestHeader(cookie, "POST", JSON.stringify(data), "K2"),
      "x-rpc-client_type": "2",
    };
  } else header = getRequestHeader(cookie, "POST", JSON.stringify(data), "X4");
  const resp = await TGHttp<TGApp.BBS.Geetest.VerifyResp>(`${bamBu}verifyVerification`, {
    method: "POST",
    headers: header,
    body: JSON.stringify(data),
  });
  if (resp.retcode !== 0) return <TGApp.BBS.Response.Base>resp;
  return resp.data.challenge;
}

/**
 * @description 获取极验验证 challenge
 * @since Beta v0.7.1
 * @param {Record<string,string>} cookie Cookie
 * @param {boolean} useK2 是否使用 K2
 * @returns {Promise<string>}
 */
async function getGeetestChallenge(
  cookie: Record<string, string>,
  useK2: boolean = false,
): Promise<string | false> {
  const createResp = await createVerification(cookie, useK2);
  if ("retcode" in createResp) {
    showSnackbar.error(`[${createResp.retcode}] ${createResp.message}`);
    return false;
  }
  const gtRes = await showGeetest(createResp);
  if (!gtRes) return false;
  const verifyRes = await verifyVerification(gtRes, cookie, useK2);
  if (typeof verifyRes !== "string") {
    showSnackbar.error(`[${verifyRes.retcode}] ${verifyRes.message}`);
    return false;
  }
  return verifyRes;
}

const miscReq = {
  create: createVerification,
  verify: verifyVerification,
  challenge: getGeetestChallenge,
};

export default miscReq;
