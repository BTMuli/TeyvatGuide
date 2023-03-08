/**
 * @file utils merge
 * @description utils merge
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { TGAppData } from "../data";
import {
	Achievement as TGAchievement,
	AchievementDisplay as TGAchievementDisplay,
	AchievementSeries as TGAchievementSeries,
	AchievementSeriesDisplay as TGAchievementSeriesDisplay,
} from "../interface/Achievements";
import {
	Achievement as HutaoAchievement,
	AchievementGoal as HutaoAchievementGoal,
} from "../plugins/Snap.Hutao/interface/achievement";
import { SnapHutaoData } from "../plugins/Snap.Hutao";
import {
	AchievementJson as PaimonAchievementJson,
	AchievementSeries as PaimonAchievementSeries,
} from "../plugins/Paimon.moe/interface/achievement";
import { PaimonMoeData } from "../plugins/Paimon.moe";

/**
 * @description 针对 Paimon.moe 跟 Snap.Hutao 的更新更新 AppData
 */
export function updateAppData() {
	// 读取本地数据
	const hutaoAchievementData: HutaoAchievement[] = SnapHutaoData.Achievement.data;
	const hutaoAchievementGoalData: HutaoAchievementGoal[] = SnapHutaoData.AchievementGoal.data;
	const paimonAchievementJsonData: PaimonAchievementJson = PaimonMoeData.Achievement.data;
	// 建立空白数据
	const achievementSeries: TGAchievementSeries[] = [];
	const achievement: TGAchievement[] = [];
	// 数据处理
	// 对 Snap.Hutao 的数据进行处理
	hutaoAchievementGoalData.map(hutaoAchievementGoal => {
		const achievementSeriesItem: TGAchievementSeries = {
			id: hutaoAchievementGoal.Id,
			order: hutaoAchievementGoal.Order,
			name: hutaoAchievementGoal.Name,
			card: hutaoAchievementGoal?.FinishReward?.ID,
		};
		achievementSeries.push(achievementSeriesItem);
	});
	hutaoAchievementData.map(hutaoAchievement => {
		const achievementItem: TGAchievement = {
			id: hutaoAchievement.Id,
			series: hutaoAchievement.Goal,
			order: hutaoAchievement.Order,
			name: hutaoAchievement.Title,
			description: hutaoAchievement.Description,
			reward: hutaoAchievement.FinishReward.ID,
			version: "",
			progress: hutaoAchievement.Progress,
		};
		achievement.push(achievementItem);
	});
	// 对 Paimon.moe 的数据进行处理
	for (let paimonAchievementJsonDataKey in paimonAchievementJsonData) {
		const paimonSeries: PaimonAchievementSeries =
			paimonAchievementJsonData[paimonAchievementJsonDataKey];
		// 寻找成就系列中名称相同的成就系列
		const achievementSeriesItem: TGAchievementSeries | undefined = achievementSeries.find(
			achievementSeriesItem => achievementSeriesItem.name === paimonSeries.name
		);
		// 成就版本-暂存
		let achievementVersion: string = "";
		paimonSeries.achievements.map(paimonAchievementItem => {
			// 判断是不是数组
			if (Array.isArray(paimonAchievementItem)) {
				paimonAchievementItem.map(paimonAchievement => {
					// 查找成就中 id 相同的成就
					const achievementItem: TGAchievement | undefined = achievement.find(
						achievementItem => achievementItem.id === paimonAchievement.id
					);
					if (achievementItem) {
						// 更新数据
						achievementItem.version = paimonAchievement.ver;
						if (achievementSeriesItem) {
							if (achievementVersion === "") {
								achievementVersion = paimonAchievement.ver;
							} else {
								// 比较 v1.1 和 v1.2 的大小
								if (achievementVersion < paimonAchievement.ver) {
									achievementVersion = paimonAchievement.ver;
								}
							}
						}
					}
				});
			} else {
				// 查找成就中 id 相同的成就
				const achievementItem: TGAchievement | undefined = achievement.find(
					achievementItem => achievementItem.id === paimonAchievementItem.id
				);
				if (achievementItem) {
					// 更新数据
					achievementItem.version = paimonAchievementItem.ver;
					if (achievementSeriesItem) {
						if (achievementVersion === "") {
							achievementVersion = paimonAchievementItem.ver;
						} else {
							// 比较 v1.1 和 v1.2 的大小
							if (achievementVersion < paimonAchievementItem.ver) {
								achievementVersion = paimonAchievementItem.ver;
							}
						}
					}
				}
			}
		});
		// 更新成就系列版本
		if (achievementSeriesItem && achievementVersion !== "") {
			achievementSeriesItem.version = achievementVersion;
		}
		// 更新本地数据
		TGAppData.AppData.achievements = achievement;
		TGAppData.AppData.achievementSeries = achievementSeries;
	}
}

/**
 * @description 针对 AppData 的更新来更新 MergeData
 */
export function updateMergeData() {
	const oriAchievement = TGAppData.AppData.achievements;
	const oriSeries = TGAppData.AppData.achievementSeries;
	const transSeries: TGAchievementSeriesDisplay[] = [];
	const transAchievement: TGAchievementDisplay[] = [];
	oriSeries.map(oriSeriesItem => {
		// 查找成就中 series_id 与 oriAchievementSeriesItem.id 相同的成就
		const achievementItem: TGAchievement[] = oriAchievement.filter(
			oriAchievementItem => oriAchievementItem.series === oriSeriesItem.id
		);
		const transAchievementDisplay: TGAchievementDisplay[] = [];
		// 处理成就数据
		achievementItem.map(singleAchievement => {
			const transAchievementDisplayItem: TGAchievementDisplay = {
				id: singleAchievement.id,
				order: singleAchievement.order,
				name: singleAchievement.name,
				description: singleAchievement.description,
				reward: singleAchievement.reward,
				completed: false,
			};
			transAchievement.push(transAchievementDisplayItem);
			transAchievementDisplay.push(transAchievementDisplayItem);
		});
		// 生成成就系列数据
		const seriesDisplayItem: TGAchievementSeriesDisplay = {
			id: oriSeriesItem.id,
			order: oriSeriesItem.order,
			name: oriSeriesItem.name,
			achievements: transAchievementDisplay,
			total_count: achievementItem.length,
			completed_count: 0,
		};
		transSeries.push(seriesDisplayItem);
	});
	// 对成就系列按照 order 进行排序
	transSeries.sort((a, b) => {
		return a.order - b.order;
	});
	// 对成就按照 order 进行排序
	transAchievement.sort((a, b) => {
		return a.order - b.order;
	});
	// 更新 MergeData
	TGAppData.MergeData.achievementSeries = transSeries;
	TGAppData.MergeData.achievements = transAchievement;
}
