/**
 * Misc路径下的请求
 * @since Beta v0.10.1
 */
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

// BBSApiMiscBaseUrl => bamBu
const bamBu: Readonly<string> = "https://bbs-api.miyoushe.com/misc/api/";

/**
 * 创建极验验证
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param useK2 - 是否使用 K2
 * @returns 极验创建响应数据
 */
async function createVerification(
  cookie: Record<string, string>,
  useK2: boolean = true,
): Promise<TGApp.BBS.Geetest.CreateResp> {
  const param = { is_high: true };
  let header;
  if (useK2) {
    header = {
      ...getRequestHeader(cookie, "GET", param, "K2", true),
      "x-rpc-client_type": "2",
    };
  } else header = getRequestHeader(cookie, "GET", param, "X4", true);
  const resp = await TGHttps.get<TGApp.BBS.Geetest.CreateResp>(`${bamBu}createVerification`, {
    headers: header,
    query: param,
  });
  return resp.data;
}

/**
 * 验证极验验证
 * @since Beta v0.10.1
 * @param data - 极验验证数据
 * @param cookie - Cookie
 * @param useK2 - 是否使用 K2
 * @returns 验证响应数据
 */
async function verifyVerification(
  data: TGApp.BBS.Geetest.GeetestVerifyRes,
  cookie: Record<string, string>,
  useK2: boolean = true,
): Promise<TGApp.BBS.Geetest.VerifyResp> {
  let header;
  if (useK2) {
    header = {
      ...getRequestHeader(cookie, "POST", JSON.stringify(data), "K2"),
      "x-rpc-client_type": "2",
    };
  } else header = getRequestHeader(cookie, "POST", JSON.stringify(data), "X4");
  const resp = await TGHttps.post<TGApp.BBS.Geetest.VerifyResp>(`${bamBu}verifyVerification`, {
    headers: header,
    body: JSON.stringify(data),
  });
  return resp.data;
}

/**
 * 获取极验验证 challenge
 * @since Beta v0.10.1
 * @param cookie - Cookie
 * @param useK2 - 是否使用 K2
 * @returns challenge 字符串
 */
async function getGeetestChallenge(
  cookie: Record<string, string>,
  useK2: boolean = false,
): Promise<string | false> {
  let createResp: TGApp.BBS.Geetest.CreateResp | undefined;
  try {
    createResp = await createVerification(cookie, useK2);
    if (createResp.retcode !== 0) {
      showSnackbar.error(`[${createResp.retcode}] ${createResp.message}`);
      return false;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`创建验证失败：${errMsg}`);
    return false;
  }
  const gtRes = await showGeetest(createResp.data);
  if (!gtRes) return false;
  let verifyRes: TGApp.BBS.Geetest.VerifyResp | undefined;
  try {
    verifyRes = await verifyVerification(gtRes, cookie, useK2);
    if (verifyRes.retcode !== 0) {
      showSnackbar.error(`[${verifyRes.retcode}] ${verifyRes.message}`);
      return false;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`验证失败：${errMsg}`);
    return false;
  }
  return verifyRes.data.challenge;
}

const miscReq = {
  create: createVerification,
  verify: verifyVerification,
  challenge: getGeetestChallenge,
};

export default miscReq;
