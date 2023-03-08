/**
 * @file plugins UIAF interface UIAF.ts
 * @description UIAF interface
 * @author BTMuli<bt-muli@outlook.com>
 * @see https://github.com/DGP-Studio/Snap.Genshin.Docs/blob/main/docs/development/UIAF.md
 * @version v1.1
 * @since Alpha
 */

/**
 * @interface Achievements
 * @description Achievements interface
 * @property {UIAF_Info} info - UIAF info
 * @property {UIAF_Achievement[]} list - Achievements data
 * @return Achievements
 */
export interface Achievements {
	info: UIAF_Info;
	list: UIAF_Achievement[];
}

/**
 * @interface UIAF_Info
 * @description UIAF info interface
 * @property {string} export_app - Export app name
 * @property {number} export_timestamp - Export timestamp
 * @property {string} export_app_version - Export app version
 * @property {string} uiaf_version - UIAF version
 * @return UIAF_Info
 */
export interface UIAF_Info {
	export_app: string;
	export_timestamp: number;
	export_app_version: string;
	uiaf_version: string;
}

/**
 * @interface UIAF_Achievement
 * @description Achievements data interface
 * @property {number} id - Achievement ID
 * @property {number} timestamp - Achievement timestamp
 * @property {number} current - Current progress
 * @property {number} status - Achievement status
 * @return UIAF_Achievement
 */
export interface UIAF_Achievement {
	id: number;
	timestamp: number;
	current: number;
	status: number;
}
