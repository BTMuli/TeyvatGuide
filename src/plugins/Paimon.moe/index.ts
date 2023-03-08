import Achievement from "./data/Achievement.json";
import { AchievementJson } from "./interface/achievement";

export const PaimonMoeData = {
	Achievement: {
		name: "Achievement.json",
		data: Achievement as unknown as AchievementJson,
	},
};
