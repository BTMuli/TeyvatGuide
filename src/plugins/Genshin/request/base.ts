/**
 * @file plugins Genshin request base.ts
 * @description 游戏内数据请求的基础类
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

// Hk4e API，目前先用这几个，后续有需要再加
const Hk4eApi = "https://hk4e-api.mihoyo.com"; // 基础 API
export const Hk4eAnnoApi = `${Hk4eApi}/common/hk4e_cn/announcement/api`; // 公告 API
export const Hk4eGachaApi = `${Hk4eApi}/event/gacha_info/api;`; // 卡池 API
