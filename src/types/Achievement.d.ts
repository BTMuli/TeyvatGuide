/**
 * @file types Achievement.d.ts
 * @author BTMuli<bt-muli@outlook.com>
 * @description 成就相关类型定义
 * @since Alpha v0.1.2
 */

declare namespace BTMuli.Genshin {
  /**
   * @description 本应用的成就类型
   * @since Alpha v0.1.2
   * @interface Achievement
   * @property {number} id - 成就 ID
   * @property {number} series - 成就系列 ID
   * @property {number} order - 成就排列顺序，用于展示全部成就
   * @property {string} name - 成就名称
   * @property {string} description - 成就描述
   * @property {number} reward - 成就奖励
   * @property {boolean} completed - 成就是否完成
   * @property {string} completed_time - 成就完成时间
   * @property {number} progress - 成就进度
   * @property {string} version - 成就版本
   * @return Achievement
   */
  export interface Achievement {
    id: number
    series: number
    order: number
    name: string
    description: string
    reward: number
    completed: boolean
    completed_time: string | null
    progress: number
    version: string
  }
  /**
     * @description 本应用的成就系列类型
     * @since Alpha v0.1.2
     * @interface AchievementSeries
     * @property {number} id - 成就系列 ID
     * @property {number} order - 成就系列排列顺序，用于展示全部成就系列
     * @property {string} name - 成就系列名称
     * @property {string} version - 成就系列版本
     * @property {number[]} achievements - 成就系列包含的成就
     * @property {number} total_count - 成就系列包含的成就数
     * @property {number} completed_count - 成就系列已完成的成就数
     * @property {string} card - 成就系列对应名片
     * @property {string} icon - 成就系列图标
     * @return AchievementSeries
     */
  export interface AchievementSeries {
    id: number
    order: number
    name: string
    version: string
    achievements: number[]
    total_count: number
    completed_count: number
    card?: string
    icon: string
  }
}

declare namespace TGPlugin.UIAF {
  /**
 * @interface BaseData
 * @since Alpha v0.1.2
 * @description UIAF 成就数据
 * @property {UIAF_Info} info UIAF 头部信息
 * @property {UIAF_Achievement[]} list UIAF 成就列表
 * @return BaseData
 */
  export interface BaseData {
    info: Header
    list: Achievement[]
  }

  /**
 * @interface Header
 * @description UIAF 头部信息
 * @property {string} export_app 导出的应用名称
 * @property {number} export_timestamp 导出时间戳，正确时间戳得乘以 1000
 * @property {string} export_app_version 导出的应用版本
 * @property {string} uiaf_version UIAF 版本
 * @return Header
 */
  export interface Header {
    export_app: string
    export_timestamp: number
    export_app_version: string
    uiaf_version: string
  }

  /**
 * @interface Achievement
 * @since Alpha v0.1.2
 * @description UIAF 单个成就数据
 * @property {number} id 成就 ID
 * @property {number} timestamp 成就记录时间戳，正确时间戳得乘以 1000
 * @property {number} current 成就进度
 * @property {number} status 成就状态，0 为未完成，1 为已完成
 * @return Achievement
 */
  export interface Achievement {
    id: number
    timestamp: number
    current: number
    status: number
  }
}

declare namespace BTMuli.SQLite {
  /**
   * @description 数据库-成就表
   * @since Alpha v0.1.4
   * @interface Achievements
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
   * @return Achievements
   */
  export interface Achievements {
    id: number
    series: number
    order: number
    name: string | null
    description: string | null
    reward: number
    isCompleted: 0 | 1
    completedTime: string | null
    progress: number
    version: string | null
    updated: string | null
  }

  /**
   * @description 数据库-成就系列表
   * @since Alpha v0.1.4
   * @interface AchievementSeries
   * @property {number} id - 成就系列 ID
   * @property {number} order - 成就系列排列顺序，用于展示全部成就系列
   * @property {string} name - 成就系列名称
   * @property {string} version - 成就系列版本
   * @property {number} totalConut - 成就系列包含的成就数
   * @property {number} finCount - 成就系列已完成的成就数
   * @property {string} icon - 成就系列图标
   * @property {string} nameCard - 成就系列对应名片
   * @property {string} updated - 数据库更新时间
   * @returns AchievementSeries
   */
  export interface AchievementSeries {
    id: number
    order: number
    name: string | null
    version: string | null
    totalCount: number
    finCount: number
    icon: string | null
    nameCard: string | null
    updated: string | null
  }
}
