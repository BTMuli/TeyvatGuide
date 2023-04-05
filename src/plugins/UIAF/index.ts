/**
 * @file plugins UIAF index.ts
 * @description UIAF plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { checkUiafData, readUiafData } from "./utils/importData";
import { getUiafInfo } from "./utils/exportData";

const UiafOper = {
  checkUiafData,
  readUiafData,
  getUiafInfo,
};

export default UiafOper;
