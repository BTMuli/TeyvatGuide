/**
 * @ file
 * @ author BTMuli<bt-muli@outlook.com>
 * @ description IndexedDB 里面存储的成就相关类型
 * @ since Alpha v0.1.2
 */

namespace TGAchievement {
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

export default TGAchievement;
