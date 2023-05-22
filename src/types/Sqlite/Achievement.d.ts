/**
 * @file types Sqlite Achievement.d.ts
 * @description 数据库成就相关类型定义文件
 * @todo https://github.com/BTMuli/Tauri.Genshin/issues/19
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace BTMuli.Sqlite.Achievement {
  /**
   * @description 数据库-成就表
   * @since Alpha v0.1.5
   * @interface SingleTable
   * @property {number} id - 成就 ID
   * @property {number} series - 成就系列 ID
   * @property {number} order - 成就排列顺序，用于展示全部成就
   * @property {string} name - 成就名称
   * @property {string} description - 成就描述
   * @property {number} reward - 成就奖励
   * @property {number} isCompleted - 成就是否完成
   * @property {string} completedTime - 成就完成时间
   * @property {number} progress - 成就进度
   * @property {string} version - 成就版本
   * @property {string} updated - 数据库更新时间
   * @return SingleTable
   */
  export interface SingleTable {
    id: number
    series: number
    order: number
    name: string
    description: string
    reward: number
    isCompleted: 0 | 1
    completedTime: string
    progress: number
    version: string
    updated: string
  }

  /**
   * @description 数据库-成就系列表
   * @since Alpha v0.1.5
   * @interface SeriesTable
   * @property {number} id - 成就系列 ID
   * @property {number} order - 成就系列排列顺序，用于展示全部成就系列
   * @property {string} name - 成就系列名称
   * @property {string} version - 成就系列版本
   * @property {number} totalCount - 成就系列包含的成就数
   * @property {number} finCount - 成就系列已完成的成就数
   * @property {string} icon - 成就系列图标
   * @property {string} nameCard - 成就系列对应名片
   * @property {string} updated - 数据库更新时间
   * @returns SeriesTable
   */
  export interface SeriesTable {
    id: number
    order: number
    name: string
    version: string
    totalCount: number
    finCount: number
    icon: string
    nameCard: string
    updated: string
  }
}
