<template>
	<!-- 顶部操作栏 -->
	<v-app-bar app>
		<template v-slot:prepend>
			<!-- 标题 -->
			<v-card-text class="top-title">{{ title }}</v-card-text>
		</template>
		<v-spacer></v-spacer>
		<v-text-field
			v-model="search"
			append-icon="mdi-magnify"
			label="搜索"
			single-line
			hide-details
			@click:append="searchCard"
			@keyup.enter="searchCard"
		></v-text-field>
		<v-spacer></v-spacer>
		<template v-slot:append>
			<!-- 导入按钮 -->
			<v-btn @click="importJson" prepend-icon="mdi-import" class="ms-2 top-btn">导入</v-btn>
			<!-- 导出按钮 -->
			<v-btn @click="exportJson" prepend-icon="mdi-export" class="ms-2 top-btn"> 导出 </v-btn>
		</template>
	</v-app-bar>
	<div v-if="loading">
		<t-loading title="正在加载成就" />
	</div>
	<div v-else class="wrap">
		<v-row class="wrap-view">
			<!-- 左侧菜单 -->
			<v-col class="left-wrap">
				<v-card
					v-for="(series, index) in seriesList"
					@click="selectSeries(index)"
					style="margin-bottom: 10px"
				>
					<v-list class="card-bg-left">
						<v-list-item>
							<template v-slot:prepend>
								<v-img width="40px" style="margin-right: 10px" :src="series.icon" />
							</template>
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
				<v-card
					v-show="selectedIndex !== -1 && selectedSeries !== 0 && selectedSeries !== 17"
					style="margin-bottom: 10px"
					@click="openImg()"
				>
					<v-list
						:style="{
							backgroundImage: 'url(' + getCardInfo.bg || null + ')',
							backgroundPosition: 'right',
							backgroundSize: 'auto 100%',
							backgroundRepeat: 'no-repeat',
						}"
					>
						<v-list-item>
							<template v-slot:prepend>
								<v-img width="80px" style="margin-right: 10px" :src="getCardInfo.icon" />
							</template>
							<v-list-item-title>{{ getCardInfo.name }}</v-list-item-title>
							<v-list-item-subtitle>{{ getCardInfo.description }}</v-list-item-subtitle>
						</v-list-item>
					</v-list>
				</v-card>
				<v-card
					v-for="achievement in selectedAchievement"
					:key="achievement.id"
					style="margin-bottom: 10px"
				>
					<v-list class="card-bg-right">
						<v-list-item>
							<template v-slot:prepend>
								<v-icon :color="achievement.completed ? '#FFD22F' : '#393B40'">
									{{ achievement.completed ? "mdi-check-circle" : "mdi-circle" }}
								</v-icon>
							</template>
							<v-list-item-title>
								{{ achievement.name }}
								{{ achievement.progress !== 0 ? "| " + achievement.progress : null }}
							</v-list-item-title>
							<v-list-item-subtitle>{{ achievement.description }}</v-list-item-subtitle>
							<template v-slot:append>
								<span v-show="achievement.completed" class="right-time">{{
									achievement.completed_time
								}}</span>
								<v-card class="reward-card" @click="showMaterial('/source/material/原石.webp')">
									<v-img src="/source/material/原石.webp" sizes="32" />
									<div class="reward-num">
										<span>{{ achievement.reward }}</span>
									</div>
								</v-card>
							</template>
						</v-list-item>
					</v-list>
				</v-card>
			</v-col>
		</v-row>
	</div>
</template>

<script lang="ts" setup>
// Node
import { dialog, fs } from "@tauri-apps/api";
import { onMounted, ref } from "vue";
// Store
import useAchievementsStore from "../store/modules/achievements";
// Interface
import { Achievements, UIAF_Info, UIAF_Achievement } from "../plugins/UIAF/interface/UIAF";
import {
	Achievement as TGAchievement,
	AchievementSeries as TGSeries,
} from "../interface/Achievements";
import { NameCard } from "../interface/NameCard";
// Plugins
import UIAF_Oper from "../plugins/UIAF";
// Utils
import { createTGWindow } from "../utils/TGWindow";
import {
	ReadAllTGData,
	ReadTGDataByIndex,
	ReadTGDataByKey,
	UpdateTGDataByKey,
} from "../utils/TGIndex";
import TLoading from "../components/t-loading.vue";

