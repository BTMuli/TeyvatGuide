/**
 * @file core api Takumi.ts
 * @description 定义 Takumi API
 * @see https://gitee.com/ultradream/Genshin-Tools
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

const TakumiApi = "https://api-takumi.mihoyo.com/"; // 基础 API
const TaukumiAuthApi = `${TakumiApi}auth/api/`; // 认证 API
export const TakumiTokensApi = `${TaukumiAuthApi}getMultiTokenByLoginTicket`; // 登录票据 API
