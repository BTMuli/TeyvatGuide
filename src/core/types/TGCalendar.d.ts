/**
 * @file core types TGCalendar.d.ts
 * @description 本应用的素材日历类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

namespace TGCalendar {
  /**
 * @description 素材日历接口
 * @interface CalendarData
 * @since Alpha v0.1.2
 * @property {Record<number, CalendarItem>} characters - 该天的角色相关数据
 * @property {Record<number, CalendarItem>} weapons - 该天的武器相关数据
 * @returns {CalendarData}
 */
  export interface CalendarData {
    characters: Record<number, CalendarItem>
    weapons: Record<number, CalendarItem>
  }

  /**
 * @description 单日单秘境的素材日历接口
 * @interface CalendarItem
 * @since Alpha v0.1.2
 * @property {string} title - 地区 秘境名称
 * @property {CalendarMaterial[]} materials - 素材 url
 * @property {CalendarMaterial[]} contents - 角色/武器 url
 * @returns {CalendarItem}
 */
  export interface CalendarItem {
    title: string
    materials: CalendarMaterial[]
    contents: CalendarMaterial[]
  }

  /**
 * @description 材料类型
 * @interface MiniMaterial
 * @since Alpha v0.1.2
 * @property {number} id - 角色/武器的 id
 * @property {number} star - 角色/武器的星级
 * @property {number} content_id - 观测枢的 content_id
 * @property {string} name - 名称
 * @property {string} icon - 图标 url
 */
  export interface CalendarMaterial {
    id?: number
    star: number
    content_id: number
    name: string
    icon: string
  }
}

export default TGCalendar;
