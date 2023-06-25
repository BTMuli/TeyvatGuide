/**
 * @file web utils transAnno.ts
 * @description 公告数据转换工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

// 默认封面图
const defaultCover = "/source/UI/defaultCover.webp";

/**
 * @description 将获取到的数据转为渲染用的卡片
 * @since Alpha v0.1.2
 * @param {TGApp.BBS.Announcement.ListData[]} data 公告数据
 * @returns {TGApp.App.Announcement.ListCard[]} 渲染用的卡片
 */
export function getAnnoCard(
  data: TGApp.BBS.Announcement.ListData,
): TGApp.App.Announcement.ListCard[] {
  const cards: TGApp.App.Announcement.ListCard[] = [];
  data.list.map((annoList: TGApp.BBS.Announcement.ListItem) => {
    return annoList.list.map((anno: TGApp.BBS.Announcement.AnnoSingle) => {
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
