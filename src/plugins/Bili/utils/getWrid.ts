/**
 * @file plugins/Bili/utils/getWrid.ts
 * @description Bili 插件获取 wrid 工具函数
 * @since Beta v0.4.1
 */

import getNav from "@Bili/request/getNav.js";
import md5 from "js-md5";

/**
 * @description 获取 key 值
 * @since Beta v0.4.0
 * @param {string} key key 名称
 * @return {string} key 值
 */
function getKeyVal(key: string): string {
  return key.split("/").pop()?.split(".")[0] ?? "";
}

/**
 * @description 获取 mixin_key
 * @since Beta v0.4.1
 * @return {Promise<string>} mixin_key
 */
async function getMixinKey(): Promise<string> {
  const nav = await getNav();
  const key1 = getKeyVal(nav.wbi_img.img_url);
  const key2 = getKeyVal(nav.wbi_img.sub_url);
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
 * @description 获取 wrid
 * @since Beta v0.4.1
 * @param {Record<string,string|number>} params 请求参数
 * @returns {Promise<[string|string]>} wrid
 */
async function getWrid(
  params: Record<string, string | number | boolean>,
): Promise<[string, string]> {
  const mixin_key = await getMixinKey();
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

export default getWrid;
