/**
 * @file core utils transAnno.ts
 * @description 公告数据转换工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

// 默认封面图
const defaultCover = "/source/UI/defaultCover.webp";

/**
 * @description 将获取到的数据转为渲染用的卡片
 * @since Alpha v0.1.2
 * @param {BTMuli.Genshin.Announcement.ListData} data 公告数据
 * @returns {AnnoListCard[]} 渲染用的卡片
 */
export function getAnnoCard (data: BTMuli.Genshin.Announcement.ListData): BTMuli.Genshin.Announcement.ListCard[] {
  const cards: BTMuli.Genshin.Announcement.ListCard[] = [];
  data.list.map((annoList: BTMuli.Genshin.Announcement) => {
    return annoList.list.map((anno: BTMuli.Genshin.Announcement.ListItem) => {
      return cards.push({
        id: anno.ann_id,
        title: anno.title,
        subtitle: anno.subtitle,
        banner: anno.banner || defaultCover,
        typeLabel: anno.type_label,
        tagIcon: anno.tag_icon,
        startTime: anno.start_time,
        endTime: anno.end_time,
      });
    });
  });
  return cards;
}
