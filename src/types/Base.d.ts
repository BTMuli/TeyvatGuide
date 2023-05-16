/**
 * @file core types TGBase.d.ts
 * @description 类型定义，用于定义一些基础类型
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

declare namespace BTMuli.Genshin {
  export namespace Base {
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

    /**
     * @description 定义基础返回数据
     * @since Alpha v0.1.2
     * @interface Response
     * @property {number} retcode 状态码
     * @property {string} message 状态信息
     * @property {any} data 数据
     * @returns {Response}
     */
    export interface Response {
      retcode: number
      message: string
      data: any
    }
  }
}
