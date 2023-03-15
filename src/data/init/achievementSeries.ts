/**
 * @file data init achievementSeries
 * @description data init achievementSeries
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { MergeData } from "../merge";
import { SeriesMap } from "../../interface/Achievements";
import { Map } from "../../interface/Base";

/**
 * @description 成就系列表参数
 * @since Alpha
 */
export const Config = {
	storeName: "AchievementSeries",
	keyPath: "id",
	indexes: ["order", "name", "version", "card", "total_count", "complete_count"],
};

/**
 * @description 成就系列数据
 * @since Alpha
 * @return {SeriesMap[]}
 */
export function getData() {
	const data: Map<SeriesMap> = MergeData.achievementSeries;
	return Object.keys(data).map(key => {
		return data[Number(key)];
	});
}
