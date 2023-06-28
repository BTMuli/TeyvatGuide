/**
 * @file web api TGApi.ts
 * @description 应用用到的 API
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

import { BBSUserInfoApi } from "./BBS";
import { ENKA_API } from "./ENKA";
import { Hk4eAnnoListApi, Hk4eAnnoContentApi, Hk4eAnnoQuery } from "./Hk4e";
import { PassportTokenApi, PassportCookieTokenApi, PassportVerifyApi } from "./Passport";
import {
  TakumiTokensApi,
  TakumiRecordCardApi,
  TakumiRecordCharactersApi,
  TakumiRecordIndexApi,
  TakumiRecordAbyssApi,
  TakumiSTokenBindingRolesApi,
  TakumiCookieBindingRolesApi,
  TakumiCalculateSyncAvatarListApi,
  TakumiCalculateSyncAvatarDetailApi,
} from "./Takumi";

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
    verifyLToken: PassportVerifyApi, // 验证 ltoken 有效性
  },
  GameData: {
    byCookie: {
      getUserInfo: BBSUserInfoApi, // 获取用户信息
      getAccounts: TakumiCookieBindingRolesApi, // 获取绑定角色
      getCharacter: TakumiRecordCharactersApi, // 获取角色信息
    },
    bySToken: {
      getAccounts: TakumiSTokenBindingRolesApi, // 获取绑定角色
    },
    calculate: {
      getSyncAvatarList: TakumiCalculateSyncAvatarListApi, // 同步角色列表
      getSyncAvatarDetail: TakumiCalculateSyncAvatarDetailApi, // 同步角色详情
    },
    getUserCard: TakumiRecordCardApi, // 获取用户卡片
    getUserBase: TakumiRecordIndexApi, // 获取用户基本信息
    getAbyss: TakumiRecordAbyssApi, // 获取深境螺旋信息
  },
};

export default TGApi;
