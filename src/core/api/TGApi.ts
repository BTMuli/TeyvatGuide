/**
 * @file core api TGApi.ts
 * @description 应用用到的 API
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { ENKA_API } from "./ENKA";
import { Hk4eAnnoListApi, Hk4eAnnoContentApi, Hk4eAnnoQuery } from "./Hk4e";
import { PassportTokenApi, PassportCookieTokenApi, PassportVetifyApi } from "./Passport";
import { TakumiTokensApi } from "./Takumi";

// 应用 API
const TGApi = {
  GameAnnoList: Hk4eAnnoListApi, // 游戏公告 API
  GameAnnoContent: Hk4eAnnoContentApi, // 游戏公告内容 API
  GameAnnoQuery: Hk4eAnnoQuery, // 游戏公告 Query
  GameEnka: ENKA_API, // 游戏 ENKA API
  GameTokens: {
    getTokens: TakumiTokensApi, // 根据 login_ticket 获取游戏 Token
    getLToken: PassportTokenApi, // 根据 stoken 获取 ltoken
    getCookieToken: PassportCookieTokenApi, // 根据 Cookie 获取 Token
    vetifyStoken: PassportVetifyApi, // 验证 stoken 有效性
  },
};

export default TGApi;
