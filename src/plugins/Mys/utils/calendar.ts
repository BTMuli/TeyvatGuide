/**
 * @file plugins Mys utils calendar.ts
 * @description Mys 插件日历工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { CalendarData, CalendarCard } from "../interface/calendar";

/**
 * @description 将日历数据转换为卡片数据
 * @since Alpha v0.1.1
 * @param {CalendarData[]} calendarData 日历数据
 * @return {CalendarCard[]}
 */
export function getCalendarCard(calendarData: CalendarData[]): CalendarCard[] {
	const calendarCard: CalendarCard[] = [];
	calendarData.forEach((data: CalendarData) => {
		return calendarCard.push({
			id: Number(data.id),
			type: Number(data.break_type),
			title: data.title,
			cover: data.img_url,
			url: data.jump_type === "1" ? data.jump_url : data.content_id,
			drop_day: data.drop_day,
			sort_day: JSON.parse(data.sort),
			contentInfos: data.contentInfos,
		});
	});
	return calendarCard;
}
