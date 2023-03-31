/**
 * @file plugins Mys interface gacha.ts
 * @description Mys 插件抽卡接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { MysResponse } from "./base";

/**
 * @description 获取卡池信息的返回类型
 * @since Alpha
 * @interface GachaResponse
 * @extends MysResponse
 * @property {GachaData[]} data.list 卡池数据
 * @return {GachaResponse}
 */
export interface GachaResponse extends MysResponse {
	data: {
		list: GachaData[];
	};
}

/**
 * @description 获取卡池信息的返回类型
 * @since Alpha
 * @interface GachaData
 * @property {string} id 卡池ID
 * @property {string} title 卡池标题
 * @property {string} activity_url 卡池对应帖子
 * @property {string} content_before_act 卡池内容
 * @property {GachaPool[]} pool 卡池包含的角色
 * @property {string} voice_icon 卡池角色语音头像
 * @property {string} voice_url 卡池角色语音URL
 * @property {string} voice_status 卡池角色语音状态
 * @description 如下时间示例：2023-03-21 17:59:59
 * @property {string} start_time 卡池开始时间
 * @property {string} end_time 卡池结束时间
 * @return {GachaData}
 */
export interface GachaData {
	id: string;
	title: string;
	activity_url: string;
	content_before_act: string;
	pool: GachaPool[];
	voice_icon: string;
	voice_url: string;
	voice_status: string;
	start_time: string;
	end_time: string;
}

/**
 * @description 获取卡池信息的返回类型
 * @since Alpha
 * @interface GachaPool
 * @property {string} icon 卡池角色头像
 * @property {string} url 卡池角色URL
 * @return {GachaPool}
 */
export interface GachaPool {
	icon: string;
	url: string;
}

/**
 * @description 用于渲染的卡池数据
 * @since Alpha v0.1.1
 * @interface GachaCard
 * @property {string} title 卡池标题
 * @property {string} subtitle 卡池副标题
 * @property {string} cover 卡池封面
 * @property {number} post_id 卡池对应帖子ID
 * @property {GachaPool[]} characters 卡池包含的角色
 * @property {GachaPool} voice 卡池角色语音
 * @property time 卡池时间
 * @property {string} time.start 卡池开始时间
 * @property {string} time.start_stamp 卡池开始时间戳
 * @property {string} time.end 卡池结束时间
 * @property {string} time.end_stamp 卡池结束时间戳
 * @return {GachaCard}
 */
export interface GachaCard {
	title: string;
	subtitle: string;
	cover: string;
	post_id: number;
	characters: GachaPool[];
	voice: GachaPool;
	time: {
		start: string;
		start_stamp: number;
		end: string;
		end_stamp: number;
	};
}
