<template>
	<div v-if="loading" class="loading-bar">
		<v-progress-circular indeterminate color="primary" />
	</div>
	<div v-else>
		<div v-if="empty">
			<!-- todo 放个空白图 -->
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
					<div class="Home-pool-cover" @click="toPost(pool.post_id)">
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
	</div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import useAppStore from "../store/modules/app";
import { fs, http } from "@tauri-apps/api";
import { createTGWindow } from "../utils/TGWindow";
import {
	ResponseGachaPool,
	ResponsePost,
	MysPostApi,
	MysGachaInfo,
	MysPostType,
} from "../interface/MysPost";
import { parseMys } from "../utils/MysParse";

interface GachaPool {
	title: string;
	subtitle: string;
	cover: string;
	post_id: string;
	characters: {
		icon: string;
		url: string;
	}[];
	voice: {
		icon: string;
		url: string;
	};
	time: {
		start: string;
		end: string;
	};
}

const appStore = useAppStore();
const renderMode = ref(appStore.structureRender);
const poolInfo = ref([] as GachaPool[]);
const loading = ref(true);
const empty = ref(false);
const timeGet = ref("");
const timePass = ref(0);

onMounted(async () => {
	const responseGachaPool = await http
		.fetch<ResponseGachaPool>(MysGachaInfo, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})
		.then(response => {
			return response.data.data.list;
		});
	// 如果没有卡池信息则不进行后续操作
	if (responseGachaPool.length === 0) {
		loading.value = false;
		empty.value = true;
		return;
	}
	empty.value = false;
	responseGachaPool.map(async gachaPool => {
		// 获取卡池 article post_id
		const post_id = gachaPool.activity_url.split("/").pop();
		if (!post_id) return;
		const gachaCover = await http
			.fetch<ResponsePost>(MysPostApi + post_id, {
				method: "GET",
				headers: {
					referer: `https://bbs.mihoyo.com/ys/article/${post_id}`,
				},
			})
			.then(response => {
				return response.data.data.post.post.images[0];
			});
		poolInfo.value.push({
			title: gachaPool.title,
			subtitle: gachaPool.content_before_act,
			post_id: post_id,
			cover: gachaCover,
			characters: gachaPool.pool.map(character => ({
				icon: character.icon,
				url: character.url,
			})),
			voice: {
				icon: gachaPool.voice_icon,
				url: gachaPool.voice_url,
			},
			time: {
				start: gachaPool.start_time,
				end: gachaPool.end_time,
			},
		});
		getTimeNow(gachaPool.start_time, gachaPool.end_time);
		setInterval(() => {
			loading.value = false;
		}, 1000);
	});
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

async function toPost(post_id: string) {
	// 获取帖子内容
	const post: MysPostType = await http
		.fetch(`${MysPostApi}${post_id}`, {
			method: "GET",
			headers: {
				referer: `https://bbs.mihoyo.com/ys/article/${post_id}`,
			},
		})
		.then(res => {
			return res.data as Promise<ResponsePost>;
		})
		.then(res => {
			return res.data.post.post;
		});
	// 结构化渲染
	const parseDoc = parseMys(post.structured_content);
	// 将解析后的 doc 保存到 文件
	await fs.writeTextFile(
		`${appStore.dataPath.temp}\\${post_id}_home.html`,
		parseDoc.documentElement.outerHTML
	);
	const postUrl = `file:\\\\\\${appStore.dataPath.temp}\\${post.post_id}_home.html`;
	createTGWindow(postUrl, "祈愿卡池", post.subject, 960, 720, false);
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
}

.Home-pool-cover {
	width: 690px;
	height: auto;
	margin-bottom: 10px;
	overflow: hidden;
}

.Home-pool-cover img {
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
	margin-left: 120px;
	float: right;
	font-size: small;
	height: 80px;
}
</style>
