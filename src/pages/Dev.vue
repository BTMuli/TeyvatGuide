<template>
	<h1>开发</h1>
	<v-card>
		<v-list>
			<v-list-item @click="initDev()" prepend-icon="mdi-refresh">
				<v-list-item-title>初始化开发</v-list-item-title>
			</v-list-item>
			<v-list-item @click="parseAchievement()" prepend-icon="mdi-export">
				<v-list-item-title>解析成就数据</v-list-item-title>
			</v-list-item>
			<v-list-item @click="mergeAchievement()" prepend-icon="mdi-export">
				<v-list-item-title>合并成就数据</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import useDevStore from "../store/modules/dev";
import useAppStore from "../store/modules/app";
import { fs } from "@tauri-apps/api";
import { SnapHutaoData } from "../plugins/Snap.Hutao";
import {
	Achievement as HutaoAchievement,
	AchievementGoal as HutaoAchievementGoal,
} from "../plugins/Snap.Hutao/interface/achievement";
import { PaimonMoeData } from "../plugins/Paimon.moe";
import {
	AchievementJson as PaimonAchievementJson,
	AchievementSeries as PaimonAchievementSeries,
} from "../plugins/Paimon.moe/interface/achievement";
import {
	Achievement as TGAchievement,
	AchievementSeries as TGAchievementSeries,
	AchievementSeriesDisplay as TGAchievementSeriesDisplay,
	AchievementDisplay as TGAchievementDisplay,
} from "../interface/achievements";
import { TGAppData } from "../data";

export default defineComponent({
	name: "Dev",
	data() {
		return {
			originRaw: {
				Hutao: "" as string,
				Paimon: "" as string,
			},
		};
	},
	methods: {
		initDev() {
			const devStore = useDevStore();
			devStore.showDev = false;
			devStore.magicCount = 0;
		},
		async parseAchievement() {
			const appStore = useAppStore();
			const appDataDir = appStore.dataPath.app;
			console.log("正在读取原始数据...");
			// 读取原始数据
			console.log("正在读取 Snap.Hutao 数据库...");
			const hutaoAchievementData: HutaoAchievement[] = SnapHutaoData.Achievement.data;
			console.log("读取胡桃成就数据成功！");
			const hutaoAchievementGoalData: HutaoAchievementGoal[] =
				SnapHutaoData.AchievementGoal.data;
			console.log("读取胡桃成就系列数据成功！");
			console.log("正在读取 Paimon.moe 数据库...");
			const paimonAchievementJsonData: PaimonAchievementJson = PaimonMoeData.Achievement.data;
			console.log("读取 Paimon.moe 成就数据成功！");
			// 新建目标数据
			console.log("正在生成目标数据...");
			const achievementSeries: TGAchievementSeries[] = [];
			const achievement: TGAchievement[] = [];
			// 先解析 Hutao 的成就数据
			console.log("正在解析胡桃成就系列数据...");
			hutaoAchievementGoalData.map(hutaoAchievementGoal => {
				const achievementSeriesItem: TGAchievementSeries = {
					id: hutaoAchievementGoal.Id,
					order: hutaoAchievementGoal.Order,
					name: hutaoAchievementGoal.Name,
					card: hutaoAchievementGoal?.FinishReward?.ID,
				};
				achievementSeries.push(achievementSeriesItem);
			});
			console.log("解析胡桃成就系列数据成功！");
			console.log("正在解析胡桃成就数据...");
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
			console.log("解析胡桃成就数据成功！");
			// 再解析 Paimon.moe 的成就数据
			console.log("正在解析 Paimon.moe 成就数据...");
			for (let paimonAchievementJsonDataKey in paimonAchievementJsonData) {
				const paimonSeries: PaimonAchievementSeries =
					paimonAchievementJsonData[paimonAchievementJsonDataKey];
				// 寻找成就系列中名称相同的成就系列
				const achievementSeriesItem: TGAchievementSeries | undefined =
					achievementSeries.find(
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
			}
			console.log("解析 Paimon.moe 成就数据成功！");
			//	输出数据
			console.log("正在输出目标数据...");
			// 输出成就系列数据
			console.log("正在输出成就系列数据...");
			await fs.writeFile(
				`${appDataDir}\\achievementSeries.json`,
				JSON.stringify(achievementSeries, null, 2)
			);
			console.log("输出成就系列数据成功！");
			// 输出成就数据
			console.log("正在输出成就数据...");
			await fs.writeFile(
				`${appDataDir}\\achievements.json`,
				JSON.stringify(achievement, null, 2)
			);
			console.log("输出成就数据成功！");
		},
		async mergeAchievement() {
			const appStore = useAppStore();
			const mergeDataDir = appStore.dataPath.merge;
			console.log("正在读取原始数据...");
			const oriAchievement = TGAppData.achievements;
			const oriAchievementSeries = TGAppData.achievementSeries;
			console.log("读取原始数据成功！");
			console.log("正在进行处理...");
			// 处理成就系列数据
			console.log("正在处理成就系列数据...");
			const transAchievementSeries: TGAchievementSeriesDisplay[] = [];
			const transAchievement: TGAchievementDisplay[] = [];
			oriAchievementSeries.map(oriAchievementSeriesItem => {
				// 查找成就中 series_id 与 oriAchievementSeriesItem.id 相同的成就
				const achievementItem: TGAchievement[] = oriAchievement.filter(
					oriAchievementItem => oriAchievementItem.series === oriAchievementSeriesItem.id
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
					id: oriAchievementSeriesItem.id,
					order: oriAchievementSeriesItem.order,
					name: oriAchievementSeriesItem.name,
					achievements: transAchievementDisplay,
					total_count: achievementItem.length,
					completed_count: 0,
				};
				transAchievementSeries.push(seriesDisplayItem);
			});
			// 对成就系列按照 order 进行排序
			transAchievementSeries.sort((a, b) => {
				return a.order - b.order;
			});
			// 对成就按照 order 进行排序
			transAchievement.sort((a, b) => {
				return a.order - b.order;
			});
			// 写入文件
			console.log("正在写入文件...");
			console.log("正在写入成就系列数据...");
			await fs.writeTextFile(
				`${mergeDataDir}\\achievementSeries.json`,
				JSON.stringify(transAchievementSeries, null, 2)
			);
			console.log("写入成就系列数据成功!正在写入成就数据...");
			await fs.writeTextFile(
				`${mergeDataDir}\\achievements.json`,
				JSON.stringify(transAchievement, null, 2)
			);
			console.log("写入成就数据成功!");
		},
	},
});
</script>

<style lang="css"></style>
