/**
 * @file plugins UIAF interface UIAF.ts
 * @description UIAF interface
 * @author BTMuli<bt-muli@outlook.com>
 * @see https://github.com/DGP-Studio/Snap.Genshin.Docs/blob/main/docs/development/UIAF.md
 * @version v1.1
 * @since Alpha v0.1.2
 */

/**
 * @interface Achievements
 * @description UIAF 成就数据
 * @property {UIAF_Info} info UIAF 头部信息
 * @property {UIAF_Achievement[]} list UIAF 成就列表
 * @returns {Achievements}
 */
export interface Achievements {
  info: UiafHeader
  list: UiafAchievement[]
}

/**
 * @interface UiafHeader
 * @description UIAF 头部信息
 * @property {string} export_app 导出的应用名称
 * @property {number} export_timestamp 导出时间戳，正确时间戳得乘以 1000
 * @property {string} export_app_version 导出的应用版本
 * @property {string} uiaf_version UIAF 版本
 * @returns {UiafHeader}
 */
export interface UiafHeader {
  export_app: string
  export_timestamp: number
  export_app_version: string
  uiaf_version: string
}

/**
 * @interface UiafAchievement
 * @since Alpha v0.1.2
 * @description UIAF 单个成就数据
 * @property {number} id 成就 ID
 * @property {number} timestamp 成就记录时间戳，正确时间戳得乘以 1000
 * @property {number} current 成就进度
 * @property {number} status 成就状态，0 为未完成，1 为已完成
 * @returns {UiafAchievement}
 */
export interface UiafAchievement {
  id: number
  timestamp: number
  current: number
  status: number
}
