/**
 * @file types Sqlite AppData.d.ts
 * @description Sqlite AppData 类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.Sqlite.AppData {
  /**
   * @description AppData 数据
   * @since Alpha v0.1.5
   * @interface Item
   * @property {string} key - 键
   * @property {string} value - 值
   * @property {string} updated - 数据库更新时间
   * @return Item
   */
  export interface Item {
    key: string
    value: string
    updated: string
  }
}
