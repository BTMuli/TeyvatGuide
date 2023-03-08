import {
	Achievement as TypeAchievement,
	AchievementGoal as TypeAchievementGoal,
} from "./interface/achievement";
import Achievement from "./data/Achievement.json";
import AchievementGoal from "./data/AchievementGoal.json";

export const SnapHutaoData = {
	Achievement: {
		name: "Achievement.json",
		data: Achievement as unknown as TypeAchievement[],
	},
	AchievementGoal: {
		name: "AchievementGoal.json",
		data: AchievementGoal as unknown as TypeAchievementGoal[],
	},
};
