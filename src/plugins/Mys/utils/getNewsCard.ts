/**
 * @file plugins Mys utils news.ts
 * @description Mys 插件咨讯工具
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

// 默认封面图
const defaultCover = "/source/UI/defaultCover.webp";

/**
 * @description 活动状态
 * @since Alpha v0.2.1
 * @enum {TGApp.Plugins.Mys.News.RenderStatus}
 * @property {TGApp.Plugins.Mys.News.RenderStatus} STARTED 进行中
 * @property {TGApp.Plugins.Mys.News.RenderStatus} FINISHED 已结束
 * @property {TGApp.Plugins.Mys.News.RenderStatus} SELECTION 评选中
 * @return EnumStatus
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
export function getActivityStatus(status: number): TGApp.Plugins.Mys.News.RenderStatus {
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
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Mys.News.FullData} noticeData 公告数据
 * @returns {TGApp.Plugins.Mys.News.RenderCard[]}
 */
export function getNoticeCard(
  noticeData: TGApp.Plugins.Mys.News.FullData,
): TGApp.Plugins.Mys.News.RenderCard[] {
  const noticeCard: TGApp.Plugins.Mys.News.RenderCard[] = [];
  noticeData.list.map((item: TGApp.Plugins.Mys.News.Item) => {
    return noticeCard.push({
      title: item.post.subject,
      cover: item.cover?.url || item.post.cover || item.post.images[0] || defaultCover,
      postId: Number(item.post.post_id),
      subtitle: item.post.post_id,
    });
  });
  return noticeCard;
}

/**
 * @description 获取渲染用活动数据
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Mys.News.FullData} activityData 活动数据
 * @returns {TGApp.Plugins.Mys.News.RenderCard[]}
 */
export function getActivityCard(
  activityData: TGApp.Plugins.Mys.News.FullData,
): TGApp.Plugins.Mys.News.RenderCard[] {
  const activityCard: TGApp.Plugins.Mys.News.RenderCard[] = [];
  activityData.list.map((item: TGApp.Plugins.Mys.News.Item) => {
    const startTime = new Date(Number(item.news_meta.start_at_sec) * 1000).toLocaleDateString();
    const endTime = new Date(Number(item.news_meta.end_at_sec) * 1000).toLocaleDateString();
    const statusInfo = getActivityStatus(item.news_meta.activity_status);
    return activityCard.push({
      title: item.post.subject,
      cover: item.cover?.url || item.post.cover || item.post.images[0] || defaultCover,
      postId: Number(item.post.post_id),
      subtitle: `${startTime} - ${endTime}`,
      status: statusInfo,
    });
  });
  return activityCard;
}

/**
 * @description 获取渲染用新闻数据
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Mys.News.FullData} newsData 新闻数据
 * @returns {TGApp.Plugins.Mys.News.RenderCard[]}
 */
export function getNewsCard(
  newsData: TGApp.Plugins.Mys.News.FullData,
): TGApp.Plugins.Mys.News.RenderCard[] {
  const newsCard: TGApp.Plugins.Mys.News.RenderCard[] = [];
  newsData.list.map((item: TGApp.Plugins.Mys.News.Item) => {
    return newsCard.push({
      title: item.post.subject,
      cover: item.cover?.url || item.post.cover || item.post.images[0] || defaultCover,
      postId: Number(item.post.post_id),
      subtitle: item.post.post_id,
    });
  });
  return newsCard;
}