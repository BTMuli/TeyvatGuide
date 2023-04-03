<template>
	<v-list class="pool-card">
		<v-list-item>
			<v-list-item-title style="color: #fec90b; margin-left: 10px; font-family: Genshin, serif">
				<img src="../assets/icons/icon-wish.svg" alt="wish" class="pool-wish-icon" />
				限时祈愿</v-list-item-title
			>
			<div v-if="!loading" class="pool-grid">
				<v-card
					v-for="pool in poolCards"
					style="background: #faf7e8; color: #546d8b; border-radius: 10px"
				>
					<v-list style="background: #faf7e8; color: #546d8b">
						<v-list-item :title="pool.title" :subtitle="pool.subtitle">
							<template v-slot:prepend>
								<v-img
									:src="pool.voice.icon"
									style="transform: translate(0, -10px); width: 60px; height: 60px"
								/>
							</template>
							<template v-slot:append>
								<audio :src="pool.voice.url" controls />
							</template>
						</v-list-item>
					</v-list>
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
								width="10"
								color="#90caf9"
							>
								{{ poolTimeGet[pool.post_id] }}
							</v-progress-circular>
						</div>
					</div>
					<v-card-text>
						<span style="width: 60%">
							<v-icon>mdi-calendar-clock</v-icon>
							{{ pool.time.start }}~{{ pool.time.end }}
						</span>
					</v-card-text>
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
import { GachaCard } from "../plugins/Mys/interface/gacha";
import { Map } from "../interface/Base";

// vue
const router = useRouter();

// loading
const loading = ref(true as boolean);

// data
const poolCards = ref([] as GachaCard[]);
const poolTimeGet = ref({} as Map<string>);
const poolTimePass = ref({} as Map<number>);

// expose
defineExpose({
	name: "限时祈愿",
	loading,
});

onMounted(async () => {
	const gachaData = await MysOper.Gacha.get();
	if (!gachaData) {
		await console.error("获取限时祈愿数据失败");
		return;
	}
	poolCards.value = await MysOper.Gacha.card(gachaData);
	poolCards.value.map(pool => {
		poolTimeGet.value[pool.post_id] = getLastPoolTime(pool.time.end_stamp - Date.now());
		poolTimePass.value[pool.post_id] = pool.time.end_stamp - Date.now();
	});
	await setInterval(() => {
		poolCards.value.map(pool => {
			poolTimeGet.value[pool.post_id] = getLastPoolTime(pool.time.end_stamp - Date.now());
			poolTimePass.value[pool.post_id] =
				((pool.time.end_stamp - Date.now()) / (pool.time.end_stamp - pool.time.start_stamp)) * 100;
		});
	}, 1000);
	loading.value = false;
});

function toOuter(url: string, title: string) {
	createTGWindow(url, "祈愿", title, 1200, 800, true);
}

function getLastPoolTime(time: number) {
	const hour = Math.floor(time / 1000 / 60 / 60);
	const minute = Math.floor((time / 1000 / 60 / 60 - hour) * 60);
	const second = Math.floor(((time / 1000 / 60 / 60 - hour) * 60 - minute) * 60);
	return `${hour}:${minute.toFixed(0).padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
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
	createTGWindow(path, "限时祈愿", pool.title, 960, 720, false);
}
</script>

<style lang="css" scoped>
.pool-wish-icon {
	width: 20px;
	height: 20px;
	display: inline-block;
}

.pool-card {
	font-family: "Genshin", serif;
	width: 100%;
	background: #546d8b;
	border-radius: 10px;
	margin-top: 10px;
}

.pool-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
	grid-gap: 20px;
	margin-top: 10px;
}

.pool-cover {
	margin: 0 20px 10px;
	width: calc(100% - 40px);
	height: auto;
	overflow: hidden;
	border-radius: 10px;
	display: flex;
	justify-content: center;
	align-items: center;
}

.pool-cover img {
	width: 100%;
	transition: all 0.5s;
	border-radius: 10px;
}

.pool-cover :hover {
	cursor: pointer;
	transform: scale(1.1);
	transition: all 0.5s;
}

.pool-character {
	margin: 0 20px;
	width: 100%;
	height: 80px;
	display: flex;
}

.pool-character img {
	border-radius: 10px;
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