// Store
const achievementsStore = useAchievementsStore();

// Data
const title = ref(achievementsStore.title);
const seriesList = ref([] as TGSeries[]);
const selectedIndex = ref(-1);
const selectedSeries = ref(-1);
const selectedAchievement = ref([] as TGAchievement[]);
const CardsInfo = ref([] as NameCard[]);
const getCardInfo = ref({} as NameCard);
const search = ref("");
const loading = ref(true);

onMounted(async () => {
	await loadData();
});

// 加载数据，数据源：合并后的本地数据
async function loadData() {
	const seriesDB: TGSeries[] = await ReadAllTGData("AchievementSeries");
	CardsInfo.value = await ReadTGDataByIndex("NameCard", "type", 1);
	// 按照 order 排序
	seriesList.value = seriesDB.sort((a, b) => a.order - b.order);
	const getAchievements = await ReadAllTGData("Achievements");
	// 未完成的排在前面
	getAchievements.sort((a, b) => {
		if (a.completed === b.completed) {
			return a.id - b.id;
		} else {
			return a.completed ? 1 : -1;
		}
	});
	selectedAchievement.value = getAchievements;
	loading.value = false;
	title.value = achievementsStore.title;
}
// 渲染选中的成就系列
async function selectSeries(index: number) {
	loading.value = true;
	const getAchievements = await ReadTGDataByIndex(
		"Achievements",
		"series",
		seriesList.value[index].id
	);
	selectedIndex.value = index;
	selectedSeries.value = seriesList.value[index].id;
	let getCard: NameCard;
	if (selectedSeries.value !== 0 && selectedSeries.value !== 17) {
		getCard = CardsInfo.value.find(card => card.name === seriesList.value[index].card)!;
	} else {
		getCard = {} as NameCard;
	}
	// 未完成的排在前面
	getAchievements.sort((a, b) => {
		if (a.completed === b.completed) {
			return a.id - b.id;
		} else {
			return a.completed ? 1 : -1;
		}
	});
	selectedAchievement.value = getAchievements;
	getCardInfo.value = getCard;
	loading.value = false;
}
// 打开图片
function openImg() {
	createTGWindow(getCardInfo.value.profile, "nameCard", getCardInfo.value.name, 840, 400, false);
}
function showMaterial(path: string) {
	createTGWindow(path, "material", "原石", 256, 256, false);
}
async function searchCard() {
	if (search.value === "") {
		await dialog.message("请输入关键字");
		return;
	}
	loading.value = true;
	const res: TGAchievement[] = [];
	const allAchievements = await ReadAllTGData("Achievements");
	allAchievements.map(achievement => {
		if (achievement.name.includes(search.value) || achievement.description.includes(search.value)) {
			res.push(achievement);
		}
	});
	selectedIndex.value = -1;
	search.value = "";
	loading.value = false;
	if (res.length === 0) {
		await dialog.message("没有找到相关成就");
		selectedAchievement.value = allAchievements;
	} else {
		res.sort((a, b) => {
			if (a.completed === b.completed) {
				return a.id - b.id;
			} else {
				return a.completed ? 1 : -1;
			}
		});
		selectedAchievement.value = res;
	}
}
// 导入 UIAF 数据，进行数据合并、刷新
async function importJson() {
	const selectedFile = await dialog.open({
		multiple: false,
		filters: [
			{
				name: "JSON",
				extensions: ["json"],
			},
		],
	});
	if (selectedFile && (await UIAF_Oper.checkUIAFData(<string>selectedFile))) {
		const remoteRaw: string | false = await UIAF_Oper.readUIAFData(<string>selectedFile);
		if (remoteRaw === false) {
			await dialog.message("文件格式不正确，导入失败");
			return;
		}
		let remoteData: Achievements = JSON.parse(remoteRaw);
		// loading
		loading.value = true;
		// 遍历 remoteData
		remoteData.list.map(async data => {
			// 获取 id
			const id = data.id;
			let localData: TGAchievement = (await ReadTGDataByKey("Achievements", [id]))[0];
			// 获取 timeStamp 2023-03-15 00:00:00
			const localTime = localData.completed_time;
			// 如果本地数据不存在，或者本地数据的 timeStamp 小于远程数据的 timeStamp，更新数据
			if (data.timestamp !== 0) {
				const fin_time = new Date(data.timestamp * 1000).toLocaleString("zh", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				});
				if (fin_time !== localTime || localData.progress !== data.current) {
					localData.completed_time = fin_time;
					localData.progress = data.current;
					localData.completed = true;
					// 更新数据
					await UpdateTGDataByKey("Achievements", localData);
				}
			} else {
				if (localData.progress !== data.current) {
					localData.completed_time = "";
					localData.progress = data.current;
					localData.completed = false;
					// 更新数据
					await UpdateTGDataByKey("Achievements", localData);
				}
			}
		});
		// 更新成就系列的完成数
		const seriesDB = await ReadAllTGData("AchievementSeries");
		seriesDB.map(async data => {
			const seriesId = data.id;
			const achievementsDB = await ReadTGDataByIndex("Achievements", "series", seriesId);
			data.completed_count = achievementsDB.filter(data => {
				return data.completed === true;
			}).length;
			await UpdateTGDataByKey("AchievementSeries", data);
		});
		const achievementsDB = await ReadAllTGData("Achievements");
		const fin_achievements = achievementsDB.filter(data => {
			return data.completed === true;
		}).length;
		const total_achievements = achievementsDB.length;
		achievementsStore.flushData(total_achievements, fin_achievements);
		// 刷新数据
		await loadData();
	}
}
// 导出
async function exportJson() {
	// 判断是否有数据
	if (achievementsStore.fin_achievements === 0) {
		await dialog.message("没有数据可以导出");
		return;
	}
	// 获取本地数据
	const achievements = (await ReadAllTGData("Achievements")).filter(data => {
		return data.progress !== 0 || data.completed === true;
	});
	let UIAF_DATA = {
		info: {} as UIAF_Info,
		list: [] as UIAF_Achievement[],
	};
	// 转换数据
	UIAF_DATA.list = achievements.map(data => {
		let status;
		// 计算点数但是没有完成
		if (data.progress !== 0 && data.completed === false) {
			status = 1;
			// 已完成且未计算点数
		} else if (data.progress === 0 && data.completed === true) {
			status = 2;
			// 已完成且已计算点数
		} else if (data.progress !== 0 && data.completed === true) {
			status = 3;
		} else {
			status = 0;
		}
		return {
			id: data.id,
			timestamp: data.completed ? Math.round(new Date(data.completed_time).getTime() / 1000) : 0,
			current: data.progress,
			status: status,
		};
	});
	UIAF_DATA.info = await UIAF_Oper.getUIAFInfo();
	const is_save = await dialog.save({
		filters: [
			{
				name: "achievements",
				extensions: ["json"],
			},
		],
	});
	if (is_save) {
		await fs.writeTextFile(is_save, JSON.stringify(UIAF_DATA));
	}
}
</script>

