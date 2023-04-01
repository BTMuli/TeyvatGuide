/**
 * @file plugins Mys request news.ts
 * @description Mys 插件咨讯请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { http } from "@tauri-apps/api";
import { NewsData, NewsResponse } from "../interface/news";

// 咨讯 API
const NEWS_LIST_API =
	"https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&page_size={page_size}&type={news_type}&last_id={last_id}";

/**
 * @description 咨讯类型
 * @enum NewsType
 * @since Alpha
 * @property {string} NOTICE 公告
 * @property {string} ACTIVITY 活动
 * @property {string} NEWS 咨讯
 * @return {NewsType}
 */
enum NewsType {
	NOTICE = "1",
	ACTIVITY = "2",
	NEWS = "3",
}

/**
 * @description 获取 Notice 列表
 * @since Alpha v0.1.1
 * @param {number} page_size 返回数量
 * @param {number} last_id 上一次请求的最后一条数据的 id
 * @return {Promise<NewsData>}
 */
export async function getNoticeList(
	page_size: number = 20,
	last_id: number = 0
): Promise<NewsData> {
	const url = NEWS_LIST_API.replace("{page_size}", page_size.toString())
		.replace("{news_type}", NewsType.NOTICE)
		.replace("{last_id}", last_id.toString());
	return await http.fetch<NewsResponse>(url).then(res => res.data.data);
}

/**
 * @description 获取 Activity 列表
 * @since Alpha v0.1.1
 * @param {number} page_size 返回数量
 * @param {number} last_id 上一次请求的最后一条数据的 id
 * @return {Promise<NewsData>}
 */
export async function getActivityList(
	page_size: number = 20,
	last_id: number = 0
): Promise<NewsData> {
	const url = NEWS_LIST_API.replace("{page_size}", page_size.toString())
		.replace("{news_type}", NewsType.ACTIVITY)
		.replace("{last_id}", last_id.toString());
	return await http.fetch<NewsResponse>(url).then(res => res.data.data);
}

/**
 * @description 获取 News 列表
 * @since Alpha v0.1.1
 * @param {number} page_size 返回数量
 * @param {number} last_id 上一次请求的最后一条数据的 id
 * @return {Promise<NewsData>}
 */
export async function getNewsList(page_size: number = 20, last_id: number = 0): Promise<NewsData> {
	const url = NEWS_LIST_API.replace("{page_size}", page_size.toString())
		.replace("{news_type}", NewsType.NEWS)
		.replace("{last_id}", last_id.toString());
	return await http.fetch<NewsResponse>(url).then(res => res.data.data);
}
