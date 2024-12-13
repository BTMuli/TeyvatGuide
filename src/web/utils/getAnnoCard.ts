/**
 * @file web utils transAnno.ts
 * @description 公告数据转换工具
 * @since Beta v0.6.1
 */

/**
 * @description 获取公告标签
 * @since Beta v0.4.4
 * @param {string} tag 标签
 * @returns {string} 标签
 */
function getAnnoTag(tag: string): string {
  switch (tag) {
    case "1":
    case "11":
    case "重要":
      return "公告";
    case "2":
    case "扭蛋":
      return "祈愿";
    case "3":
      return "活动";
    default:
      return tag;
  }
}

/**
 * @description 将获取到的数据转为渲染用的卡片
 * @since Beta v0.6.1
 * @param {TGApp.BBS.Announcement.ListData[]} data 公告数据
 * @returns {TGApp.App.Announcement.ListCard[]} 渲染用的卡片
 */
export function getAnnoCard(
  data: TGApp.BBS.Announcement.ListData,
): Array<TGApp.App.Announcement.ListCard> {
  const cards: Array<TGApp.App.Announcement.ListCard> = [];
  for (const annoList of data.list) {
    for (const anno of annoList.list) {
      const timeStart = anno.start_time.split(" ")[0];
      const timeEnd = anno.end_time.split(" ")[0];
      const time = `${timeStart} ~ ${timeEnd}`;
      cards.push({
        id: anno.ann_id,
        title: anno.title,
        subtitle: anno.subtitle.replace(/<br \/>/g, " "),
        banner: anno.banner,
        typeLabel: anno.type === 2 ? "游戏公告" : "活动公告",
        tagIcon: anno.tag_icon,
        tagLabel: getAnnoTag(anno.tag_label),
        timeStr: time,
      });
    }
  }
  return cards;
}
