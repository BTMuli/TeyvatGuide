/**
 * @file types GCG.d.ts
 * @description 本应用的 GCG 通用类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

declare namespace BTMuli.Genshin.Wiki.GCG {
  /**
   * @description 简略信息
   * @since Alpha v0.1.3
   * @interface BriefInfo
   * @property {number} id - 卡牌 ID
   * @property {umber} content_id - 观测枢 ID
   * @property {string} name - 卡牌名称
   * @property {string} type - 卡牌类型
   * @property {string} icon - 卡牌图标
   * @return BriefInfo
   */
  export interface BriefInfo {
    id: number | null
    content_id: number
    name: string
    type: string
    icon: string
  }
}
