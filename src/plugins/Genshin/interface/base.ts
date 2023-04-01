/**
 * @file plugins Genshin interface base.ts
 * @description 原神插件基础接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

/**
 * @description Mys Response 统一接口，负责游戏内数据获取
 * @since Alpha v0.1.1
 * @interface Hk4eResponse
 * @property {number} retcode 状态码
 * @property {string} message 状态信息
 * @property {any} data 数据
 * @return {Hk4eResponse}
 */
export interface Hk4eResponse {
	retcode: number;
	message: string;
	data: any;
}
