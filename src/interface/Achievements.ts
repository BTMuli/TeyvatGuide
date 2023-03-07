/**
 * @file Achievements.ts
 * @description Achievements interface
 * @author BTMuli<bt-muli@outlook.com>
 */

/**
 * @interface AchievementsType
 * @description Achievements interface
 * @property {UIAF_InfoType} info - UIAF info
 * @property {UIAF_AchievementType[]} list - Achievements data
 * @return AchievementsType
 */
export interface AchievementsType {
	info: UIAF_InfoType;
	list: UIAF_AchievementType[];
}

/**
 * @interface UIAF_InfoType
 * @description UIAF info interface
 * @property {string} export_app - Export app name
 * @property {number} export_timestamp - Export timestamp
 * @property {string} export_app_version - Export app version
 * @property {string} uiaf_version - UIAF version
 */
export interface UIAF_InfoType {
	export_app: string;
	export_timestamp: number;
	export_app_version: string;
	uiaf_version: string;
}

/**
 * @interface UIAF_AchievementType
 * @description Achievements data interface
 * @property {number} id - Achievement ID
 * @property {number} timestamp - Achievement timestamp
 * @property {number} current - Current progress
 * @property {number} status - Achievement status
 * @return UIAF_AchievementType
 */
export interface UIAF_AchievementType {
	id: number;
	timestamp: number;
	current: number;
	status: number;
}
