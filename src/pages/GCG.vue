<template>
	<div v-if="loading">
		<t-loading title="正在加载卡牌列表" />
	</div>
	<div v-else>
		<v-tabs v-model="tab" align-tabs="start" class="global-font">
			<div v-show="!doSearch">
				<v-tab value="character" title="角色牌" />
				<v-tab value="action" title="行动牌" />
				<v-tab value="monster" title="魔物牌" />
			</div>
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
		</v-tabs>
		<div v-if="!doSearch">
			<v-window v-model="tab">
				<v-window-item value="character">
					<div class="GCG-grid">
						<v-card
							v-for="item in CardsInfoC"
							:key="item.id"
							class="card-cls"
							@click="toOuter(item.name, item.id)"
						>
							<div class="GCG-border">
								<img src="/source/GCG/base/bg-normal.webp" alt="border" />
							</div>
							<div class="GCG-cover">
								<img :src="item.icon.normal" alt="cover" />
							</div>
							<div class="GCG-content">
								<span>{{ item.name }}</span>
							</div>
						</v-card>
					</div>
				</v-window-item>
				<v-window-item value="action">
					<div class="GCG-grid">
						<v-card
							v-for="item in CardsInfoA"
							:key="item.id"
							class="card-cls"
							@click="toOuter(item.name, item.id)"
						>
							<div class="GCG-border">
								<img src="/source/GCG/base/bg-normal.webp" alt="border" />
							</div>
							<div class="GCG-cover">
								<img :src="item.icon.normal" alt="cover" />
							</div>
							<div class="GCG-content">
								<span>{{ item.name }}</span>
							</div>
						</v-card>
					</div>
				</v-window-item>
				<v-window-item value="monster">
					<div class="GCG-grid">
						<v-card
							v-for="item in CardsInfoM"
							:key="item.id"
							class="card-cls"
							@click="toOuter(item.name, item.id)"
						>
							<div class="GCG-border">
								<img src="/source/GCG/base/bg-normal.webp" alt="border" />
							</div>
							<div class="GCG-cover">
								<img :src="item.icon.normal" alt="cover" />
							</div>
							<div class="GCG-content">
								<span>{{ item.name }}</span>
							</div>
						</v-card>
					</div>
				</v-window-item>
			</v-window>
		</div>
		<div v-else>
			<div class="GCG-grid">
				<div
					v-for="item in CardsInfoS"
					:key="item.id"
					class="card-cls"
					@click="toOuter(item.name, item.id)"
				>
					<div class="GCG-border">
						<img src="/source/GCG/base/bg-normal.webp" alt="border" />
					</div>
					<div class="GCG-cover">
						<img :src="item.icon.normal" alt="cover" />
					</div>
					<div class="GCG-content">
						<span>{{ item.name }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import TLoading from "../components/t-loading.vue";
// tauri
import { dialog } from "@tauri-apps/api";
// utils
import { createTGWindow } from "../utils/TGWindow";
import { ReadAllTGData } from "../utils/TGIndex";
// interface
import { BaseCard, ActionCard, CharacterCard, MonsterCard } from "../interface/GCG";
import { OBC_CONTENT_API } from "../plugins/Mys/interface/utils";

const loading = ref(true);
const doSearch = ref(false);
const search = ref("");
const tab = ref("character");
const CardsInfoC = ref([] as CharacterCard[]);
const CardsInfoA = ref([] as ActionCard[]);
const CardsInfoM = ref([] as MonsterCard[]);
const CardsInfoS = ref([] as BaseCard[]);

onMounted(async () => {
	await loadData();
});

async function loadData() {
	const CardsInfo = await ReadAllTGData("GCG");
	CardsInfoC.value = CardsInfo.filter(item => item.type == "角色牌") as CharacterCard[];
	CardsInfoA.value = CardsInfo.filter(item => item.type == "行动牌") as ActionCard[];
	CardsInfoM.value = CardsInfo.filter(item => item.type == "魔物牌") as MonsterCard[];
	loading.value = false;
}
function toOuter(card_name: string, card_id: number) {
	const url = OBC_CONTENT_API.replace("{content_id}", card_id.toString());
	createTGWindow(url, "GCG", card_name, 1200, 800, true);
}
async function searchCard() {
	loading.value = true;
	doSearch.value = true;
	const res: BaseCard[] = [];
	const allCardsInfo = await ReadAllTGData("GCG");
	allCardsInfo.map(item => (item.name.includes(search.value) ? res.push(item) : null));
	res.sort((a, b) => a.name.localeCompare(b.name));
	loading.value = false;
	if (res.length == 0) {
		await dialog.message("未找到相关卡牌");
		doSearch.value = false;
	} else {
		CardsInfoS.value = res;
	}
}
</script>
<style lang="css" scoped>
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
	transition: all 0.3s;
	border-radius: 10px;
}

.card-cls:hover .GCG-cover {
	transform: scale(1.1);
	transition: all 0.3s;
}

.GCG-border {
	position: absolute;
	border-radius: 10px;
	top: 0;
	left: 0;
	overflow: hidden;
}

.GCG-border img {
	width: 100%;
	height: 100%;
	border-radius: 10px;
}

.GCG-cover {
	position: absolute;
	transition: all 0.3s;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: -1;
}

.GCG-cover img {
	width: 100%;
	height: 100%;
	border-radius: 10px;
	object-fit: cover;
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
	overflow: hidden;
	font-family: Genshin, serif;
	border-radius: 0 0 10px 10px;
	justify-content: center;
	align-items: center;
}
</style>
