<template>
	<div v-if="loading">
		<t-loading title="加载中..." />
	</div>
	<div v-else>
		<v-tabs v-model="tab" align-tabs="start" class="global-font">
			<v-tab value="notice" title="公告" />
			<v-tab value="activity" title="活动" />
			<v-tab value="news" title="新闻" />
		</v-tabs>
		<v-window v-model="tab">
			<v-window-item value="notice">
				<div class="News-grid">
					<v-card
						v-for="item in postData.notice"
						class="justify-space-between flex-nowrap"
						width="320"
					>
						<v-img
							:src="item.cover"
							cover
							style="height: 150px"
							@click="toPost(item.post_id)"
						></v-img>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-actions>
							<v-btn @click="toPost(item.post_id)" class="ms-2 card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
						</v-card-actions>
					</v-card>
				</div>
			</v-window-item>
			<v-window-item value="activity">
				<div class="News-grid">
					<v-card
						v-for="item in postData.activity"
						class="justify-space-between flex-nowrap"
						width="320"
					>
						<v-img
							:src="item.cover"
							cover
							style="height: 150px"
							@click="toPost(item.post_id)"
						></v-img>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
						<v-card-actions>
							<v-btn @click="toPost(item.post_id)" class="ms-2 card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
							<v-btn v-if="item.status === 1" color="ms-2 card-btn-0">进行中</v-btn>
							<v-btn v-else-if="item.status === 2" color="ms-2 card-btn-2">已结束</v-btn>
							<v-btn v-else color="ms-2 card-btn-1">评选中</v-btn>
						</v-card-actions>
					</v-card>
				</div>
			</v-window-item>
			<v-window-item value="news">
				<div class="News-grid">
					<v-card
						v-for="item in postData.news"
						class="justify-space-between flex-nowrap"
						width="320"
					>
						<v-img
							:src="item.cover"
							cover
							style="height: 150px"
							@click="toPost(item.post_id)"
						></v-img>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-actions>
							<v-btn @click="toPost(item.post_id)" class="ms-2 card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
						</v-card-actions>
					</v-card>
				</div>
			</v-window-item>
		</v-window>
	</div>
</template>

<script lang="ts" setup>
// @ts-ignore
import "../tools/svg-inject.js";
import { onMounted, ref } from "vue";
import useAppStore from "../store/modules/app";
import {
	MysPostType,
	ResponseNewsList,
	ResponseNews,
	EnumPostType,
	ResponsePost,
	MysPostApi,
	MysNewsApi,
} from "../interface/MysPost";
import { http, fs } from "@tauri-apps/api";
import { createTGWindow } from "../utils/TGWindow";
import { parseMys } from "../utils/MysParse";
import TLoading from "../components/t-loading.vue";

// Store
const appStore = useAppStore();

// 渲染模式
const renderMode = ref(appStore.structureRender);
// loading
const loading = ref(true);

// 接口 todo：考虑放到 interface 文件夹下?
interface CardDataType {
	title: string;
	cover: string;
	post_id: string;
	subtitle: string;
	status?: number;
}

// 数据
const tab = ref("");
const postData = ref({
	notice: [] as CardDataType[],
	activity: [] as CardDataType[],
	news: [] as CardDataType[],
});

onMounted(async () => {
	const noticeRaw: ResponseNewsList = await http
		.fetch(MysNewsApi + EnumPostType.Notice)
		.then(res => res.data as Promise<ResponseNewsList>);
	const activityRaw: ResponseNewsList = await http
		.fetch(MysNewsApi + EnumPostType.Activity)
		.then(res => res.data as Promise<ResponseNewsList>);
	const newsRaw: ResponseNewsList = await http
		.fetch(MysNewsApi + EnumPostType.News)
		.then(res => res.data as Promise<ResponseNewsList>);
	postData.value = {
		notice: transData(noticeRaw, "notice"),
		activity: transData(activityRaw, "activity"),
		news: transData(newsRaw, "news"),
	};
	tab.value = "notice";
	loading.value = false;
});

function transData(rawData: ResponseNewsList, dataType: string): CardDataType[] {
	const cardData: CardDataType[] = [];
	rawData.data.list.map((item: ResponseNews) => {
		const postData: MysPostType = item.post;
		const card: CardDataType = {
			title: postData.subject,
			cover: postData.images.length === 0 ? postData.cover : postData.images[0],
			post_id: postData.post_id,
			subtitle: postData.post_id,
		};
		if (dataType === "activity") {
			card.status = item.news_meta.activity_status;
			const startTime = new Date(Number(item.news_meta.start_at_sec) * 1000).toLocaleDateString();
			const endTime = new Date(Number(item.news_meta.end_at_sec) * 1000).toLocaleDateString();
			card.subtitle = `${startTime} - ${endTime}`;
		}
		return cardData.push(card);
	});
	return cardData;
}
async function toPost(post_id: string) {
	// 获取帖子内容
	const post: MysPostType = await getPost(post_id).then(res => {
		return res.data.post.post;
	});
	let parseDoc: Document;
	// 获取渲染模式
	if (renderMode.value) {
		// 结构化渲染
		parseDoc = parseMys(post.structured_content);
	} else {
		// 原始渲染
		parseDoc = new DOMParser().parseFromString(post.content, "text/html");
	}
	// 将解析后的 doc 保存到 文件
	await fs.writeTextFile(
		`${appStore.dataPath.temp}\\${post_id}.html`,
		parseDoc.documentElement.outerHTML
	);
	const postUrl = `file:\\\\\\${appStore.dataPath.temp}\\${post.post_id}.html`;
	createTGWindow(postUrl, "MysPost", post.subject, 960, 720, false);
}
async function logPost(post_id: string) {
	const post = await getPost(post_id).then(res => {
		return res.data;
	});
	// 将 json 保存到 文件
	await fs.writeTextFile(
		`${appStore.dataPath.temp}\\${post_id}_log.json`,
		JSON.stringify(post, null, 4)
	);
	const logUrl = `file:\\\\\\${appStore.dataPath.temp}\\${post_id}_log.json`;
	// 打开窗口
	createTGWindow(logUrl, "MysPostLog", post_id, 960, 720, false);
}
async function getPost(post_id: string): Promise<ResponsePost> {
	return http
		.fetch(`${MysPostApi}${post_id}`, {
			method: "GET",
			headers: {
				referer: `https://bbs.mihoyo.com/ys/article/${post_id}`,
			},
		})
		.then(res => {
			return res.data as Promise<ResponsePost>;
		});
}
</script>

<style lang="css">
.News-grid {
	font-family: Genshin, serif;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	grid-gap: 20px;
}

.News-grid img {
	transition: all 0.3s linear;
}

.News-grid :hover img {
	cursor: pointer;
	transform: scale(1.1);
	transition: all 0.3s linear;
}

/* card action 内的按钮 */
.card-btn {
	background: #455167 !important;
	color: #faf7e8 !important;
}

.card-btn svg {
	width: 18px;
	height: 18px;
}

.card-btn svg path {
	fill: #faf7e8;
}
/* 进行中 */
.card-btn-0 {
	background: #3c99aa !important;
	color: #faf7e8 !important;
}
/* 评选中 */
.card-btn-1 {
	background: #849cc7 !important;
	color: #faf7e8 !important;
}
/* 已结束 */
.card-btn-2 {
	background: #c7674b !important;
	color: #faf7e8 !important;
}
</style>
