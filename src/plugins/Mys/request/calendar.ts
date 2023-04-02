/**
 * @file plugins Mys request calendar.ts
 * @description Mys 插件日历请求
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { http } from "@tauri-apps/api";
import { CalendarResponse, CalendarData } from "../interface/calendar";

// 日历 API
const CALENDAR_API =
	"https://api-static.mihoyo.com/common/blackboard/ys_obc/v1/get_activity_calendar?app_sn=ys_obc";

/**
 * @description 日历请求
 * @since Alpha v0.1.1
 * @return {Promise<CalendarData[]>}
 */
export async function getCalendarData(): Promise<CalendarData[]> {
	const res = await http
		.fetch<CalendarResponse>(CALENDAR_API, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})
		.then(res => {
			return res.data.data.list;
		});
	return res.filter(item => item.kind === "2");
}
