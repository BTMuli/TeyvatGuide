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

/**
 * @description Mys obc 返回数据
 * @since Alpha v0.1.1
 * @interface MysObcResponse
 * @extends MysResponse
 * @property {MysObc[]} data.list obc 列表
 * @return {MysObcResponse}
 */
export interface MysObcResponse extends MysResponse {
	data: {
		list: MysObc[];
	};
}

/**
 * @description Mys obc 层级结构
 * @since Alpha v0.1.1
 * @interface MysObc
 * @property {number} id ID
 * @property {string} name 名称
 * @property {number} parent_id 父ID
 * @property {number} depth 深度
 * @property {string} ch_ext 结构化扩展信息
 * @property {any[]} children 子节点
 * @property {unknown[]} list 列表
 * @return {MysObc}
 */
export interface MysObc {
	id: number;
	name: string;
	parent_id: number;
	depth: number;
	ch_ext: string;
	children: MysObc[];
	list: unknown[];
}
