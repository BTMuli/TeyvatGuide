/**
 * @file plugins Genshin utils announcements.ts
 * @description 原神游戏内公告工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { type AnnoListData, type AnnoListCard, type Announcement, type AnnoListItem } from "../interface/announcement";

/**
 * @description 将获取到的数据转为渲染用的卡片
 * @since Alpha v0.1.1
 * @param {AnnoListData} data 公告数据
 * @returns {AnnoListCard[]} 渲染用的卡片
 */
export function getAnnoCards (data: AnnoListData): AnnoListCard[] {
  const cards: AnnoListCard[] = [];
  data.list.map((annoList: Announcement) => {
    return annoList.list.map((anno: AnnoListItem) => {
      return cards.push({
        id: anno.ann_id,
        title: anno.title,
        subtitle: anno.subtitle,
        banner: anno.banner,
        type_label: anno.type_label,
        tag_icon: anno.tag_icon,
        start_time: anno.start_time,
        end_time: anno.end_time,
      });
    });
  });
  return cards;
}
