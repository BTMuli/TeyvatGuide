<template>
	<div v-if="loading">
		<t-loading :title="loadingTitle" />
	</div>
	<div v-else>
		<div v-if="poolEmpty">
			<v-card class="pool-card">
				<v-card-title>暂无卡池信息</v-card-title>
			</v-card>
		</div>
		<div class="pool-cards" v-else>
			<v-card v-for="pool in poolCards" class="pool-card">
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
					<div class="pool-cover" @click="toPost(pool)">
						<img :src="pool.cover" alt="cover" />
					</div>
					<div class="pool-character">
						<div v-for="character in pool.characters" @click="toOuter(character.url, pool.title)">
							<img :src="character.icon" class="pool-icon" alt="character" />
						</div>
						<div class="pool-clock">
							<v-progress-circular
								:model-value="poolTimePass[pool.post_id]"
								size="100"
								color="blue-lighten-3"
								width="10"
							>
								{{ poolTimeGet[pool.post_id] }}
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
// plugin
import MysOper from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import { GachaCard } from "../plugins/Mys/interface/gacha";
import { Map } from "../interface/Base";
import TPosition from "../components/t-position.vue";

// vue
const router = useRouter();

// loading
const loading = ref(true);
const loadingTitle = ref("加载中...");
const poolEmpty = ref(false);

// data
const poolCards = ref([] as GachaCard[]);
const poolTimeGet = ref({} as Map<string>);
const poolTimePass = ref({} as Map<number>);

onMounted(async () => {
	loadingTitle.value = "正在获取卡池信息...";
	const gachaData = await MysOper.Gacha.get();
	if (!gachaData || gachaData.length === 0) {
		poolEmpty.value = true;
		loadingTitle.value = "暂无卡池信息";
	}
	loadingTitle.value = "正在渲染卡池信息...";
	poolCards.value = await MysOper.Gacha.card(gachaData);
	poolCards.value.map(pool => {
		poolTimeGet.value[pool.post_id] = getLastPoolTime(pool.time.end_stamp - Date.now());
		poolTimePass.value[pool.post_id] = pool.time.end_stamp - Date.now();
	});
	await setInterval(() => {
		poolCards.value.map(pool => {
			poolTimeGet.value[pool.post_id] = getLastPoolTime(pool.time.end_stamp - Date.now());
			poolTimePass.value[pool.post_id] = (pool.time.end_stamp - Date.now()) / (pool.time.end_stamp - pool.time.start_stamp) * 100;
		});
	}, 1000);
	loading.value = false;
});

function getLastPoolTime(time: number) {
	const hour = Math.floor(time / 1000 / 60 / 60);
	const minute = Math.floor((time / 1000 / 60 / 60 - hour) * 60);
	const second = Math.floor(((time / 1000 / 60 / 60 - hour) * 60 - minute) * 60);
	return `${hour}:${minute.toFixed(0).padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
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

.pool-card {
	margin: 10px;
}

.Home-pool {
	margin-left: 10px;
	margin-right: 10px;
}

.pool-cover {
	width: 690px;
	height: auto;
	margin-bottom: 10px;
	overflow: hidden;
}

.pool-cover img {
	width: 100%;
	height: auto;
	transition: all 0.5s;
}

.pool-cover :hover {
	cursor: pointer;
	transform: scale(1.1);
	transition: all 0.5s;
}

.pool-character {
	width: 100%;
	height: 80px;
	display: flex;
}

.pool-icon {
	width: 80px;
	height: 80px;
	margin: 0 10px;
}

.pool-character :hover .pool-icon {
	cursor: pointer;
}

.pool-clock {
	width: auto;
	margin-left: 40px;
	float: right;
	font-size: small;
	height: 80px;
}
</style>
