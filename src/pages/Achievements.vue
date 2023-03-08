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
			<!-- 数据合并按钮 -->
			<v-btn @click="mergeJson" prepend-icon="mdi-merge" class="ms-2 bg-green-accent-2">
				合并
			</v-btn>
			<!-- 导出按钮 -->
			<v-btn @click="exportJson" prepend-icon="mdi-export" class="ms-2 bg-green-accent-2">
				导出
			</v-btn>
		</template>
	</v-app-bar>
	<!-- 主体内容 -->
	<!-- 侧边成就系列列表 -->
	<v-layout>
		<!-- 成就列表 -->
		<!-- todo 样式 -->
		<v-container fluid>
			<!--			<v-card>-->
			<!--				<v-card-title>成就列表</v-card-title>-->
			<!--				<v-card-text>-->
			<!--					<v-list>-->
			<!--						<v-list-item v-for="item in achievementsTrans" :key="item.id">-->
			<!--							<v-divider></v-divider>-->
			<!--							<v-list-item-title>成就 ID：{{ item.id }}</v-list-item-title>-->
			<!--							<v-list-item-subtitle-->
			<!--								>成就完成时间： {{ item.time }}</v-list-item-subtitle-->
			<!--							>-->
			<!--						</v-list-item>-->
			<!--					</v-list>-->
			<!--				</v-card-text>-->
			<!--			</v-card>-->
		</v-container>
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
	Achievement as TGAchievement,
	AchievementSeries as TGAchievementSeries,
	AchievementDisplay as TGAchievementDisplay,
	AchievementSeriesDisplay as TGAchievementSeriesDisplay,
} from "../interface/Achievements";

export default defineComponent({
	name: "Achievements",
	data() {
		return {
			// 标题 成就完成数/成就总数 完成率
			title: "" as string,
			// 成就系列列表，用于侧边栏
			seriesList: [] as TGAchievementSeries[],
			// 成就列表-所有
			achievementsAll: [] as TGAchievementDisplay[],
		};
	},
	async mounted() {
		await this.loadData();
	},
	methods: {
		// 导入
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
			// 选中文件
			if (selectedFile) {
				console.log("正在读取本地文件...");
				// 读取应用内文件
				const localRaw: string | false = await UIAF_Oper.importOper.readUIAFData(localPath);
				console.log("读取本地文件成功");
				// 检测文件是否符合 UIAF 格式
				console.log("正在检测文件格式...");
				if (await UIAF_Oper.importOper.checkUIAFData(<string>selectedFile)) {
					await console.log("检测文件格式成功, 开始导入...");
					// 读取选中文件
					const remoteRaw: string | false = await UIAF_Oper.importOper.readUIAFData(
						<string>selectedFile
					);
					console.log("读取选中文件成功，开始解析数据...");
					// 解析数据
					let localData: UIAF_Achievement[] | false = false;
					let remoteData: Achievements;
					if (localRaw !== false) {
						localData = JSON.parse(localRaw);
					}
					await console.log("解析数据成功，开始合并数据...");
					if (localData === false) {
						localData = [];
					}
					if (remoteRaw === false) {
						await dialog.message("文件格式不正确，导入失败");
						return;
					}
					remoteData = JSON.parse(remoteRaw);
					// 数据合并
					const mergedData = await UIAF_Oper.importOper.mergeUIAFData(
						localData,
						remoteData
					);
					if (mergedData === false) {
						await dialog.message("合并数据失败，请检查文件是否符合 UIAF 格式");
						return;
					}
					await console.log("合并数据成功，开始写入数据...");
					// 写入数据
					await fs.writeTextFile(localPath, JSON.stringify(mergedData, null, 2));
					await console.log("写入数据成功，导入完成");
					await console.log("正在刷新数据...");
					// 刷新数据
					await this.flushStore(mergedData.length);
				} else {
					await dialog.message("文件格式不正确，请检查文件是否符合 UIAF 格式");
				}
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
				await fs.writeTextFile(is_save, JSON.stringify(achievements, null, 2));
			}
		},
		// 获取 MergeData
		async mergeJson() {
			const appStore = useAppStore();
			const localPath = appStore.userPath.achievements;
			// 读取用户的 UIAF 数据
			const localRaw: string | false = await UIAF_Oper.importOper.readUIAFData(localPath);
			if (localRaw === false) {
				await dialog.message("读取用户数据失败，请检查文件是否符合 UIAF 格式");
				return;
			}
			const localData: UIAF_Achievement[] = JSON.parse(localRaw);
			// 读取 MergeData
			const mergeAchievementRaw = await fs.readTextFile(appStore.mergePath.achievements);
			const mergeSeriesRaw = await fs.readTextFile(appStore.mergePath.achievementSeries);
			const mergeAchievementData: TGAchievementDisplay[] = JSON.parse(mergeAchievementRaw);
			const mergeSeriesData: TGAchievementSeriesDisplay[] = JSON.parse(mergeSeriesRaw);
			// 遍历 localData，对 MergeData 进行更新
			localData.map(localAchievement => {
				const achievementSingle = mergeAchievementData.find(
					achievement => achievement.id === localAchievement.id
				);
				if (achievementSingle) {
					achievementSingle.completed = true;
					achievementSingle.completed_time = new Date(
						localAchievement.timestamp * 1000
					).toLocaleString();
				}
			});
			// 遍历 mergeSeries 对 mergeSeries 进行更新
			// todo 缺乏拓展性
			mergeSeriesData.map(mergeSeries => {
				let completed = 0;
				// 更新成就
				mergeSeries.achievements.map(achievement => {
					const findAchievement = mergeAchievementData.find(achievementSingle => {
						return achievementSingle.id === achievement.id;
					});
					if (findAchievement) {
						if (findAchievement !== achievement) {
							achievement.completed = findAchievement.completed;
							achievement.completed_time = findAchievement.completed_time;
						}
					}
					if (achievement.completed) {
						completed++;
					}
				});
				// 更新系列
				mergeSeries.completed_count = completed;
			});
			// 写入数据
			await fs.writeTextFile(
				appStore.mergePath.achievements,
				JSON.stringify(mergeAchievementData, null, 4)
			);
			await fs.writeTextFile(
				appStore.mergePath.achievementSeries,
				JSON.stringify(mergeSeriesData, null, 4)
			);
			await dialog.message("合并数据成功");
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
		// 刷新数据
		async flushStore(fin_num: number) {
			const achievementsStore = useAchievementsStore();
			achievementsStore.fin_achievements = fin_num;
			const appStore = useAppStore();
			const localPath = appStore.appPath.achievements;
			const localRaw: string = await fs.readTextFile(localPath);
			const localData: TGAchievement[] = JSON.parse(localRaw);
			achievementsStore.total_achievements = localData.length;
			this.title = this.getTitle();
		},
		// 加载数据
		async loadData() {
			this.title = this.getTitle();
			// this.seriesList = TGAppData.MergeData.achievementSeries;
			// this.achievementsAll = TGAppData.MergeData.achievements;
		},
	},
});
</script>

<style lang="css"></style>
