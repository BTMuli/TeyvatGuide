/**
 * @file plugins UIAF utils importData.ts
 * @description UIAF import data utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { Achievements, UIAF_Achievement, UIAF_Info } from "../interface/UIAF";
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

/**
 * @description 数据合并
 * @since Alpha
 * @param {UIAF_Achievement[]} localData - 本地数据
 * @param {Achievements} remoteData - 远程数据
 * @return {Promise<UIAF_Achievement[]>} 合并后的数据
 */
export async function mergeUIAFData(
	localData: UIAF_Achievement[],
	remoteData: Achievements
): Promise<UIAF_Achievement[]> {
	// 遍历 remoteData.list
	remoteData.list.map((remoteAchievement: UIAF_Achievement) => {
		// 查找 id 相同的 localAchievement
		const localAchievement = localData.find(
			achievement => achievement.id === remoteAchievement.id
		);
		// 如果没找到，就直接添加
		if (localAchievement === undefined) {
			localData.push(remoteAchievement);
		} else {
			// 检测数据是否需要更新
			if (localAchievement.timestamp < remoteAchievement.timestamp) {
				// 更新数据
				localAchievement.timestamp = remoteAchievement.timestamp;
				localAchievement.current = remoteAchievement.current;
				localAchievement.status = remoteAchievement.status;
			}
		}
	});
	// 按照 id 排序
	localData.sort((a, b) => a.id - b.id);
	// 返回合并后的数据
	return localData;
}
