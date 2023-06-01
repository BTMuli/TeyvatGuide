/**
 * @file types Sqlite Character.d.ts
 * @description 角色相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Sqlite.Character {
  /**
   * @description 应用数据库中的角色类型
   * @since Alpha v0.2.0
   * @interface AppData
   * @property {number} id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} title - 角色称号
   * @property {string} birthday - 角色生日
   * @property {number} star - 角色星级
   * @property {string} element - 角色元素类型
   * @property {string} weapon - 角色武器类型
   * @property {string} nameCard - 角色名片
   * @property {string} updated - 数据更新时间
   * @return AppData
   */
  export interface AppData {
    id: number
    name: string
    title: string
    birthday: string
    star: number
    element: string
    weapon: string
    nameCard: string
    updated: string
  }
}
