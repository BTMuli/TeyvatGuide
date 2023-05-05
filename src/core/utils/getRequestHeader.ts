/**
 * @file core utils getRequestHeader.ts
 * @description 获取请求头
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import TGConstant from "../constant/TGConstant";

export function getRequestHeader (cookie: BTMuli.User.Base.Cookie): Record<string, string> {
  const header = {
    "User-Agent": TGConstant.BBS.USER_AGENT,
    "content-type": "application/json;charset=UTF-8",
    "x-requested-with": "com.mihoyo.hyperion",
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    "x-rpc-device_id": cookie.DEVICEFP,
    Origin: "https://www.miyoushe.com",
    Referer: "https://www.miyoushe.com",
  };
  return header;
}
