/**
 * @file plugins Genshin annoList.ts
 * @description 原神游戏内公告列表接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { Hk4eResponse } from "./base";

/**
 * @description 原神游戏内公告列表返回
 * @since Alpha v0.1.1
 * @see ANNO_LIST_API
 * @interface AnnoListResponse
 * @extends Hk4eResponse
 * @property {AnnoListData} data 公告数据
 * @return {AnnoListResponse}
 */
export interface AnnoListResponse extends Hk4eResponse {
	data: AnnoListData;
}

/**
 * @description 原神游戏内公告内容返回
 * @since Alpha v0.1.1
 * @see ANNO_CONTENT_API
 * @interface AnnoContentResponse
 * @extends Hk4eResponse
 * @property {AnnoContentData} data 公告数据
 * @return {AnnoContentResponse}
 */
export interface AnnoContentResponse extends Hk4eResponse {
	data: AnnoContentData;
}

/**
 * @description 公告列表数据
 * @since Alpha v0.1.1
 * @interface AnnoListData
 * @property {Announcement[]} list 公告列表
 * @property {number} total 公告总数
 * @property {AnnoTypeList[]} type_list 公告类型列表
 * @property {boolean} alert 是否有紧急公告
 * @property {number} alert_id 紧急公告 ID
 * @property {number} time_zone 时区
 * @property {string} t 系统时间
 * @property {unknown[]} pic_list 图片列表
 * @property {number} pic_total 图片总数
 * @property {unknown[]} pic_type_list 图片类型列表
 * @property {boolean} pic_alert 是否有紧急图片
 * @property {number} pic_alert_id 紧急图片 ID
 * @property {unknown} static_sign 静态签名
 * @return {AnnoListData}
 */
export interface AnnoListData {
	list: Announcement[];
	total: number;
	type_list: AnnoTypeList[];
	alert: boolean;
	alert_id: number;
	time_zone: number;
	t: string;
	pic_list: unknown[];
	pic_total: number;
	pic_type_list: unknown[];
	pic_alert: boolean;
	pic_alert_id: number;
	static_sign: unknown;
}

/**
 * @description 公告内容数据
 * @since Alpha v0.1.1
 * @interface AnnoContentData
 * @property {AnnoContentItem[]} list 公告列表
 * @property {number} total 公告总数
 * @property {unknown[]} pic_list 图片列表
 * @property {number} pic_total 图片总数
 * @return {AnnoContentData}
 */
export interface AnnoContentData {
	list: AnnoContentItem[];
	total: number;
	pic_list: unknown[];
	pic_total: number;
}

/**
 * @description 公告类型列表
 * @since Alpha v0.1.1
 * @interface AnnoTypeList
 * @property {number} id 类型 ID
 * @property {string} name 类型名称
 * @property {string} mi18n_name 类型名称
 * @return {AnnoTypeList}
 */
export interface AnnoTypeList {
	id: number;
	name: string;
	mi18n_name: string;
}

/**
 * @description 公告
 * @since Alpha v0.1.1
 * @interface Announcement
 * @property {AnnoListItem[]} list 公告列表
 * @property {number} type_id 类型 ID
 * @property {string} type_label 类型标签
 * @return {Announcement}
 */
export interface Announcement {
	list: AnnoListItem[];
	type_id: number;
	type_label: string;
}

/**
 * @description 公告列表项
 * @since Alpha v0.1.1
 * @interface AnnoListItem
 * @property {number} ann_id 公告 ID
 * @property {string} title 公告标题
 * @property {string} subtitle 公告副标题
 * @property {string} banner 公告图片
 * @property {unknown} content 公告内容
 * @property {string} type_label 公告类型标签
 * @property {string} tag_label 公告标签
 * @property {string} tag_icon 公告标签图标
 * @property {number} login_alert 是否登录提示
 * @property {string} lang 公告语言
 * @property {string} start_time 公告开始时间 // "2023-03-01 07:00:00"
 * @property {string} end_time 公告结束时间 // "2023-04-12 06:00:00"
 * @property {number} type 公告类型
 * @property {number} remind 公告提醒
 * @property {number} alert 公告紧急
 * @property {string} tag_start_time 公告标签开始时间 // "2000-01-02 15:04:05"
 * @property {string} tag_end_time 公告标签结束时间 // "2030-01-02 15:04:05"
 * @property {number} remind_ver 公告提醒版本
 * @property {boolean} has_content 是否有内容
 * @property {boolean} extra_remind 是否有额外提醒
 * @return {AnnoListItem}
 */
export interface AnnoListItem {
	ann_id: number;
	title: string;
	subtitle: string;
	banner: string;
	content: unknown;
	type_label: string;
	tag_label: string;
	tag_icon: string;
	login_alert: number;
	lang: string;
	start_time: string;
	end_time: string;
	type: number;
	remind: number;
	alert: number;
	tag_start_time: string;
	tag_end_time: string;
	remind_ver: number;
	has_content: boolean;
	extra_remind: boolean;
}

/**
 * @description 公告内容列表
 * @since Alpha v0.1.1
 * @interface AnnoContentItem
 * @property {number} ann_id 公告 ID
 * @property {string} title 公告标题
 * @property {string} subtitle 公告副标题
 * @property {string} banner 公告图片
 * @property {string} content 公告内容为 HTML
 * @property {string} lang 公告语言
 * @return {AnnoContentItem}
 */
export interface AnnoContentItem {
	ann_id: number;
	title: string;
	subtitle: string;
	banner: string;
	content: string;
	lang: string;
}

/**
 * @description 渲染用公告列表数据
 * @since Alpha v0.1.1
 * @interface AnnoListCard
 * @property {number} id 公告 ID
 * @property {string} title 公告标题
 * @property {string} subtitle 公告副标题
 * @property {string} banner 公告图片
 * @property {string} type_label 公告类型标签
 * @property {string} start_time 公告开始时间
 * @property {string} end_time 公告结束时间
 * @return {AnnoListCard}
 */
export interface AnnoListCard {
	id: number;
	title: string;
	subtitle: string;
	banner: string;
	type_label: string;
	start_time: string;
	end_time: string;
}
