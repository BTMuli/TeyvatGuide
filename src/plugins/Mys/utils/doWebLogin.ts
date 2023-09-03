/**
 * @file plugins Mys utils getLoginQr
 * @description 获取登录二维码
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

// tauri
import { http } from "@tauri-apps/api";

const uuid = crypto.randomUUID();

const headers: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "zh-CN,zh;q=0.9",
  Connection: "keep-alive",
  Origin: "https://user.miyoushe.com",
  Referer: "https://user.miyoushe.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
  "x-rpc-app_id": "bll8iq97cem8",
  "X-Rpc-Device_id": uuid,
};

/**
 * @description 获取登录二维码
 * @since Beta v0.3.0
 * @returns {Promise<TGApp.Plugins.Mys.WebLogin.GetLoginQrData|TGApp.Plugins.Mys.Base.Response>}
 */
export async function getLoginQr(): Promise<
  TGApp.Plugins.Mys.WebLogin.GetLoginQrData | TGApp.Plugins.Mys.Base.Response
> {
  const url = "https://passport-api.miyoushe.com/account/ma-cn-passport/web/createQRLogin";
  return await http
    .fetch<TGApp.Plugins.Mys.WebLogin.GetLoginQrResponse>(url, {
      method: "POST",
      headers,
      body: http.Body.json({}),
    })
    .then((res) => {
      if (res.data.retcode === 0) {
        return res.data.data;
      } else {
        return res.data;
      }
    });
}

/**
 * @description 获取登录状态
 * @since Beta v0.3.0
 * @param {string} ticket 二维码票据
 * @returns {Promise<Record<string, string[]>}
 */
export async function getLoginStatus(
  ticket: string,
): Promise<TGApp.Plugins.Mys.WebLogin.GetLoginStatusResponse | Record<string, string>> {
  const url = "https://passport-api.miyoushe.com/account/ma-cn-passport/web/queryQRLoginStatus";
  const resp = await http.fetch<TGApp.Plugins.Mys.WebLogin.GetLoginStatusResponse>(url, {
    method: "POST",
    headers,
    body: http.Body.json({ ticket }),
  });
  const data = resp.data;
  if (data.retcode !== 0) return resp.data;
  if (data.data.status === "Created" || data.data.status === "Scanned") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return await getLoginStatus(ticket);
  }
  if (data.data.status === "Confirmed") {
    const cookieList = resp.rawHeaders["set-cookie"].map((cookie) => cookie.split(";")[0]);
    const cookieRecord: Record<string, string> = {};
    cookieList.forEach((cookie) => {
      const [key, value] = cookie.split("=");
      cookieRecord[key] = value;
    });
    return cookieRecord;
  }
  return resp.data;
}
