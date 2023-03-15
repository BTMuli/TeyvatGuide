/**
 * @file plugins UIAF utils exportData.ts
 * @description UIAF export data utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { UIAF_Info } from "../interface/UIAF";
import { app } from "@tauri-apps/api";

/**
 * @description 获取 UIAF_Info
 * @return Promise<UIAF_Info>
 */
export async function getUIAFInfo(): Promise<UIAF_Info> {
	return {
		export_app: "Tauri.Genshin",
		export_timestamp: Math.floor(Date.now() / 1000),
		export_app_version: await app.getVersion(),
		uiaf_version: "v1.1",
	};
}
