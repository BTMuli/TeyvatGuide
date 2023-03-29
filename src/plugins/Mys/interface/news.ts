/**
 * @file plugins Mys interface news.ts
 * @description Mys 插件咨讯接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { MysResponse } from "./base";
import { Post, Forum, Topic, PostStat } from "./post";
import { User, SelfOperation } from "./user";
import { ImageData, HelpSys } from "./utils";

/**
 * @description 咨讯返回数据
 * @since Alpha
 * @interface NewsResponse
 * @extends {MysResponse}
 * @property {NewsData} data 咨讯数据
 * @return {NewsResponse}
 */
export interface NewsResponse extends MysResponse {
	data: NewsData;
}

/**
 * @description 咨讯数据
 * @since Alpha
 * @interface NewsData
 * @property {number} last_id 最后一条咨讯 ID
 * @property {boolean} is_last 是否最后一页
 * @property {NewsItem[]} list 咨讯列表
 * @return {NewsData}
 */
export interface NewsData {
	last_id: number;
	is_last: boolean;
	list: NewsItem[];
}

/**
 * @description 咨讯列表项
 * @since Alpha
 * @interface NewsItem
 * @property {Post} post 帖子
 * @property {Forum} forum 版块
 * @property {Topic[]} topics 话题
 * @property {User} user 发帖用户
 * @property {SelfOperation} self_operation 用户操作
 * @property {PostStat} stat 帖子统计
 * @property {HelpSys} help_sys 帮助系统，可能为 null
 * @property {ImageData} cover 封面图片 URL
 * @property {ImageData[]} image_list 图片列表
 * @property {boolean} is_official_master 是否为官方
 * @property {boolean} is_user_master 是否用户
 * @property {boolean} hot_reply_exist 是否热门回复
 * @property {number} vote_count 投票数
 * @property {number} last_modify_time 最后修改时间
 * @property {string} recommend_type 推荐类型
 * @property {unknown} collection 合集, 可能为 null // TODO: 未知
 * @property {unknown[]} vod_list 视频列表
 * @property {boolean} is_block_on 是否屏蔽
 * @property {unknown} forum_rank_info 版块排名信息，可能为 null // TODO: 未知
 * @property {unknown[]} link_card_list 链接卡片列表，可能为 null // TODO: 未知
 * @property {NewsMeta} news_meta 元数据
 * @return {NewsItem}
 */
export interface NewsItem {
	post: Post;
	forum: Forum;
	topics: Topic[];
	user: User;
	self_operation: SelfOperation;
	stat: PostStat;
	help_sys: HelpSys;
	cover: ImageData;
	image_list: ImageData[];
	is_official_master: boolean;
	is_user_master: boolean;
	hot_reply_exist: boolean;
	vote_count: number;
	last_modify_time: number;
	recommend_type: string;
	collection: unknown;
	vod_list: unknown[];
	is_block_on: boolean;
	forum_rank_info: unknown;
	link_card_list: unknown[];
	news_meta: NewsMeta;
}

/**
 * @description 咨讯元数据，只有活动咨讯才有
 * @since Alpha
 * @interface NewsMeta
 * @property {number} activity_status 活动状态 // ActivityStatus
 * @property {string} start_at_sec 活动开始时间戳，单位秒
 * @property {string} end_at_sec 活动结束时间戳，单位秒
 * @return {NewsMeta}
 */
export interface NewsMeta {
	activity_status: number;
	start_at_sec: string;
	end_at_sec: string;
}

/**
 * @description 用于渲染的咨讯卡片
 * @since Alpha
 * @interface NewsCard
 * @property {string} title 标题
 * @property {string} cover 封面图片 URL
 * @property {number} post_id 帖子 ID
 * @property {string} subtitle 副标题
 * @property {string} status 活动状态，仅活动咨讯有
 * @property {string} status_color 活动状态按钮背景色，仅活动咨讯有
 * @return {NewsCard}
 */
export interface NewsCard {
	title: string;
	cover: string;
	post_id: number;
	subtitle: string;
	status?: string;
	status_color?: string;
}
