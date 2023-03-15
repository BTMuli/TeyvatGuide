/**
 * @file plugins UIAF utils importData.ts
 * @description UIAF import data utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { UIAF_Info } from "../interface/UIAF";
import { fs } from "@tauri-apps/api";

/**
 * @description 检测是否存在 UIAF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha
 * @param {string} path - UIAF 数据路径
 * @return {Promise<boolean>} 是否存在 UIAF 数据
 */
export async function checkUIAFData(path: string): Promise<boolean> {
	const fileData: string = await fs.readTextFile(path);
	const UIAFData: UIAF_Info = JSON.parse(fileData)["info"];
	return UIAFData.uiaf_version !== undefined;
}

/**
 * @description 读取 UIAF 数据
 * @since Alpha
 * @param {string} userPath - UIAF 数据路径
 * @return {Promise<string|false>} UIAF 数据
 */
export async function readUIAFData(userPath: string): Promise<string | false> {
	if (await fs.exists(userPath)) {
		const fileData = await fs.readTextFile(userPath);
		if (fileData !== undefined && fileData !== null && fileData !== "" && fileData !== "{}") {
			return fileData;
		} else {
			return false;
		}
	} else {
		return false;
	}
}
