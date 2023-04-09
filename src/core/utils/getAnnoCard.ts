/**
 * @file core utils transAnno.ts
 * @description 公告数据转换工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import type TGTypes from "../types/TGTypes";

/**
 * @description 将获取到的数据转为渲染用的卡片
 * @since Alpha v0.1.2
 * @param {TGTypes.AnnoListData} data 公告数据
 * @returns {AnnoListCard[]} 渲染用的卡片
 */
export function getAnnoCard (data: TGTypes.AnnoListData): TGTypes.AnnoListCard[] {
  const cards: TGTypes.AnnoListCard[] = [];
  data.list.map((annoList: TGTypes.Announcement) => {
    return annoList.list.map((anno: TGTypes.AnnoListItem) => {
      return cards.push({
        id: anno.ann_id,
        title: anno.title,
        subtitle: anno.subtitle,
        banner: anno.banner,
        typeLabel: anno.type_label,
        tagIcon: anno.tag_icon,
        startTime: anno.start_time,
        endTime: anno.end_time,
      });
    });
  });
  return cards;
}
