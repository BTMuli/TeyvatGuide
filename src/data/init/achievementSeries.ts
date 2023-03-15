/**
 * @file data init achievementSeries
 * @description data init achievementSeries
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { AchievementSeries } from "../../interface/Achievements";
import { Map } from "../../interface/Base";
import { AppData } from "../app";

/**
 * @description 成就系列表参数
 * @since Alpha
 */
export const Config = {
	storeName: "AchievementSeries",
	keyPath: "id",
	indexes: ["order", "name", "card"],
};

/**
 * @description 成就系列数据
 * @since Alpha
 * @return {AchievementSeries[]}
 */
export function getData() {
	const data: Map<AchievementSeries> = AppData.achievementSeries;
	return Object.keys(data).map(key => {
		return data[Number(key)];
	});
}
