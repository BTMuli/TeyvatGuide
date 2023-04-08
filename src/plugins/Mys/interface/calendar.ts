/**
 * @file plugins Mys interface calendar.ts
 * @description Mys 插件日历接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type MysResponse } from "./base";

/**
 * @description 日历返回数据
 * @since Alpha v0.1.1
 * @interface CalendarResponse
 * @extends {MysResponse}
 * @property {CalendarData[]} data.list 日历数据
 * @returns {CalendarResponse}
 */
export interface CalendarResponse extends MysResponse {
  data: {
    list: CalendarData[]
  }
}

/**
 * @description 日历数据
 * @since Alpha v0.1.1
 * @interface CalendarData
 * @property {string} id 日历 ID
 * @property {string} title 日历标题
 * @property {string} kind 日历数据类型，1 为活动，2 为角色/武器，4 为角色生日
 * @property {string} img_url 日历图片 URL
 * @property {string} jump_type 日历跳转类型，1 为帖子链接，2 为观测枢链接
 * @property {string} jump_url 日历跳转 URL，jump_type 为 1 时不为空
 * @property {string} content_id 日历内容 ID，jump_type 为 2 时不为空
 * @property {string} style 日历样式，// TODO: 未知
 * @property {string} start_time 开始时间，kind 为 2 时为 0
 * @property {string} end_time 结束时间，kind 为 2 时为 0
 * @property {string} font_color 日历字体颜色，kind 为 2 时为空
 * @property {string} padding_color 日历背景颜色，kind 为 2 时为空
 * @property {string[]} drop_day 掉落日，kind 为 2 时不为空
 * @property {string} break_type 日历分割类型，0 为活动/生日，1 为武器， 2 为角色
 * @property {CalendarContent[]} contentInfos 材料内容，kind 为 2 时不为空
 * @property {string} sort 排序，kind 为 2 时不为空，反序列化后为 Map<number, number>，前者为星期，后者为排序
 * @property {CalendarContent[]} contentSource 材料来源，kind 为 2 时不为空
 * @returns {CalendarData}
 */
export interface CalendarData {
  id: string
  title: string
  kind: string
  img_url: string
  jump_type: string
  jump_url: string
  content_id: string
  style: string
  start_time: string
  end_time: string
  font_color: string
  padding_color: string
  drop_day: string[]
  break_type: string
  contentInfos: CalendarContent[]
  sort: string
  contentSource: CalendarContent[]
}

/**
 * @description 日历内容
 * @since Alpha v0.1.1
 * @interface CalendarContent
 * @property {string} id 内容 ID，对应的是观测枢的 content_id
 * @property {string} title 材料/秘境 名称
 * @property {string} icon 材料/秘境 图片 URL
 * @property {string} bbs_url 链接，一般为空
 * @returns {CalendarContent}
 */
export interface CalendarContent {
  id: string
  title: string
  icon: string
  bbs_url: string
}

/**
 * @description 渲染用的日历数据
 * @since Alpha v0.1.2
 * @interface CalendarCard
 * @property {number} id 角色/武器 ID
 * @property {number} type 角色/武器，角色为 2，武器为 1
 * @property {string} title 角色/武器 名称
 * @property {string} cover 角色/武器 封面
 * @property {string} url 跳转链接，一般为 content_id
 * @property {string[]} drop_day 掉落日
 * @property {Record<number, number>} sort_day 排序
 * @property {CalendarContent[]} contentInfos 材料内容
 * @returns {CalendarCard}
 */
export interface CalendarCard {
  id: number
  type: number
  title: string
  cover: string
  url: string
  drop_day: string[]
  sort_day: Record<number, number>
  contentInfos: CalendarContent[]
}
