/**
 * @file core types TGBase.d.ts
 * @description 类型定义，用于定义一些基础类型
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

namespace TGBase {
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
}

export default TGBase;
