/**
 * @file core utils TGUtils.ts
 * @description 应用用到的工具函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { parseAnnoContent } from "./parseAnno";
import { getAnnoCard } from "./getAnnoCard";
import { getDS } from "./getDS";
import { getRequestHeader } from "./getRequestHeader";

const TGUtils = {
  Anno: {
    getCard: getAnnoCard,
    parseContent: parseAnnoContent,
  },
  User: {
    getDS,
    getHeader: getRequestHeader,
  },
};

export default TGUtils;
