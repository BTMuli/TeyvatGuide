/**
 * @file interface Calendar.ts
 * @description 素材日历接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type Map } from "./Base";

/**
 * @description 素材日历接口
 * @interface CalendarData
 * @since Alpha v0.1.2
 * @example Map<Calendar>
 * @property {Map<CalendarItem>} characters - 该天的角色相关数据
 * @property {Map<CalendarItem>} weapons - 该天的武器相关数据
 * @returns {CalendarData}
 */
export interface CalendarData {
  characters: Map<CalendarItem>
  weapons: Map<CalendarItem>
}

/**
 * @description 单日单秘境的素材日历接口
 * @interface CalendarItem
 * @since Alpha v0.1.2
 * @property {string} title - 地区 秘境名称
 * @property {MiniMaterial[]} materials - 素材 url
 * @property {MiniMaterial[]} contents - 角色/武器 url
 * @returns {CalendarItem}
 */
export interface CalendarItem {
  title: string
  materials: MiniMaterial[]
  contents: MiniMaterial[]
}

/**
 * @description 材料类型
 * @interface MiniMaterial
 * @since Alpha v0.1.2
 * @property {number} content_id - 观测枢的 content_id
 * @property {string} name - 名称
 * @property {string} icon - 图标 url
 */
export interface MiniMaterial {
  content_id: number
  name: string
  icon: string
}
