<template>
	<div v-if="loading">
		<t-loading title="正在加载卡池信息" />
	</div>
	<div v-else>
		<div v-if="empty">
			<t-loading title="暂无卡池信息" empty />
		</div>
		<div v-else class="pool-cards">
			<v-card v-for="pool in poolInfo" class="Home-card">
				<template v-slot:prepend>
					<v-img
						:src="pool.voice.icon"
						width="80px"
						height="80px"
						alt="voice"
						style="display: inline-block"
					/>
					<v-card-title style="display: inline-block">{{ pool.title }}</v-card-title>
				</template>
				<template v-slot:append>
					<audio :src="pool.voice.url" controls />
				</template>
				<!-- 卡池封面 -->
				<v-row class="Home-pool">
					<div class="Home-pool-cover" @click="toPost(pool)">
						<img :src="pool.cover" alt="cover" />
					</div>
					<div class="Home-pool-character">
						<div v-for="character in pool.characters" @click="toOuter(character.url, pool.title)">
							<img :src="character.icon" class="Home-pool-icon" alt="character" />
						</div>
						<div class="Home-pool-clock">
							<v-progress-circular
								:model-value="timePass"
								size="100"
								color="blue-lighten-3"
								width="10"
							>
								{{ timeGet }}
							</v-progress-circular>
						</div>
					</div>
				</v-row>
				<v-card-subtitle class="pt-4">{{ pool.subtitle }}</v-card-subtitle>
				<v-card-text>
					<span style="width: 60%">
						<v-icon>mdi-calendar-clock</v-icon>
						{{ pool.time.start }}~{{ pool.time.end }}
					</span>
				</v-card-text>
			</v-card>
		</div>
		<t-position />
	</div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import TLoading from "../components/t-loading.vue";
import TPosition from "../components/t-position.vue";
// plugin
import MysOper from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import { GachaData, GachaCard } from "../plugins/Mys/interface/gacha";

const router = useRouter();
const poolInfo = ref([] as GachaCard[]);
const loading = ref(true);
const empty = ref(false);
const timeGet = ref("");
const timePass = ref(0);

onMounted(async () => {
	const responseGachaPool: GachaData[] = await MysOper.Gacha.get();
	const start_time = responseGachaPool[0].start_time;
	const end_time = responseGachaPool[0].end_time;
	// 如果没有卡池信息则不进行后续操作
	if (responseGachaPool.length === 0) {
		loading.value = false;
		empty.value = true;
		return;
	}
	empty.value = false;
	poolInfo.value = await MysOper.Gacha.card(responseGachaPool);
	getTimeNow(start_time, end_time);
	setInterval(() => {
		loading.value = false;
	}, 1000);
});

function getTimeNow(start_time: string, end_time: string) {
	setInterval(() => {
		const start = new Date(start_time);
		const now = new Date();
		const end = new Date(end_time);
		const time = end.getTime() - now.getTime();
		// 截断，取 0.000%
		timePass.value = (time / (end.getTime() - start.getTime())) * 100;
		const hour = Math.floor(time / 1000 / 60 / 60);
		const minute = Math.floor((time / 1000 / 60 / 60 - hour) * 60);
		const second = Math.floor(((time / 1000 / 60 / 60 - hour) * 60 - minute) * 60);
		timeGet.value = `${hour}:${minute.toFixed(0).padStart(2, "0")}:${second
			.toFixed(0)
			.padStart(2, "0")}`;
	}, 1000);
}

function toOuter(url: string, title: string) {
	createTGWindow(url, "祈愿", title, 1200, 800, true);
}

async function toPost(pool: GachaCard) {
	// 获取路由路径
	const path = router.resolve({
		name: "帖子详情",
		params: {
			post_id: pool.post_id.toString(),
		},
	}).href;
	// 打开新窗口
	createTGWindow(path, "祈愿", pool.title, 960, 720, false);
}
</script>

<style lang="css">
.pool-cards {
	font-family: Genshin, serif;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.Home-card {
	margin: 10px;
}

.Home-pool {
	margin-left: 10px;
	margin-right: 10px;
}

.Home-pool-cover {
	width: 690px;
	height: auto;
	margin-bottom: 10px;
	overflow: hidden;
}

.Home-pool-cover img {
	width: 100%;
	height: auto;
	transition: all 0.5s;
}

.Home-pool-cover :hover {
	cursor: pointer;
	transform: scale(1.1);
	transition: all 0.5s;
}

.Home-pool-character {
	width: 100%;
	height: 80px;
	display: flex;
}

.Home-pool-icon {
	width: 80px;
	height: 80px;
	margin: 0 10px;
}

.Home-pool-character :hover .Home-pool-icon {
	cursor: pointer;
}

.Home-pool-clock {
	width: auto;
	margin-left: 40px;
	float: right;
	font-size: small;
	height: 80px;
}
</style>
