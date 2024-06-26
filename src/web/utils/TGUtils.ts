/**
 * @file web utils TGUtils.ts
 * @description 应用用到的工具函数
 * @since Beta v0.3.4
 */

import { getAnnoCard } from "./getAnnoCard.js";
import { getRequestHeader } from "./getRequestHeader.js";
import { parseAnnoContent } from "./parseAnno.js";
import { getServerByUid, transCookie } from "./tools.js";

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
