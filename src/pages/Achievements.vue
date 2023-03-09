<template>
	<!-- 顶部操作栏 -->
	<v-app-bar app>
		<template v-slot:prepend>
			<!-- 标题 -->
			<v-card-text class="text-h5">{{ title }}</v-card-text>
		</template>
		<template v-slot:append>
			<!-- 导入按钮 -->
			<v-btn @click="importJson" prepend-icon="mdi-import" class="bg-green-accent-2">
				导入
			</v-btn>
			<!-- 导出按钮 -->
			<v-btn @click="exportJson" prepend-icon="mdi-export" class="ms-2 bg-green-accent-2">
				导出
			</v-btn>
		</template>
	</v-app-bar>
	<!-- 主体内容 考虑 tabs?-->
	<v-layout>
		<!-- 左侧菜单 todo -->
		<!-- 右侧内容 todo -->
	</v-layout>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import useAppStore from "../store/modules/app";
import useAchievementsStore from "../store/modules/achievements";
import UIAF_Oper from "../plugins/UIAF";
import { dialog, fs } from "@tauri-apps/api";
import { UIAF_Achievement, Achievements } from "../plugins/UIAF/interface/UIAF";
import {
	AchievementMap as TGAchievementMap,
	SeriesMap as TGSeriesMap,
} from "../interface/Achievements";
import TGMap from "../utils/TGMap";
import { Map } from "../interface/Base";

export default defineComponent({
	name: "Achievements",
	data() {
		return {
			// 标题 成就完成数/成就总数 完成率
			title: "" as string,
			// 成就系列列表，用于侧边栏
			seriesList: {} as Map<TGSeriesMap>,
			// 成就列表-所有成就的数据
			achievementsList: {} as Map<TGAchievementMap>,
			// 选中的成就系列 id，用于决定右侧显示的成就列表
			selectedSeries: -1 as number,
		};
	},
	async mounted() {
		await this.loadData();
	},
	methods: {
		// 加载数据，数据源：合并后的本地数据
		async loadData() {
			const appStore = useAppStore();
			const achievementsStore = useAchievementsStore();
			const localSeriesPath = appStore.mergePath.achievementSeries;
			const localAchievementsPath = appStore.mergePath.achievements;
			const seriesMap: TGMap<TGSeriesMap> = new TGMap<TGSeriesMap>(
				JSON.parse(await fs.readTextFile(localSeriesPath))
			);
			const achievementsMap: TGMap<TGAchievementMap> = new TGMap<TGAchievementMap>(
				JSON.parse(await fs.readTextFile(localAchievementsPath))
			);
			await achievementsStore.flushData(seriesMap);
			this.title = this.getTitle();
			this.achievementsList = achievementsMap.getMap();
			this.seriesList = seriesMap.getMap();
		},
		// 获取标题
		getTitle() {
			const achievementsStore = useAchievementsStore();
			const achievementsAll = achievementsStore.total_achievements;
			const achievementsDone = achievementsStore.fin_achievements;
			return `成就完成数：${achievementsDone}/${achievementsAll} 完成率：${(
				(achievementsDone / achievementsAll) *
				100
			).toFixed(2)}%`;
		},
		// 导入 UIAF 数据，进行数据合并、刷新
		async importJson() {
			const appStore = useAppStore();
			const localPath = appStore.userPath.achievements;
			const selectedFile = await dialog.open({
				multiple: false,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
			});
			if (selectedFile && (await UIAF_Oper.importOper.checkUIAFData(<string>selectedFile))) {
				const localRaw: string | false = await UIAF_Oper.importOper.readUIAFData(localPath);
				const remoteRaw: string | false = await UIAF_Oper.importOper.readUIAFData(
					<string>selectedFile
				);
				if (remoteRaw === false) {
					await dialog.message("文件格式不正确，导入失败");
					return;
				}
				let remoteData: Achievements = JSON.parse(remoteRaw);
				let localData: UIAF_Achievement[] = JSON.parse(localRaw || "[]");
				// 因为
				const mergeUIAF: UIAF_Achievement[] = await UIAF_Oper.importOper.mergeUIAFData(
					localData,
					remoteData
				);
				await fs.writeTextFile(localPath, JSON.stringify(mergeUIAF, null, 4));
				// 读取本地 mergeData
				const mergeAchievementMap: TGMap<TGAchievementMap> = new TGMap<TGAchievementMap>(
					JSON.parse(await fs.readTextFile(appStore.mergePath.achievements))
				);
				const mergeSeriesMap: TGMap<TGSeriesMap> = new TGMap<TGSeriesMap>(
					JSON.parse(await fs.readTextFile(appStore.mergePath.achievementSeries))
				);
				// 遍历 mergeUIAF，对 mergeData 进行更新
				mergeUIAF.map(UIAF_Item => {
					// 更新成就
					if (mergeAchievementMap.has(UIAF_Item.id)) {
						const achievement = mergeAchievementMap.get(UIAF_Item.id);
						achievement.completed = true;
						achievement.completed_time = new Date(
							UIAF_Item.timestamp * 1000
						).toLocaleString();
						mergeAchievementMap.set(UIAF_Item.id, achievement);
						// 如果成就系列中没有该成就，则添加
						if (!mergeSeriesMap.has(achievement.series)) {
							const series = mergeSeriesMap.get(achievement.series);
							series.achievements.push(achievement.id);
							mergeSeriesMap.set(achievement.series, series);
						}
					}
				});
				// 更新成就系列
				mergeSeriesMap.forEach(seriesMap => {
					let completed = 0;
					seriesMap.achievements.map(achievement => {
						if (mergeAchievementMap.get(achievement).completed) {
							completed++;
						}
					});
					seriesMap.completed_count = completed;
					seriesMap.total_count = seriesMap.achievements.length;
					mergeSeriesMap.set(seriesMap.id, seriesMap);
				});
				// 写入数据
				await fs.writeTextFile(
					appStore.mergePath.achievements,
					JSON.stringify(mergeAchievementMap.getMap(), null, 4)
				);
				await fs.writeTextFile(
					appStore.mergePath.achievementSeries,
					JSON.stringify(mergeSeriesMap.getMap(), null, 4)
				);
				// 刷新数据
				await this.loadData();
			}
		},
		// 导出
		async exportJson() {
			const appStore = useAppStore();
			const localPath = appStore.userPath.achievements;
			await console.log("正在获取 UIAF 数据...");
			const achievements: Achievements = await UIAF_Oper.exportOper.getAchievements(
				localPath
			);
			await console.log("获取 UIAF 数据成功，开始导出...");
			const is_save = await dialog.save({
				filters: [
					{
						name: "achievements",
						extensions: ["json"],
					},
				],
			});
			if (is_save) {
				await fs.writeTextFile(is_save, JSON.stringify(achievements, null, 4));
			}
		},
	},
});
</script>

<style lang="css"></style>
