/**
 * @file web utils TGUtils.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { getAnnoCard } from "./getAnnoCard";
import { getRequestHeader, getRequestSignHeader } from "./getRequestHeader";
import { parseAnnoContent } from "./parseAnno";
import { getServerByUid } from "./tools";

const TGUtils = {
  Anno: {
    getCard: getAnnoCard,
    parseContent: parseAnnoContent,
  },
  User: {
    getHeader: getRequestHeader,
    getSignHeader: getRequestSignHeader,
  },
  Tools: {
    getServerByUid,
  },
};

export default TGUtils;
