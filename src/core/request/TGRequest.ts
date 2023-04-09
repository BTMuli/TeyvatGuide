/**
 * @file core request TGRequest.ts
 * @description 应用用到的请求函数
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { getAnnoList, getAnnoContent } from "./getAnno";

const TGRequest = {
  Anno: {
    getList: getAnnoList,
    getContent: getAnnoContent,
  },
};

export default TGRequest;
