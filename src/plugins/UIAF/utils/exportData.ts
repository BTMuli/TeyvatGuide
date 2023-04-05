/**
 * @file plugins UIAF utils exportData.ts
 * @description UIAF export data utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type UiafHeader } from "../interface/UIAF";
import { app } from "@tauri-apps/api";

/**
 * @description 获取 UIAF 头部信息
 * @since Alpha v0.1.2
 * @returns {Promise<UiafHeader>}
 */
export async function getUiafInfo (): Promise<UiafHeader> {
  return {
    export_app: "Tauri.Genshin",
    export_timestamp: Math.floor(Date.now() / 1000),
    export_app_version: await app.getVersion(),
    uiaf_version: "v1.1",
  };
}
