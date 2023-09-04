/**
 * @file web utils TGUtils.ts
 * @description 应用用到的工具函数
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

import { getAnnoCard } from "./getAnnoCard";
import { getRequestHeader } from "./getRequestHeader";
import { parseAnnoContent } from "./parseAnno";
import { getServerByUid, transCookie } from "./tools";

const TGUtils = {
  Anno: {
    getCard: getAnnoCard,
    parseContent: parseAnnoContent,
  },
  User: {
    getHeader: getRequestHeader,
  },
  Tools: {
    getServerByUid,
    transCookie,
  },
};

export default TGUtils;
