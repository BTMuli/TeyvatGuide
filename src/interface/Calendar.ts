/**
 * @file interface Calendar.ts
 * @description 素材日历接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type GameCountry } from "./Base";

/**
 * @description 素材日历接口
 * @interface Calendar
 * @since Alpha v0.1.2
 * @example Map<Calendar>
 * @property {number} weekDay - 一周的第几天
 * @property {CalendarCharacter} characters - 该天的角色相关数据
 * @property {CalendarWeapon} weapons - 该天的武器相关数据
 * @returns {Calendar}
 */
export interface Calendar {
  weekDay: number
  characters: Record<GameCountry, CalendarItem>
  weapons: Record<GameCountry, CalendarItem>
}

/**
 * @description 单日单秘境的素材日历接口
 * @interface CalendarItem
 * @since Alpha v0.1.2
 * @property {string} area - 地区
 * @property {string} source - 来源秘境
 * @todo 后续换成更为完善的类型
 * @property {MiniMaterial[]} materials - 素材 url
 * @property {MiniMaterial[]} contents - 角色/武器 url
 * @returns {CalendarItem}
 */
export interface CalendarItem {
  area: string
  source: string
  materials: string[]
  contents: string[]
}

/**
 * @description 材料类型
 * @interface MiniMaterial
 * @since Alpha v0.1.2
 * @property {number} star - 星级，或者说稀有度
 * @property {string} name - 材料名称
 * @property {string} url - 材料图片 url
 * @returns {MiniMaterial}
 */
export interface MiniMaterial {
  star: number
  name: string
  url: string
}
