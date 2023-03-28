/**
 * @file plugins Mys interface base.ts
 * @description Mys 插件基础接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

/**
 * @description Mys Response 统一接口
 * @since Alpha
 * @interface MysResponse
 * @property {number} retcode 状态码
 * @property {string} message 状态信息
 * @property {any} data 数据
 * @return {MysResponse}
 */
export interface MysResponse {
	retcode: number;
	message: string;
	data: any;
}
