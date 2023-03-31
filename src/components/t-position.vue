<template>
	<v-list class="position-card">
		<v-list-item>
			<v-list-item-title style="color: #fec90b; margin-left: 10px; font-family: Genshin, serif"
				>近期活动</v-list-item-title
			>
			<div class="position-grid">
				<v-card
					v-for="card in positionCards"
					style="background: #2d2f33; color: #f4d8a8; border-radius: 10px"
				>
					<v-list style="background: #2d2f33; color: #f4d8a8">
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
import { createTGWindow } from "../utils/TGWindow";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { PositionCard } from "../plugins/Mys/interface/position";
import { Map } from "../interface/Base";

// loading
const loading = ref(true as boolean);

// 数据
const positionCards = ref([] as PositionCard[]);
const positionTimeGet = ref({} as Map<string>);
const positionTimeEnd = ref({} as Map<number>);
const router = useRouter();

onMounted(async () => {
	try {
		const positionData = await MysOper.Position.get();
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
	createTGWindow(path, "祈愿", card.title, 960, 720, false);
}
</script>

<style lang="css">
.position-card {
	margin: 0 10px;
	font-family: "Genshin-Light", serif;
	background: rgba(0, 0, 0, 0.5);
	border-radius: 10px;
}

.position-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
	grid-gap: 20px;
	padding: 10px;
}
</style>
