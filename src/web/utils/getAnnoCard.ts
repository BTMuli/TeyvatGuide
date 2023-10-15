/**
 * @file web utils transAnno.ts
 * @description 公告数据转换工具
 * @since Beta v0.3.3
 */

// 默认封面图
const defaultCover = "/source/UI/defaultCover.webp";

/**
 * @description 将获取到的数据转为渲染用的卡片
 * @since Beta v0.3.3
 * @param {TGApp.BBS.Announcement.ListData[]} data 公告数据
 * @returns {TGApp.App.Announcement.ListCard[]} 渲染用的卡片
 */
export function getAnnoCard(
  data: TGApp.BBS.Announcement.ListData,
): TGApp.App.Announcement.ListCard[] {
  const cards: TGApp.App.Announcement.ListCard[] = [];
  data.list.map((annoList: TGApp.BBS.Announcement.ListItem) => {
    return annoList.list.map((anno: TGApp.BBS.Announcement.AnnoSingle) => {
      const timeStart = anno.start_time.split(" ")[0];
      const timeEnd = anno.end_time.split(" ")[0];
      const time = `${timeStart} ~ ${timeEnd}`;
      return cards.push({
        id: anno.ann_id,
        title: anno.title,
        subtitle: anno.subtitle,
        banner: anno.banner || defaultCover,
        typeLabel: anno.type_label,
        tagIcon: anno.tag_icon,
        tagLabel: anno.tag_label,
        timeStr: time,
      });
    });
  });
  return cards;
}
