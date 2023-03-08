/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import { Achievement, AchievementSeries } from "../../interface/Achievements";

export const AppDataList = [
	{
		name: "achievements.json",
		data: achievements as Achievement[],
	},
	{
		name: "achievementSeries.json",
		data: achievementSeries as AchievementSeries[],
	},
];

export const AppData = {
	achievements: achievements as Achievement[],
	achievementSeries: achievementSeries as AchievementSeries[],
};
