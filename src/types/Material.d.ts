/**
 * @file types Material.d.ts
 * @description 素材相关类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1。5
 */

declare namespace BTMuli.Genshin.Material {
  /**
   * @description 简要信息
   * @interface BriefInfo
   * @since Alpha v0.1.5
   * @property {number} id - 素材 id
   * @property {number} content_id - 观测枢的 content_id
   * @property {string} name - 素材名称
   * @property {string} type - 素材类型
   * @property {number} star - 素材星级
   * @property {string} bg - 素材背景
   * @property {string} icon - 素材图标
   * @returns {BriefInfo}
   */
  export interface BriefInfo {
    id: number
    content_id?: number
    name: string
    type: string
    star: number
    bg: string
    icon: string
  }
}
