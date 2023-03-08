import { checkUIAFData, readUIAFData, importUIAFData } from "./utils/importData";
import { getAchievements } from "./utils/exportData";

const UIAF_Oper = {
	importOper: {
		checkUIAFData,
		readUIAFData,
		importUIAFData,
	},
	exportOper: {
		getAchievements,
	},
};

export default UIAF_Oper;
