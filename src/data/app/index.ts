/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import nameCard from "./nameCard.json";
import { Achievement, AchievementSeries } from "../../interface/Achievements";
import { NameCard } from "../../interface/NameCard";
import { Map } from "../../interface/Base";

export const AppDataList = [
	{
		name: "achievements.json",
		data: achievements as Achievement[],
	},
	{
		name: "achievementSeries.json",
		data: achievementSeries as AchievementSeries[],
	},
	{
		name: "nameCard.json",
		data: nameCard as unknown as Map<NameCard>,
	},
];

export const AppData = {
	achievements: achievements as Achievement[],
	achievementSeries: achievementSeries as AchievementSeries[],
	nameCard: nameCard as unknown as Map<NameCard>,
};
