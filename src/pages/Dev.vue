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
import { dialog, fs } from "@tauri-apps/api";
import { SnapHutaoData } from "../plugins/Snap.Hutao";
import {
	Achievement as HutaoAchievement,
	AchievementGoal as HutaoGoal,
} from "../plugins/Snap.Hutao/interface/achievement";
import { PaimonMoeData } from "../plugins/Paimon.moe";
import { AchievementSeries as PaimonSeries } from "../plugins/Paimon.moe/interface/achievement";
import {
	Achievement as TGAchievement,
	AchievementMap as TGAchievementMap,
	AchievementSeries as TGSeries,
	SeriesMap as TGSeriesMap,
} from "../interface/achievements";
import TGMap from "../utils/TGMap";
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
		async initDev() {
			const devStore = useDevStore();
			devStore.showDev = false;
			devStore.magicCount = 0;
		},
		async parseAchievement() {
			const appStore = useAppStore();
			const appDataDir = appStore.devPath.app;
			console.log("正在读取原始数据...");
			// 读取原始数据
			console.log("正在读取 Snap.Hutao 数据库...");
			const hutaoAchievementData: HutaoAchievement[] = SnapHutaoData.Achievement.data;
			console.log("读取胡桃成就数据成功！");
			const hutaoGoalData: HutaoGoal[] = SnapHutaoData.AchievementGoal.data;
			console.log("读取胡桃成就系列数据成功！");
			console.log("正在读取 Paimon.moe 数据库...");
			const paimonSeriesMap: TGMap<PaimonSeries> = new TGMap<PaimonSeries>(
				PaimonMoeData.Achievement.data
			);
			console.log("读取 Paimon.moe 成就数据成功！");
			// 新建目标数据
			console.log("正在生成目标数据...");
			const achievementSeries: TGSeries[] = [];
			const achievement: TGAchievement[] = [];
			// 先解析 Hutao 的成就数据
			console.log("正在解析胡桃成就系列数据...");
			hutaoGoalData.map(hutaoGoalItem => {
				const achievementSeriesItem: TGSeries = {
					id: hutaoGoalItem.Id,
					order: hutaoGoalItem.Order,
					name: hutaoGoalItem.Name,
					card: hutaoGoalItem?.FinishReward?.ID,
				};
				achievementSeries.push(achievementSeriesItem);
			});
			console.log("解析胡桃成就系列数据成功！");
			console.log("正在解析胡桃成就数据...");
			hutaoAchievementData.map(hutaoAchievementItem => {
				const achievementItem: TGAchievement = {
					id: hutaoAchievementItem.Id,
					series: hutaoAchievementItem.Goal,
					order: hutaoAchievementItem.Order,
					name: hutaoAchievementItem.Title,
					description: hutaoAchievementItem.Description,
					reward: hutaoAchievementItem.FinishReward.ID,
					version: "",
					progress: hutaoAchievementItem.Progress,
				};
				achievement.push(achievementItem);
			});
			console.log("解析胡桃成就数据成功！");
			// 再解析 Paimon.moe 的成就数据
			console.log("正在解析 Paimon.moe 成就数据...");
			// 遍历 Paimon.moe 成就数据
			paimonSeriesMap.forEach(paimonSeries => {
				// 寻找成就系列中名称相同的成就系列
				const seriesItem: TGSeries | undefined = achievementSeries.find(
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
								if (seriesItem) {
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
							if (seriesItem) {
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
				if (seriesItem && achievementVersion !== "") {
					seriesItem.version = achievementVersion;
				}
			});
			console.log("解析 Paimon.moe 成就数据成功！");
			//	输出数据
			console.log("正在输出目标数据...");
			// 输出成就系列数据
			console.log("正在输出成就系列数据...");
			await fs.writeFile(
				`${appDataDir}\\achievementSeries.json`,
				JSON.stringify(achievementSeries, null, 4)
			);
			console.log("输出成就系列数据成功！");
			// 输出成就数据
			console.log("正在输出成就数据...");
			await fs.writeFile(
				`${appDataDir}\\achievements.json`,
				JSON.stringify(achievement, null, 4)
			);
			console.log("输出成就数据成功！");
			await dialog.message("文件已导出至 " + appDataDir);
		},
		async mergeAchievement() {
			const appStore = useAppStore();
			const mergeDataDir = appStore.devPath.merge;
			console.log("正在读取原始数据...");
			const oriAchievement = TGAppData.AppData.achievements;
			const oriSeries = TGAppData.AppData.achievementSeries;
			console.log("读取原始数据成功！");
			console.log("正在进行处理...");
			const transSeries: TGMap<TGSeriesMap> = new TGMap<TGSeriesMap>();
			const transAchievement: TGMap<TGAchievementMap> = new TGMap<TGAchievementMap>();
			// 先遍历成就系列生成成就系列数据
			oriSeries.map(oriSeriesItem => {
				transSeries.set(oriSeriesItem.id.toString(), {
					id: oriSeriesItem.id,
					order: oriSeriesItem.order,
					name: oriSeriesItem.name,
					achievements: [],
					total_count: 0,
					completed_count: 0,
				});
			});
			// 遍历成就
			oriAchievement.map(oriAchievementItem => {
				// 生成成就数据
				transAchievement.set(oriAchievementItem.id.toString(), {
					id: oriAchievementItem.id,
					series: oriAchievementItem.series,
					order: oriAchievementItem.order,
					name: oriAchievementItem.name,
					description: oriAchievementItem.description,
					reward: oriAchievementItem.reward,
					completed: false,
				});
				// 默认成就系列是完备的，所以不需要判断成就系列是否存在
				// 更新成就系列数据的 achievements 跟 total_count
				const seriesItem = transSeries.get(oriAchievementItem.series.toString());
				seriesItem.achievements.push(oriAchievementItem.id);
				seriesItem.total_count += 1;
				transSeries.set(oriAchievementItem.series.toString(), seriesItem);
			});
			console.log("处理完成！");
			// 写入文件
			console.log("正在写入文件...");
			console.log("正在写入成就系列数据...");
			await fs.writeTextFile(
				`${mergeDataDir}\\achievementSeries.json`,
				JSON.stringify(transSeries.getMap(), null, 4)
			);
			console.log("写入成就系列数据成功!正在写入成就数据...");
			await fs.writeTextFile(
				`${mergeDataDir}\\achievements.json`,
				JSON.stringify(transAchievement.getMap(), null, 4)
			);
			console.log("写入成就数据成功!");
			await dialog.message("文件已导出至 " + mergeDataDir);
		},
	},
});
</script>

<style lang="css"></style>
