/**
 * @file plugins UIAF utils exportData.ts
 * @description UIAF export data utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { Achievements, UIAF_Info, UIAF_Achievement } from "../interface/UIAF";
import { app, fs } from "@tauri-apps/api";

/**
 * @description 获取 UIAF_Info
 * @return Promise<UIAF_Info>
 */
async function getUIAFInfo(): Promise<UIAF_Info> {
	return {
		export_app: "Tauri.Genshin",
		export_timestamp: Math.floor(Date.now() / 1000),
		export_app_version: await app.getVersion(),
		uiaf_version: "v1.1",
	};
}

/**
 * @description 获取 Achievements
 * @param {string} userPath - 本地文件路径
 * @return Promise<Achievements>
 */
export async function getAchievements(userPath: string): Promise<Achievements> {
	// 读取本地文件
	const achievementsRaw = await fs.readTextFile(userPath);
	// 解析 JSON
	const achievements: UIAF_Achievement[] = JSON.parse(achievementsRaw);
	// 返回
	return {
		info: await getUIAFInfo(),
		list: achievements,
	};
}
