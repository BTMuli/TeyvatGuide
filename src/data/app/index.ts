/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// Data
import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import GCG from "./GCG.json";
import nameCards from "./nameCards.json";
// Interface
import { Achievement, AchievementSeries } from "../../interface/Achievements";
import { Map } from "../../interface/Base";
import { BaseCard } from "../../interface/GCG";
import { NameCard } from "../../interface/NameCard";

export const AppDataList = [
	{
		name: "achievements.json",
		data: achievements as Map<Achievement>,
	},
	{
		name: "achievementSeries.json",
		data: achievementSeries as Map<AchievementSeries>,
	},
	{
		name: "GCG.json",
		data: GCG as BaseCard[],
	},
	{
		name: "nameCards.json",
		data: nameCards as unknown as Map<NameCard[]>,
	},
];

export const AppData = {
	achievements: achievements as Map<Achievement>,
	achievementSeries: achievementSeries as Map<AchievementSeries>,
	GCG: GCG as BaseCard[],
	nameCards: nameCards as unknown as Map<NameCard[]>,
};
