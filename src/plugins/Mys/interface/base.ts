/**
 * @file plugins Mys interface base.ts
 * @description Mys 插件基础接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

/**
 * @description Mys Response 统一接口
 * @since Alpha
 * @interface MysResponse
 * @property {number} retcode 状态码
 * @property {string} message 状态信息
 * @property {any} data 数据
 * @returns {MysResponse}
 */
export interface MysResponse {
  retcode: number
  message: string
  data: any
}

/**
 * @description Mys obc 返回数据
 * @since Alpha v0.1.1
 * @interface MysObcResponse
 * @extends MysResponse
 * @property {MysObc[]} data.list obc 列表
 * @returns {MysObcResponse}
 */
export interface MysObcResponse extends MysResponse {
  data: {
    list: MysObc[]
  }
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
 * @returns {MysObc}
 */
export interface MysObc {
  id: number
  name: string
  parent_id: number
  depth: number
  ch_ext: string
  children: MysObc[]
  list: unknown[]
}

/**
 * @description Mys GID 对应的数据
 * @since Alpha v0.1.2
 * @interface MysGid
 * @enum {number}
 * @property {number} 1 崩坏3
 * @property {number} 2 原神
 * @property {number} 3 崩坏2
 * @property {number} 4 未定事件簿
 * @property {number} 5 大别野
 * @property {number} 6 崩坏：星穹铁道
 * @property {number} 8 绝区零
 * @returns {MysGid}
 */
export enum MysGid {
  BH3 = 1,
  YS = 2,
  BH2 = 3,
  WD = 4,
  DBY = 5,
  SR = 6,
  ZZZ = 8,
}
