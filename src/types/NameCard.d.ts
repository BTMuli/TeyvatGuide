/**
 * @file core types TGNameCard.d.ts
 * @description 本应用的名片类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

declare namespace BTMuli.Genshin {
  /**
   * @description 本应用的名片类型
   * @since Alpha v0.1.2
   * @interface NameCard
   * @property {string} name - 名片名称，同时也是文件名
   * @property {string} description - 名片描述
   * @property {string} icon - 名片图标路径
   * @property {string} bg - 名片背景图路径
   * @property {string} profile - 名片 Profile 图路径
   * @property {number} type - 名片类型 (0: 其他，1: 成就，2：角色，3：纪行，4：活动)
   * @property {string} source - 名片来源
   * @returns {NameCard}
   */
  export interface NameCard {
    name: string
    description: string
    icon: string
    bg: string
    profile: string
    type: number
    source: string
  }
}

declare namespace BTMuli.SQLite {
  /**
   * @description 数据库内的名片类型
   * @since Alpha v0.1.4
   * @interface NameCard
   * @property {number} id - 名片 ID
   * @property {string} name - 名片名称
   * @property {string} description - 名片描述
   * @property {string} icon - 名片图标路径
   * @property {string} bg - 名片背景图路径
   * @property {string} profile - 名片 Profile 图路径
   * @property {number} type - 名片类型 (0: 其他，1: 成就，2：角色，3：纪行，4：活动)
   * @property {string} source - 名片来源
   * @property {string} updated - 名片更新时间
   * @returns {NameCard}
   */
  export interface NameCard {
    id: number
    name: string
    description: string
    icon: string
    bg: string
    profile: string
    type: number
    source: string
    updated: string
  }
}
