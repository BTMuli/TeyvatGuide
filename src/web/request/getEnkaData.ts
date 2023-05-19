/**
 * @file web request getEnkaData.ts
 * @description 获取 ENKA 数据
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

// Tauri
import { http } from "@tauri-apps/api";
// Tauri.Genshin
import TGApi from "../api/TGApi";

/**
 * @description 获取 ENKA 数据
 * @since Alpha v0.1.3
 * @param {number} uid 用户 UID
 * @returns {Promise<BTMuli.Genshin.Enka.Data>}
 */
export async function getEnkaData (uid: number): Promise<BTMuli.Genshin.Enka.Data> {
  return await http.fetch<BTMuli.Genshin.Enka.Data>(`${TGApi.GameEnka}${uid}`).then((res) => res.data);
}
