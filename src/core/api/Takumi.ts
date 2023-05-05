/**
 * @file core api Takumi.ts
 * @description 定义 Takumi API
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

const TakumiApi = "https://api-takumi.mihoyo.com/"; // 基础 API
const TakumiRecordApi = "https://api-takumi-record.mihoyo.com/"; // 游戏记录 API
const TakumiBindingApi = `${TakumiApi}binding/api/`; // 绑定 API
const TakumiRecordGenshinApi = `${TakumiRecordApi}game_record/app/genshin/api/`; // 原神游戏记录 API
const TaukumiAuthApi = `${TakumiApi}auth/api/`; // 认证 API

export const TakumiTokensApi = `${TaukumiAuthApi}getMultiTokenByLoginTicket`; // 登录票据 API
export const TakumiActionTicketsApi = `${TaukumiAuthApi}getActionTicketByStoken`; // 行为票据 API
export const TakumiRecordCardApi = `${TakumiRecordApi}game_record/app/card/wapi/getGameRecordCard`; // 游戏记录卡片 API
export const TakumiRecordGenshinIndexApi = `${TakumiRecordGenshinApi}index`; // 原神游戏记录索引 API
export const TakumiRecordGenshinCharacterApi = `${TakumiRecordGenshinApi}character`; // 原神游戏记录角色 API
export const TakumiRecordGenshinSpiralAbyssApi = `${TakumiRecordGenshinApi}spiralAbyss`; // 原神游戏记录深境螺旋 API
export const TakumiBingdingRolesApi = `${TakumiBindingApi}getUserGameRolesByStoken`; // 获取绑定角色 API
