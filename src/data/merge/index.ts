/**
 * @file data merge index
 * @description data merge index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import { AchievementMap, SeriesMap } from "../../interface/Achievements";
import { Map } from "../../interface/Base";

export const MergeDataList = [
	{
		name: "achievements.json",
		data: achievements as unknown as Map<AchievementMap>,
	},
	{
		name: "achievementSeries.json",
		data: achievementSeries as unknown as Map<SeriesMap>,
	},
];

export const MergeData = {
	achievements: achievements as unknown as Map<AchievementMap>,
	achievementSeries: achievementSeries as unknown as Map<SeriesMap>,
};