<style lang="css">
/* 顶部标题 */
.top-title {
	font-family: Genshin, "serif";
	font-size: 30px;
}
/* 顶部按钮 */
.top-btn {
	font-family: Genshin, "serif";
	background: #393b40;
	color: #f4d8a8 !important;
}

/* 内容区域 */
.wrap-view {
	overflow: auto;
	height: 840px;
	border-bottom: 2px solid #e6e6e6;
	font-family: Genshin, "serif";
}

/* 卡片背景 */
.card-bg-left {
	background-image: linear-gradient(90deg, #ffffff 0%, #5c6474 150%);
}

.card-bg-right {
	background-image: linear-gradient(90deg, #ffffff 0%, #393b40 150%);
}

/* 左侧系列 */
.left-wrap {
	height: 100%;
	overflow: auto;
}

/* 右侧成就 */
.right-wrap {
	height: 100%;
	overflow: auto;
}

/* 成就完成时间 */
.right-time {
	margin-right: 10px;
	font-size: small;
	color: #393b40;
}

/* 成就奖励 */
.reward-card {
	position: relative;
	width: 32px;
	height: 42px;
	background: #414244;
	border-radius: 5px;
}

.reward-num {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 15px;
	background: rgba(255, 255, 255, 0.1);
	color: #ffffff;
	display: flex;
	font-size: 10px;
	font-family: Genshin, serif;
	border-radius: 0 0 5px 5px;
	justify-content: center;
	align-items: center;
}
</style>
