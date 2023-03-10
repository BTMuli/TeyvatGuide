<template>
	<!-- 顶部操作栏 -->
	<v-app-bar app>
		<template v-slot:prepend>
			<!-- 标题 -->
			<v-card-text class="text-h5">{{ title }}</v-card-text>
		</template>
		<template v-slot:append>
			<!-- 导入按钮 -->
			<v-btn @click="importJson" prepend-icon="mdi-import" class="bg-green-accent-2"> 导入 </v-btn>
			<!-- 导出按钮 -->
			<v-btn @click="exportJson" prepend-icon="mdi-export" class="ms-2 bg-green-accent-2">
				导出
			</v-btn>
		</template>
	</v-app-bar>
	<!-- todo 列表加载速度优化，主要是天地万象的数据量太大了 -->
	<v-row class="wrap-view">
		<!-- 左侧菜单 -->
		<v-col class="left-wrap">
			<v-card
				class="left-list"
				v-for="series in seriesList"
				:key="series.order"
				@click="selectSeries(series.id)"
				style="margin-bottom: 10px"
			>
				<v-list>
					<v-list-item prepend-icon="mdi-trophy-outline">
						<v-list-item-title>{{ series.name }}</v-list-item-title>
						<v-list-item-subtitle
							>{{ series.completed_count }} / {{ series.total_count }}</v-list-item-subtitle
						>
					</v-list-item>
				</v-list>
			</v-card>
		</v-col>
		<!-- 右侧内容-->
		<v-col cols="9" class="right-wrap">
			<div class="right-list">
				<v-card
					v-for="achievement in selectedSeries === -1
						? achievementsList
						: selectedAchievement[selectedSeries]"
					:key="achievement.id"
					style="margin-bottom: 10px"
				>
					<v-list>
						<v-list-item prepend-icon="mdi-trophy-variant-outline">
							<v-list-item-title>{{ achievement.name }}</v-list-item-title>
							<v-list-item-subtitle>{{
								achievement.completed ? achievement.completed_time : achievement.description
							}}</v-list-item-subtitle>
							<template v-slot:append>
								<v-btn variant="flat" disabled>
									<template v-slot:append>
										<img
											src="src/source/material/原石.png"
											alt="原石"
											class="icon"
											style="width: 32px"
										/>
									</template>
									测试
								</v-btn>
							</template>
						</v-list-item>
					</v-list>
				</v-card>
			</div>
		</v-col>
	</v-row>
</template>

<script lang="ts" setup>
import useAppStore from "../store/modules/app";
import useAchievementsStore from "../store/modules/achievements";
import UIAF_Oper from "../plugins/UIAF";
import { dialog, fs } from "@tauri-apps/api";
import { Achievements, UIAF_Achievement } from "../plugins/UIAF/interface/UIAF";
import {
	AchievementMap as TGAchievementMap,
	SeriesMap as TGSeriesMap,
} from "../interface/Achievements";
import TGMap from "../utils/TGMap";
import { Map } from "../interface/Base";
import { onMounted, ref } from "vue";

// Store
const appStore = useAppStore();
const achievementsStore = useAchievementsStore();

// Data
const title = ref("");
const seriesList = ref({} as Map<TGSeriesMap>);
const achievementsList = ref({} as Map<TGAchievementMap>);
const selectedSeries = ref(-1);
const selectedAchievement = ref({} as Map<Array<TGAchievementMap>>);

onMounted(() => {
	loadData();
});

// 加载数据，数据源：合并后的本地数据
async function loadData() {
	const mergeAchievementMap: TGMap<TGAchievementMap> = new TGMap<TGAchievementMap>(
		JSON.parse(await fs.readTextFile(appStore.mergePath.achievements))
	);
	const mergeSeriesMap: TGMap<TGSeriesMap> = new TGMap<TGSeriesMap>(
		JSON.parse(await fs.readTextFile(appStore.mergePath.achievementSeries))
	);
	seriesList.value = mergeSeriesMap.getMap();
	achievementsList.value = mergeAchievementMap.getMap();
	selectedAchievement.value = transGroup(mergeSeriesMap, mergeAchievementMap);
	achievementsStore.flushData(mergeSeriesMap);
	title.value = await getTitle();
}
// 将所有成就分组
function transGroup(seriesMap: TGMap<TGSeriesMap>, achievementsMap: TGMap<TGAchievementMap>) {
	const transList = {} as Map<Array<TGAchievementMap>>;
	seriesMap.forEach(series => {
		transList[series.id] = [];
	});
	achievementsMap.forEach(achievement => {
		transList[achievement.series].push(achievement);
	});
	return transList;
}
// 渲染选中的成就系列
function selectSeries(series_id: number) {
	selectedSeries.value = series_id;
}
// 获取标题
async function getTitle() {
	return `成就完成数：${achievementsStore.fin_achievements}/${
		achievementsStore.total_achievements
	} 完成率：${(
		(achievementsStore.fin_achievements / achievementsStore.total_achievements) *
		100
	).toFixed(2)}%`;
}
// 导入 UIAF 数据，进行数据合并、刷新
async function importJson() {
	const mergeAchievementMap: TGMap<TGAchievementMap> = new TGMap<TGAchievementMap>(
		JSON.parse(await fs.readTextFile(appStore.mergePath.achievements))
	);
	const mergeSeriesMap: TGMap<TGSeriesMap> = new TGMap<TGSeriesMap>(
		JSON.parse(await fs.readTextFile(appStore.mergePath.achievementSeries))
	);
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
		const remoteRaw: string | false = await UIAF_Oper.importOper.readUIAFData(<string>selectedFile);
		if (remoteRaw === false) {
			await dialog.message("文件格式不正确，导入失败");
			return;
		}
		let remoteData: Achievements = JSON.parse(remoteRaw);
		let localData: UIAF_Achievement[] = JSON.parse(localRaw || "[]");
		const mergeUIAF: UIAF_Achievement[] = await UIAF_Oper.importOper.mergeUIAFData(
			localData,
			remoteData
		);
		await fs.writeTextFile(localPath, JSON.stringify(mergeUIAF));
		// 遍历 mergeUIAF，对 mergeData 进行更新
		mergeUIAF.map(UIAF_Item => {
			// 更新成就
			if (mergeAchievementMap.has(UIAF_Item.id)) {
				const achievement = mergeAchievementMap.get(UIAF_Item.id);
				achievement.completed = true;
				achievement.completed_time = new Date(UIAF_Item.timestamp * 1000).toLocaleString();
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
			JSON.stringify(mergeAchievementMap.getMap())
		);
		await fs.writeTextFile(
			appStore.mergePath.achievementSeries,
			JSON.stringify(mergeSeriesMap.getMap())
		);
		// 刷新数据
		await loadData();
	}
}
// 导出
async function exportJson() {
	const achievements: Achievements = await UIAF_Oper.exportOper.getAchievements(
		appStore.userPath.achievements
	);
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
}
</script>

<style lang="css">
/*内容区域*/
.wrap-view {
	overflow: auto;
	height: 840px;
	border-bottom: 2px solid #e6e6e6;
}
/*左侧系列*/
.left-wrap {
	height: 100%;
	overflow: auto;
}

/*右侧成就*/
.right-wrap {
	height: 100%;
	overflow: auto;
}
</style>
