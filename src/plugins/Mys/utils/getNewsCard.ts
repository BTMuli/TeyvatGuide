/**
 * @file plugins/Mys/utils/news.ts
 * @description Mys 插件咨讯工具
 * @since Beta v0.4.4
 */

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
    colorCss: "#1EE2BA",
  },
  FINISHED: {
    status: "已结束",
    colorCss: "#C0C5C8",
  },
  SELECTION: {
    status: "评选中",
    colorCss: "#FF983B",
  },
  UNKNOWN: {
    status: "未知",
    colorCss: "#F03F24", // 胭脂红
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
 * @description 获取封面图
 * @since Beta v0.4.4
 * @param {TGApp.Plugins.Mys.News.Item} item 咨讯列表项
 * @returns {string} 封面图链接
 */
export function getPostCover(item: TGApp.Plugins.Mys.News.Item): string {
  // 默认封面图
  const defaultCover = "/source/UI/defaultCover.webp";
  let cover;
  if (item.cover) {
    cover = item.cover.url;
  } else if (item.post.cover) {
    cover = item.post.cover;
  } else if (item.post.images.length > 0) {
    cover = item.post.images[0];
  }
  if (cover === undefined) return defaultCover;
  if (cover.endsWith(".gif")) return cover;
  return `${cover}?x-oss-process=image/format,png`;
}

/**
 * @description 获取公共属性
 * @since Beta v0.4.0
 * @param {TGApp.Plugins.Mys.News.Item} item 咨讯列表项
 * @returns {TGApp.Plugins.Mys.News.RenderCard} 渲染用咨讯列表项
 */
function getCommonCard(item: TGApp.Plugins.Mys.News.Item): TGApp.Plugins.Mys.News.RenderCard {
  return {
    title: item.post.subject,
    cover: getPostCover(item),
    postId: Number(item.post.post_id),
    subtitle: item.post.post_id,
    user: item.user,
    forum: {
      name: item.forum.name,
      icon: item.forum.icon,
    },
    data: {
      mark: item.stat.bookmark_num,
      forward: item.stat.forward_num,
      like: item.stat.like_num,
      reply: item.stat.reply_num,
      view: item.stat.view_num,
    },
  };
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
    return noticeCard.push(getCommonCard(item));
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
    const commonCard = getCommonCard(item);
    commonCard.subtitle = `${startTime} - ${endTime}`;
    commonCard.status = statusInfo;
    return activityCard.push(commonCard);
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
    return newsCard.push(getCommonCard(item));
  });
  return newsCard;
}
