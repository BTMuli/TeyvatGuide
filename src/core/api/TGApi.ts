/**
 * @file core api TGApi.ts
 * @description 应用用到的 API
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { Hk4eAnnoListApi, Hk4eAnnoContentApi, Hk4eAnnoQuery } from "./Hk4e";

// 应用 API
const TGApi = {
  GameAnnoList: Hk4eAnnoListApi, // 游戏公告 API
  GameAnnoContent: Hk4eAnnoContentApi, // 游戏公告内容 API
  GameAnnoQuery: Hk4eAnnoQuery, // 游戏公告 Query
};

export default TGApi;