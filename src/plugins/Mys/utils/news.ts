/**
 * @file plugins Mys utils news.ts
 * @description Mys 插件咨讯工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { NewsData, NewsItem, NewsCard } from "../interface/news";

/**
 * @description 活动状态
 * @enum ActivityStatus
 * @since Alpha
 * @property {string} STARTED 进行中
 * @property {string} FINISHED 已结束
 * @property {string} SELECTION 评选中
 * @return {ActivityStatus}
 */
enum ActivityStatus {
	STARTED = "进行中",
	FINISHED = "已结束",
	SELECTION = "评选中",
}

/**
 * @description 获取活动状态
 * @since Alpha
 * @param {number} status 活动状态码
 * @return {string}
 */
export function getActivityStatus(status: number): { status: ActivityStatus; color: string } {
	switch (status) {
		case 1:
			return {
				status: ActivityStatus.STARTED,
				color: "#3c99aa",
			};
		case 2:
			return {
				status: ActivityStatus.FINISHED,
				color: "#c7674b",
			};
		case 3:
			return {
				status: ActivityStatus.SELECTION,
				color: "#849cc7",
			};
		default:
			return {
				status: ActivityStatus.FINISHED,
				color: "#c7674b",
			};
	}
}

/**
 * @description 获取渲染用公告数据
 * @since Alpha
 * @param {NewsData} noticeData 公告数据
 * @return {NewsCard[]}
 */
export function getNoticeCard(noticeData: NewsData): NewsCard[] {
	const noticeCard: NewsCard[] = [];
	noticeData.list.map((item: NewsItem) => {
		noticeCard.push({
			title: item.post.subject,
			cover: item.cover.url || item.post.cover || item.post.images[0],
			post_id: Number(item.post.post_id),
			subtitle: item.post.post_id,
		});
	});
	return noticeCard;
}

/**
 * @description 获取渲染用活动数据
 * @since Alpha
 * @param {NewsData} activityData 活动数据
 * @return {NewsCard[]}
 */
export function getActivityCard(activityData: NewsData): NewsCard[] {
	const activityCard: NewsCard[] = [];
	activityData.list.map((item: NewsItem) => {
		const start_time = new Date(Number(item.news_meta.start_at_sec) * 1000).toLocaleDateString();
		const end_time = new Date(Number(item.news_meta.end_at_sec) * 1000).toLocaleDateString();
		const status_info = getActivityStatus(item.news_meta.activity_status);
		activityCard.push({
			title: item.post.subject,
			cover: item.cover.url || item.post.cover || item.post.images[0],
			post_id: Number(item.post.post_id),
			subtitle: `${start_time} - ${end_time}`,
			status: status_info.status,
			status_color: status_info.color,
		});
	});
	return activityCard;
}

/**
 * @description 获取渲染用新闻数据
 * @since Alpha
 * @param {NewsData} newsData 新闻数据
 * @return {NewsCard[]}
 */
export function getNewsCard(newsData: NewsData): NewsCard[] {
	const newsCard: NewsCard[] = [];
	newsData.list.map((item: NewsItem) => {
		newsCard.push({
			title: item.post.subject,
			cover: item.cover.url || item.post.cover || item.post.images[0],
			post_id: Number(item.post.post_id),
			subtitle: item.post.post_id,
		});
	});
	return newsCard;
}
