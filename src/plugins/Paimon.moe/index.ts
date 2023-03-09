/**
 * @file plugins Paimon.moe index.ts
 * @description Paimon.moe 插件的入口文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import Achievement from "./data/Achievement.json";
import { AchievementSeries } from "./interface/achievement";
import { Map } from "../../interface/Base";

export const PaimonMoeData = {
	Achievement: {
		name: "Achievement.json",
		data: Achievement as unknown as Map<AchievementSeries>,
	},
};
