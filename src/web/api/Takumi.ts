/**
 * @file web/api/Takumi.ts
 * @description 定义 Takumi API
 * @since Beta v0.5.3
 */

const TakumiApi = "https://api-takumi.mihoyo.com/"; // 基础 API
const TakumiAuthApi = `${TakumiApi}auth/api/`; // 认证 API
const TakumiBindingApi = `${TakumiApi}binding/api/`; // 绑定 API
const TakumiCalculateApi = `${TakumiApi}event/e20200928calculate/`; // 计算 API
const TakumiRecordApi = "https://api-takumi-record.mihoyo.com/"; // 游戏记录 API
const TakumiRecordGenshinApi = `${TakumiRecordApi}game_record/app/genshin/api/`; // 原神游戏记录 API

export const TakumiTokensApi = `${TakumiAuthApi}getMultiTokenByLoginTicket`; // 登录票据 API
export const TakumiRecordDailyNotesApi = `${TakumiRecordApi}game_record/app/genshin/api/dailyNote`; // 游戏记录便笺 API
export const TakumiRecordCardApi = `${TakumiRecordApi}game_record/app/card/wapi/getGameRecordCard`; // 游戏记录卡片 API
export const TakumiRecordIndexApi = `${TakumiRecordGenshinApi}index`; // 原神游戏记录索引 API
export const TakumiRecordCharactersApi = `${TakumiRecordGenshinApi}character`; // 原神游戏记录角色 API
export const TakumiRecordCharacterListApi = `${TakumiRecordCharactersApi}/list`; // 原神游戏记录角色列表 API
export const TakumiRecordCharacterDetailApi = `${TakumiRecordCharactersApi}/detail`; // 原神游戏记录角色详情 API
export const TakumiRecordAbyssApi = `${TakumiRecordGenshinApi}spiralAbyss`; // 原神游戏记录深境螺旋 API
export const TakumiSTokenBindingRolesApi = `${TakumiBindingApi}getUserGameRolesBySToken`; // 获取绑定角色 API-根据 stoken
export const TakumiCookieBindingRolesApi = `${TakumiBindingApi}getUserGameRolesByCookie`; // 获取绑定角色 API-根据 Cookie

// 养成计算器 API
export const TakumiCalculateSyncAvatarListApi = `${TakumiCalculateApi}v1/sync/avatar/list`;
export const TakumiCalculateSyncAvatarDetailApi = `${TakumiCalculateApi}v1/sync/avatar/detail`;
