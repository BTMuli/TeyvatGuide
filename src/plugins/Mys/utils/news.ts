/**
 * @file plugins Mys utils news.ts
 * @description Mys 插件咨讯工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type NewsData, type NewsItem, type NewsCard, type ActivityStatus } from "../interface/news";

// 默认封面图
const defaultCover = "/source/UI/defaultCover.webp";

/**
 * @description 活动状态
 * @since Alpha v0.1.1
 * @enum {ActivityStatus}
 * @property {ActivityStatus} STARTED 进行中
 * @property {ActivityStatus} FINISHED 已结束
 * @property {ActivityStatus} SELECTION 评选中
 * @returns {EnumStatus}
 */
const EnumStatus = {
  STARTED: {
    status: "进行中",
    colorCss: "#1EE2BA !important",
  },
  FINISHED: {
    status: "已结束",
    colorCss: "#C0C5C8 !important",
  },
  SELECTION: {
    status: "评选中",
    colorCss: "#FF983B !important",
  },
  UNKNOWN: {
    status: "未知",
    colorCss: "#3C3F41 !important",
  },
};

/**
 * @description 获取活动状态
 * @since Alpha
 * @param {number} status 活动状态码
 * @returns {string}
 */
export function getActivityStatus (status: number): ActivityStatus {
  switch (status) {
    case 1:
      return EnumStatus.STARTED;
    case 2:
      return EnumStatus.SELECTION;
    case 3:
      return EnumStatus.FINISHED;
    default:
      return EnumStatus.UNKNOWN;
  }
}

/**
 * @description 获取渲染用公告数据
 * @since Alpha v0.1.2
 * @param {NewsData} noticeData 公告数据
 * @returns {NewsCard[]}
 */
export function getNoticeCard (noticeData: NewsData): NewsCard[] {
  const noticeCard: NewsCard[] = [];
  noticeData.list.map((item: NewsItem) => {
    return noticeCard.push({
      title: item.post.subject,
      cover: item.cover?.url || item.post.cover || item.post.images[0] || defaultCover,
      post_id: Number(item.post.post_id),
      subtitle: item.post.post_id,
    });
  });
  return noticeCard;
}

/**
 * @description 获取渲染用活动数据
 * @since Alpha v0.1.2
 * @param {NewsData} activityData 活动数据
 * @returns {NewsCard[]}
 */
export function getActivityCard (activityData: NewsData): NewsCard[] {
  const activityCard: NewsCard[] = [];
  activityData.list.map((item: NewsItem) => {
    const startTime = new Date(Number(item.news_meta.start_at_sec) * 1000).toLocaleDateString();
    const endTime = new Date(Number(item.news_meta.end_at_sec) * 1000).toLocaleDateString();
    const statusInfo = getActivityStatus(item.news_meta.activity_status);
    return activityCard.push({
      title: item.post.subject,
      cover: item.cover?.url || item.post.cover || item.post.images[0] || defaultCover,
      post_id: Number(item.post.post_id),
      subtitle: `${startTime} - ${endTime}`,
      status: statusInfo,
    });
  });
  return activityCard;
}

/**
 * @description 获取渲染用新闻数据
 * @since Alpha v0.1.2
 * @param {NewsData} newsData 新闻数据
 * @returns {NewsCard[]}
 */
export function getNewsCard (newsData: NewsData): NewsCard[] {
  const newsCard: NewsCard[] = [];
  newsData.list.map((item: NewsItem) => {
    return newsCard.push({
      title: item.post.subject,
      cover: item.cover?.url || item.post.cover || item.post.images[0] || defaultCover,
      post_id: Number(item.post.post_id),
      subtitle: item.post.post_id,
    });
  });
  return newsCard;
}
