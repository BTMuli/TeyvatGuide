/**
 * @file data init index
 * @description data init index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { Config as NameCardConfig, getData as getNameCardData } from "./nameCard";
import { Config as AchievementConfig, getData as getAchievementData } from "./achievements";
import { Config as SeriesConfig, getData as getSeriesData } from "./achievementSeries";

export const ConfigList = [NameCardConfig, AchievementConfig, SeriesConfig];

export const getDataList = [
	{
		name: "NameCard",
		data: getNameCardData(),
	},
	{
		name: "Achievement",
		data: getAchievementData(),
	},
	{
		name: "AchievementSeries",
		data: getSeriesData(),
	},
];
