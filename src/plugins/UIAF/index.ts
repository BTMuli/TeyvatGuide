/**
 * @file plugins UIAF index.ts
 * @description UIAF plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { checkUIAFData, readUIAFData } from "./utils/importData";
import { getUIAFInfo } from "./utils/exportData";

const UIAF_Oper = {
	checkUIAFData,
	readUIAFData,
	getUIAFInfo,
};

export default UIAF_Oper;
