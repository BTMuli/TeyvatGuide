/**
 * @file web/api/TGApi.ts
 * @description 应用用到的 API
 * @since Beta v0.5.3
 */

import { BBSUserInfoApi } from "./BBS.js";
import { ENKA_API } from "./ENKA.js";
import { PassportTokenApi, PassportCookieTokenApi, PassportVerifyApi } from "./Passport.js";
import {
  TakumiTokensApi,
  TakumiRecordCardApi,
  TakumiRecordCharactersApi,
  TakumiRecordDailyNotesApi,
  TakumiRecordIndexApi,
  TakumiRecordAbyssApi,
  TakumiSTokenBindingRolesApi,
  TakumiCookieBindingRolesApi,
  TakumiCalculateSyncAvatarListApi,
  TakumiCalculateSyncAvatarDetailApi,
  TakumiRecordCharacterListApi,
  TakumiRecordCharacterDetailApi,
} from "./Takumi.js";

// 应用 API
const TGApi = {
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
      getAvatarList: TakumiRecordCharacterListApi, // 获取角色列表
      getAvatarDetail: TakumiRecordCharacterDetailApi, // 获取角色详情
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
    getDailyNotes: TakumiRecordDailyNotesApi, // 获取实时便笺
    getAbyss: TakumiRecordAbyssApi, // 获取深境螺旋信息
  },
};

export default TGApi;
