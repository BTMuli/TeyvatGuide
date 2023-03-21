<template>
	<div v-if="poolInfo == null || poolInfo.length === 0" class="loading-bar">
		<v-progress-circular indeterminate color="primary" />
	</div>
	<div v-else class="pool-cards">
		<v-card v-for="pool in poolInfo" style="margin-top: 20px">
			<template v-slot:prepend>
				<img
					src="../assets/icons/note-wish-circle.svg"
					alt="wish"
					style="width: 32px; height: auto; margin-right: 10px; float: left"
				/>
				<v-card-title style="display: inline-block">{{ pool.title }}</v-card-title>
			</template>
			<!-- 卡池封面 -->
			<v-row style="margin-left: 10px">
				<img :src="pool.cover" alt="cover" style="height: 340px; width: auto; margin-top: 10px" />
				<v-col style="margin: auto 10px">
					<div v-for="character in pool.characters">
						<!-- todo 点击事件不生效	 -->
						<img
							:src="character.icon"
							style="width: 80px; height: 80px"
							alt="character"
							@click="toOuter(character.url, pool.title)"
						/>
					</div>
				</v-col>
			</v-row>
			<v-card-subtitle class="pt-4">{{ pool.subtitle }}</v-card-subtitle>
			<!-- todo 样式美化 -->
			<v-card-text>
				<span style="width: 60%">
					<v-icon>mdi-calendar-clock</v-icon>
					{{ pool.time.start }}~{{ pool.time.end }}
				</span>
				<span style="width: 30%">
					<audio :src="pool.voice.url" controls />
				</span>
				<v-img
					:src="pool.voice.icon"
					width="80px"
					height="80px"
					alt="voice"
					style="padding-bottom: 20px; float: right"
				/>
			</v-card-text>
		</v-card>
	</div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { http } from "@tauri-apps/api";
import { createTGWindow } from "../utils/TGWindow";
import { ResponseGachaPool, ResponsePost, MysPostApi, MysGachaInfo } from "../interface/MysPost";

interface GachaPool {
	title: string;
	subtitle: string;
	cover: string;
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

const poolInfo = ref([] as GachaPool[]);

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
	responseGachaPool.map(async gachaPool => {
		// 获取卡池 article post_id
		const post_id = gachaPool.activity_url.split("/").pop();
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
	});
});

function toOuter(url: string, title: string) {
	createTGWindow(url, title, title, 960, 720, true);
}
</script>

<style lang="css">
.pool-cards {
	font-family: Genshin, serif;
	display: flex;
	flex-direction: column;
	align-items: center;
}
</style>
