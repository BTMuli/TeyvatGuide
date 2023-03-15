/**
 * @file data init index
 * @description data init index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { Config as NameCardConfig, getData as getNameCardData } from "./nameCard";
import { Config as AchievementsConfig, getData as getAchievementsData } from "./achievements";
import { Config as SeriesConfig, getData as getSeriesData } from "./achievementSeries";

export const ConfigList = [NameCardConfig, AchievementsConfig, SeriesConfig];

export const getDataList = [
	{
		name: "NameCard",
		data: getNameCardData(),
	},
	{
		name: "Achievements",
		data: getAchievementsData(),
	},
	{
		name: "AchievementSeries",
		data: getSeriesData(),
	},
];
