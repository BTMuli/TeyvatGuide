<template>
	<v-list class="position-card">
		<v-list-item>
			<v-list-item-title style="color: #fec90b; margin-left: 10px; font-family: Genshin, serif">
				<img src="../assets/icons/board.svg" alt="act" class="position-act-icon" />
				近期活动
			</v-list-item-title>
			<div v-if="loading">
				<t-loading :title="loadingTitle" :empty="loadingEmpty" position="relative" />
			</div>
			<div v-else class="position-grid">
				<v-card
					v-for="card in positionCards"
					style="background: #faf7e8; color: #546d8b; border-radius: 10px"
				>
					<v-list style="background: #faf7e8; color: #546d8b">
						<v-list-item :title="card.title" :subtitle="card.abstract">
							<template v-slot:prepend>
								<v-avatar rounded="0" @click="toPost(card)" style="cursor: pointer">
									<v-img :src="card.icon" style="border-radius: 10px" />
								</v-avatar>
							</template>
						</v-list-item>
					</v-list>
					<v-divider class="border-opacity-75"></v-divider>
					<v-card-text>
						<span style="width: 60%">
							<v-icon>mdi-calendar-clock</v-icon>
							{{ card.time.start }}~{{ card.time.end }}
						</span>
					</v-card-text>
					<v-card-actions>
						<span style="width: 80%; margin-left: 10px">
							<v-icon>mdi-clock-outline</v-icon>
							剩余时间：
							<span style="color: #90caf9">{{ positionTimeGet[card.post_id] }}</span>
						</span>
						<v-btn @click="toPost(card)" class="card-btn">
							<template v-slot:prepend>
								<img src="../assets/icons/circle-check.svg" alt="check" />查看
							</template>
						</v-btn>
					</v-card-actions>
				</v-card>
			</div>
		</v-list-item>
	</v-list>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import TLoading from "./t-loading.vue";
// utils
import { createTGWindow } from "../utils/TGWindow";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { PositionCard } from "../plugins/Mys/interface/position";
import { Map } from "../interface/Base";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载近期活动");
const loadingEmpty = ref(false as boolean);

// 数据
const positionCards = ref([] as PositionCard[]);
const positionTimeGet = ref({} as Map<string>);
const positionTimeEnd = ref({} as Map<number>);
const router = useRouter();

onMounted(async () => {
	try {
		loadingTitle.value = "正在获取近期活动数据";
		const positionData = await MysOper.Position.get();
		if (!positionData) {
			loadingEmpty.value = true;
			loadingTitle.value = "暂无近期活动";
			return;
		}
		loadingEmpty.value = false;
		loadingTitle.value = "正在渲染近期活动";
		positionCards.value = MysOper.Position.card(positionData);
		positionCards.value.forEach(card => {
			positionTimeGet.value[card.post_id] = getLastPositionTime(card.time.end_stamp - Date.now());
			positionTimeEnd.value[card.post_id] = card.time.end_stamp;
		});
		await setInterval(() => {
			positionCards.value.forEach(card => {
				positionTimeGet.value[card.post_id] = getLastPositionTime(card.time.end_stamp - Date.now());
			});
		}, 1000);
	} catch (error) {
		console.error(error);
		return;
	} finally {
		loading.value = false;
	}
});

function getLastPositionTime(time: number) {
	const day = Math.floor(time / (24 * 3600 * 1000));
	const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
	const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
	const second = Math.floor((time % (60 * 1000)) / 1000);
	return `${day}天 ${hour.toFixed(0).padStart(2, "0")}:${minute
		.toFixed(0)
		.padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

async function toPost(card: PositionCard) {
	const post_id = card.post_id;
	// 获取路由路径
	const path = router.resolve({
		name: "帖子详情",
		params: {
			post_id: post_id,
		},
	}).href;
	// 打开新窗口
	createTGWindow(path, "近期活动", card.title, 960, 720, false);
}
</script>

<style lang="css" scoped>
.position-act-icon {
	width: 20px;
	height: 20px;
	display: inline-block;
}

.position-card {
	margin-top: 10px;
	font-family: "Genshin", serif;
	background: #546d8b;
	border-radius: 10px;
}

.position-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(400px, 1fr));
	grid-gap: 20px;
	margin-top: 10px;
}
</style>
