/**
 * @file interface Base
 * @description interface Base
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

/**
 * @description 定义一个 Map<T> 接口
 * @since Alpha v0.1.2
 * @interface Map
 * @template T
 * @returns {Map<T>}
 */
export type Map<T> = Record<number, T>;

/**
 * @description 定义 IndexedDB 数据库配置
 * @since Alpha v0.1.2
 * @interface DBConfig
 * @property {string} storeName 数据库名称
 * @property {string} keyPath 数据库主键
 * @property {string[]} indexes 数据库索引
 * @returns {DBConfig}
 */
export interface DBConfig {
  storeName: string
  keyPath: string
  indexes: string[]
}
