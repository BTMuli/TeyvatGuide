/**
 * @file plugins UIAF index.ts
 * @description UIAF plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { checkUIAFData, readUIAFData, mergeUIAFData } from "./utils/importData";
import { getAchievements } from "./utils/exportData";

const UIAF_Oper = {
	importOper: {
		checkUIAFData,
		readUIAFData,
		mergeUIAFData,
	},
	exportOper: {
		getAchievements,
	},
};

export default UIAF_Oper;
