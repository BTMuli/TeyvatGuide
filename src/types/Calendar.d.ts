/**
 * @file core types TGCalendar.d.ts
 * @description 本应用的素材日历类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace BTMuli.Genshin.Calendar {
  /**
     * @description 素材日历接口
     * @interface Data
     * @since Alpha v0.1.5
     * @property {number} id - 日历项 id
     * @property {number} content_id - 观测枢的 content_id
     * @property {Array<number>} drop_day - 掉落日
     * @property {string} name - 日历项名称
     * @property {string} item_type - 日历项类型
     * @property {number} star - 日历项星级
     * @property {string} bg - 日历项背景
     * @property {string} icon - 日历项图标
     * @property {string} weapon_type - 武器类型
     * @property {string} element - 角色元素
     * @property {BTMuli.Genshin.Material.BriefInfo[]} materials - 素材简要信息
     * @property {CalendarSource} source - 日历项来源
     * @returns {Data}
     */
  export interface Data {
    id: number
    content_id: number | null
    drop_day: number[]
    name: string
    item_type: string
    star: number
    bg: string
    icon: string
    weapon_type: string
    element?: string
    materials: BTMuli.Genshin.Material.BriefInfo[]
    source: CalendarSource
  }

  /**
   * @description 素材日历来源
   * @interface CalendarSource
   * @since Alpha v0.1.5
   * @property {string} type - 来源类型
   * @property {string} area - 来源区域
   * @property {string} name - 来源名称
   * @return {CalendarSource}
   */
  export interface CalendarSource {
    type: string
    area: string
    name: string
  }
}
