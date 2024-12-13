/**
 * @file web/utils/tools.ts
 * @description 应用用到的工具函数
 * @since Beta v0.6.3
 */

import TGConstant from "@/web/constant/TGConstant.js";

/**
 * @description 转义正则表达式
 * @since Beta v0.3.3
 * @param {string} data 内容
 * @returns {string} 转义后的内容
 */
export function decodeRegExp(data: string): string {
  let res = data;
  if (res.length === 0) return res;
  res = res.replace(/&lt;/g, "<");
  res = res.replace(/&gt;/g, ">");
  res = res.replace(/&nbsp;/g, " ");
  res = res.replace(/&#39;/g, "'");

  res = res.replace(/&quot;/g, `"`);
  res = res.replace(/&apos;/g, "'");
  res = res.replace(/&amp;/g, "&");
  return res;
}

/**
 * @description 根据 gid 获取游戏名称
 * @param {number} gid
 * @returns {string}
 */
export function getGameName(gid: number): string {
  const game = TGConstant.BBS.CHANNELS.find((item) => item.gid === gid.toString());
  return game ? game.title : "未知游戏";
}

/**
 * @description 获取游戏id
 * @param {string} mini
 * @returns {string}
 */
export function getGameId(mini: string): string {
  const game = TGConstant.BBS.CHANNELS.find((item) => item.mini === mini);
  return game ? game.gid : "0";
}
