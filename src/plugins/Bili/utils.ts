/**
 * Bili 插件工具函数
 * @since Beta v0.10.0
 */
import TGHttps from "@utils/TGHttps.js";
import md5 from "js-md5";
import TGLogger from "@utils/TGLogger.js";

export const BILI_HEADER: Readonly<Record<string, string>> = {
  cookie: "",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
  origin: "https://www.bilibili.com",
};

/**
 * Bili 插件导航请求
 * @since Beta v0.10.0
 * @returns Bili 插件导航请求返回
 */
async function getNavResp(): Promise<TGApp.Plugins.Bili.Nav.Resp> {
  const url = "https://api.bilibili.com/x/web-interface/nav";
  const resp = await TGHttps.get<TGApp.Plugins.Bili.Nav.Resp>(url, {
    method: "GET",
    headers: BILI_HEADER,
  });
  return resp.data;
}

/**
 * 获取 key 值
 * @since Beta v0.4.0
 * @param key - key 名称
 * @returns key 值
 */
function getKeyVal(key: string): string {
  return key.split("/").pop()?.split(".")[0] ?? "";
}

/**
 * 获取 mixin_key
 * @since Beta v0.10.0
 * @returns mixin_key
 */
async function getMixinKey(): Promise<string> {
  let navResp: TGApp.Plugins.Bili.Nav.Resp;
  try {
    navResp = await getNavResp();
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[Bili][GetMixinKey] Nav 请求异常：${errMsg}`);
    return "";
  }
  if (!navResp) return "";
  if (navResp.code !== 0) {
    await TGLogger.Warn(`[Bili][GetMixinKey] Nav 返回异常: ${navResp.code}-${navResp.message}`);
    return "";
  }
  const key1 = getKeyVal(navResp.data.wbi_img.img_url);
  const key2 = getKeyVal(navResp.data.wbi_img.sub_url);
  const key = key1 + key2;
  const MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29,
    28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25,
    54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
  ];
  const res = [];
  for (const i of MIXIN_KEY_ENC_TAB) res.push(key[i]);
  return res.join("").slice(0, 32);
}

/**
 * 获取 wrid
 * @since Beta v0.4.1
 * @param params - 请求参数
 * @returns wrid
 */
export async function getWrid(
  params: Record<string, string | number | boolean>,
): Promise<TGApp.Plugins.Bili.Base.WridArrRes> {
  const mixin_key = await getMixinKey();
  if (mixin_key === "") return ["", ""];
  const wts = Math.floor(Date.now() / 1000);
  const obj: Record<string, string | number> = { ...params, wts };
  const keys = Object.keys(obj).sort();
  let md5Str = "";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) md5Str += `${key}=${obj[key]}`;
    else md5Str += `${key}=${obj[key]}&`;
  }
  const wrid = md5.md5(`${md5Str}${mixin_key}`);
  return [wts.toString(), wrid];
}
