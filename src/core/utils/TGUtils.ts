/**
 * @file core utils TGUtils.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { parseAnnoContent } from "./parseAnno";
import { getAnnoCard } from "./getAnnoCard";

const TGUtils = {
  Anno: {
    getCard: getAnnoCard,
    parseContent: parseAnnoContent,
  },
};

export default TGUtils;
