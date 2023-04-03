/**
 * @file plugins Mys utils position.ts
 * @description Mys 插件热点追踪工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { PositionObc, PositionData, PositionCard } from "../interface/position";

/**
 * @description 深度优先遍历
 * @since Alpha v0.1.1
 * @param {PositionObc[]} list 列表
 * @return {PositionData[]} 返回列表
 */
export function dfs(list: PositionObc[]): PositionData[] {
	const res: PositionData[] = [];
	for (const item of list) {
		if (item.name === "近期活动") {
			res.push(...item.list);
		}
		if (item.children) {
			res.push(...dfs(item.children as PositionObc[]));
		}
	}
	return res;
}

/**
 * @description 根据热点追踪信息转为渲染用的数据
 * @since Alpha v0.1.1
 * @param {PositionData[]} positionData 列表
 * @return {PositionCard[]} 返回列表
 */
export function getPositionCard(positionData: PositionData[]): PositionCard[] {
	const res: PositionCard[] = [];
	positionData.map(position => {
		res.push({
			title: position.title,
			post_id: Number(position.url.split("/").pop()),
			icon: position.icon,
			abstract: position.abstract,
			time: {
				start: position.create_time,
				start_stamp: new Date(position.create_time).getTime(),
				end: new Date(Number(position.end_time))
					.toLocaleString("zh-CN", {
						hour12: false,
					})
					.replace(/\//g, "-"),
				end_stamp: Number(position.end_time),
			},
		});
	});
	return res;
}