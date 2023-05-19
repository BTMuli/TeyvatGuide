/**
 * @file web utils TGUtils.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { parseAnnoContent } from "./parseAnno";
import { getAnnoCard } from "./getAnnoCard";
import { getRequestHeader } from "./getRequestHeader";
import { cookieToString, getServerByUid } from "./tools";

const TGUtils = {
  Anno: {
    getCard: getAnnoCard,
    parseContent: parseAnnoContent,
  },
  User: {
    getHeader: getRequestHeader,
  },
  Tools: {
    cookieToString,
    getServerByUid,
  },
};

export default TGUtils;
