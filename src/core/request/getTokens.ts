/**
 * @file core request getTokens.ts
 * @description 获取游戏 Token
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

import { http } from "@tauri-apps/api";
import TGApi from "../api/TGApi";
import { getRequestHeader } from "../utils/getRequestHeader";

export async function getTokens (cookie: Record<string, string>): Promise<unknown> {
  const url = `${TGApi.GameTokens}?login_ticket=${cookie.login_ticket}&token_types=3&uid=${cookie.login_uid}`;
  const header = getRequestHeader(cookie);
  return await http.fetch(url, {
    method: "GET",
    headers: header,
  }).then((res) => {
    console.log(res.data);
    return res.data;
  });
}
