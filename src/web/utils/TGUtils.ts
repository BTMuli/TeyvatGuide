/**
 * @file web utils TGUtils.ts
 * @description 应用用到的工具函数
 * @since Beta v0.3.4
 */

import { getAnnoCard } from "./getAnnoCard";
import { getRequestHeader, getRandomString, getRandomNumber } from "./getRequestHeader";
import { parseAnnoContent } from "./parseAnno";
import { getServerByUid, transCookie, transParams } from "./tools";

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
    getRandomString,
    getRandomNumber,
    transParams,
  },
};

export default TGUtils;
