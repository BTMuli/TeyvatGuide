<template>
	<!-- todo 顶部筛选栏 -->
	<div v-if="loading" class="loading-bar">
		<v-progress-circular indeterminate color="primary" />
	</div>
	<div v-else>
		<v-app-bar color="white" class="global-font">
			<v-toolbar-title>卡牌列表</v-toolbar-title>
			<v-spacer></v-spacer>
			<v-text-field
				v-model="search"
				append-icon="mdi-magnify"
				label="搜索"
				single-line
				hide-details
				@click:append="searchCard"
			></v-text-field>
		</v-app-bar>
		<div class="GCG-grid">
			<v-card v-for="item in CardsInfo" :key="item.id" class="card-cls" @click="toOuter(item)">
				<!-- 外部卡牌边框 -->
				<v-img src="/source/GCG/base/bg-normal.webp" class="GCG-border"></v-img>
				<v-img :src="item.icon" class="GCG-cover"></v-img>
				<div class="GCG-content">
					<span>{{ item.name }}</span>
				</div>
			</v-card>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { createTGWindow } from "../utils/TGWindow";
import { ReadAllTGData } from "../utils/TGIndex";
import { BaseCard } from "../interface/GCG";
import { MysContent } from "../interface/MysPost";
import { dialog } from "@tauri-apps/api";

const loading = ref(true);
const search = ref("");
const CardsInfo = ref([] as BaseCard[]);

onMounted(async () => {
	await loadData();
});

async function loadData() {
	CardsInfo.value = await ReadAllTGData("GCG");
	loading.value = false;
}
function toOuter(card: BaseCard) {
	const url = MysContent.replace("content_id", card.id.toString());
	createTGWindow(url, "GCG", card.name, 1600, 900, true);
}
async function searchCard() {
	loading.value = true;
	const res: BaseCard[] = [];
	const allCardsInfo = await ReadAllTGData("GCG");
	allCardsInfo.map(item => (item.name.includes(search.value) ? res.push(item) : null));
	loading.value = false;
	if (res.length == 0) {
		await dialog.message("未找到相关卡牌");
		CardsInfo.value = allCardsInfo;
	} else {
		CardsInfo.value = res;
	}
}
</script>
<style lang="css">
.GCG-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	grid-gap: 10px;
	padding: 10px;
	border-radius: 0 0 10px 10px;
	overflow: hidden;
}

.card-cls {
	position: relative;
	width: 140px;
	height: 240px;
	overflow: hidden;
}

.GCG-border {
	position: absolute;
	top: 0;
	left: 0;
	width: 140px;
	height: 240px;
	overflow: hidden;
}

.GCG-cover {
	position: absolute;
	transition: all 0.3s;
	top: 0;
	left: 0;
	width: 140px;
	height: 240px;
	z-index: -1;
}

.GCG-grid :hover {
	cursor: pointer;
}

.GCG-grid :hover .GCG-cover {
	transform: scale(1.1);
	transition: all 0.3s;
	overflow: hidden;
}

.GCG-content {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 40px;
	background: rgba(0, 0, 0, 0.5);
	color: white;
	display: flex;
	font-size: small;
	font-family: Genshin, serif;
	border-radius: 0 0 10px 10px;
	justify-content: center;
	align-items: center;
}
</style>
