<template>
	<v-list class="Position-card">
		<v-list-item>
			<v-list-item-title style="color: #fec90b">
				近期活动 <span v-show="loading"><v-progress-circular indeterminate color="blue" /></span>
			</v-list-item-title>
			<div v-show="!loading" class="Position-grid">
				<v-card class="Position-single" v-for="card in postionCards">
					<v-card-title>
						<v-list class="single-list">
							<v-list-item>
								<template v-slot:prepend>
									<v-avatar>
										<v-img :src="card.icon" />
									</v-avatar>
								</template>
								<v-list-item-title>{{ card.title }}</v-list-item-title>
								<v-list-item-subtitle>{{ card.abstract }}</v-list-item-subtitle>
							</v-list-item>
						</v-list>
					</v-card-title>
					<v-divider></v-divider>
					<v-card-text>
						<span style="width: 60%">
							<v-icon>mdi-calendar-clock</v-icon>
							{{ card.create_time }}~{{ transTime(card.end_time) }}
						</span>
					</v-card-text>
					<v-card-actions>
						<span style="width: 80%; margin-left: 10px">
							<v-icon>mdi-clock-outline</v-icon>
							剩余时间：
							<span style="color: #90caf9">{{ lastTime[card.end_time] }}</span>
						</span>
						<v-btn @click="toPost(card)" class="ms-2 card-btn mr-2">
							<template v-slot:prepend>
								<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
							</template>
							查看
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
// utils
import TGMap from "../utils/TGMap";
import { createTGWindow } from "../utils/TGWindow";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { PositionCard } from "../plugins/Mys/interface/position";
import { Map } from "../interface/Base";

// loading
const loading = ref(true as boolean);

// 数据
const postionCards = ref([] as PositionCard[]);
const lastTime = ref({} as Map<string>);
const router = useRouter();

onMounted(async () => {
	try {
		const positionData = await MysOper.Position.get();
		postionCards.value = MysOper.Position.card(positionData);
		const time: Map<string> = {};
		postionCards.value.forEach(card => {
			time[Number(card.end_time)] = getLastTime(Number(card.end_time) - Date.now());
		});
		lastTime.value = time;
		setInterval(() => {
			const timeMap = new TGMap(lastTime.value);
			timeMap.forEach((value, key) => {
				timeMap.set(key, getLastTime(Number(key) - Date.now()));
			});
		}, 1000);
	} catch (error) {
		console.error(error);
		return;
	} finally {
		loading.value = false;
	}
});

function transTime(time: string) {
	return new Date(Number(time))
		.toLocaleString("zh-CN", {
			hour12: false,
		})
		.replace(/\//g, "-");
}

function getLastTime(time: number) {
	const day = Math.floor(time / (24 * 3600 * 1000));
	const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
	const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
	const second = Math.floor((time % (60 * 1000)) / 1000);
	return `${day}天 ${hour.toFixed(0).padStart(2, "0")}:${minute
		.toFixed(0)
		.padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

async function toPost(card: PositionCard) {
	const post_id = card.url.split("/").pop();
	// 获取路由路径
	const path = router.resolve({
		name: "帖子详情",
		params: {
			post_id: post_id,
		},
	}).href;
	// 打开新窗口
	createTGWindow(path, "活动", card.title, 960, 720, false);
}
</script>

<style lang="css">
.Position-card {
	margin: 0 10px;
	font-family: "Genshin", serif;
	background: rgba(0, 0, 0, 0.5);
	border-radius: 10px;
}

.Position-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
	grid-gap: 20px;
	padding: 10px;
}

.Position-single {
	background: rgba(0, 0, 0, 0.5);
	border-radius: 10px;
}
</style>
