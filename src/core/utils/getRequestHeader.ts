/**
 * @file core utils getRequestHeader.ts
 * @description 获取请求头
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

export function getRequestHeader (cookie: BTMuli.User.Base.Cookie): Record<string, string> {
  const header = {
    "User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Edg/112.0.1722.34 Tauri.Genshin/0.1.2",
    "x-rpc-app_version": "2.0.0",
    "x-rpc-client_type": "5",
    "x-rpc-device_id": cookie.DEVICEFP,
    Origin: "https://www.miyoushe.com",
    Referer: "https://www.miyoushe.com",
  };
  return header;
}
