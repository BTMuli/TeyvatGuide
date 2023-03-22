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
		<div class="cards-grid">
			<v-card v-for="item in CardsInfo" :key="item.id" width="280" height="480">
				<!-- 外部卡牌边框 -->
				<v-img src="/source/GCG/base/bg-normal.webp" class="GCG-cover"></v-img>
				<v-img :src="item.icon" class="GCG-cover" style="z-index: -1"></v-img>
				<!-- todo 样式优化 -->
				<v-card-actions class="GCG-content">
					<span>{{ item.name }}</span>
					<v-btn @click="toOuter(item)" prepend-icon="mdi-arrow-right-circle" class="ms-2 card-btn"
						>查看</v-btn
					>
				</v-card-actions>
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
.cards-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	grid-gap: 1rem;
	padding: 1rem;
}
.GCG-cover {
	position: absolute;
	top: 0;
	left: 0;
	width: 280px;
	height: 480px;
}
.GCG-content {
	position: absolute;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	color: #f4d8a8;
	font-size: 20px;
	width: 100%;
	border-radius: 0 0 10px 10px;
}
</style>
