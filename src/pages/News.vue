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
							<v-btn @click="toJson(item.post_id)" class="ms-2 card-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								JSON
							</v-btn>
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
							<div v-show="!appStore.devMode">
								<v-btn v-show="item.status === ActivityStatus.STARTED" color="ms-2 card-btn-0"
									>进行中</v-btn
								>
								<v-btn v-show="item.status === ActivityStatus.FINISHED" color="ms-2 card-btn-2"
									>已结束</v-btn
								>
								<v-btn v-show="item.status === ActivityStatus.SELECTION" color="ms-2 card-btn-1"
									>评选中</v-btn
								>
							</div>
							<v-btn @click="toJson(item.post_id)" class="ms-2 card-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								JSON
							</v-btn>
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
							<v-btn @click="toJson(item.post_id)" class="ms-2 card-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
			</v-window-item>
		</v-window>
	</div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TLoading from "../components/t-loading.vue";
// tauri
import { http, fs } from "@tauri-apps/api";
// store
import useAppStore from "../store/modules/app";
// tools
// @ts-ignore
import "../tools/svg-inject.js";
// plugin
import Mys_Oper from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import {
	Post,
	PostResponse,
	POST_FULL_API,
	POST_FULL_REFERER,
} from "../plugins/Mys/interface/post";
import {
	NewsResponse,
	NewsType,
	NEWS_LIST_API,
	ActivityStatus,
	NewsCard,
	NewsItem,
} from "../plugins/Mys/interface/news";

// Store
const appStore = useAppStore();

// 渲染模式
const renderMode = ref(appStore.structureRender);
// loading
const loading = ref(true);

// 数据
const tab = ref("");
const postData = ref({
	notice: [] as NewsCard[],
	activity: [] as NewsCard[],
	news: [] as NewsCard[],
});

onMounted(async () => {
	const noticeRaw: NewsResponse = await http
		.fetch(NEWS_LIST_API.replace("{news_type}", NewsType.NOTICE.toString()))
		.then(res => res.data as Promise<NewsResponse>);
	const activityRaw: NewsResponse = await http
		.fetch(NEWS_LIST_API.replace("{news_type}", NewsType.ACTIVITY.toString()))
		.then(res => res.data as Promise<NewsResponse>);
	const newsRaw: NewsResponse = await http
		.fetch(NEWS_LIST_API.replace("{news_type}", NewsType.NEWS.toString()))
		.then(res => res.data as Promise<NewsResponse>);
	postData.value = {
		notice: transData(noticeRaw, "notice"),
		activity: transData(activityRaw, "activity"),
		news: transData(newsRaw, "news"),
	};
	tab.value = "notice";
	loading.value = false;
});

function transData(rawData: NewsResponse, dataType: string): NewsCard[] {
	const cardData: NewsCard[] = [];
	rawData.data.list.map((item: NewsItem) => {
		const postData: Post = item.post;
		const card: NewsCard = {
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
	const post: Post = await getPost(post_id).then(res => {
		return res.data.post.post;
	});
	let parseDoc: Document;
	// 获取渲染模式
	if (renderMode.value) {
		// 结构化渲染
		parseDoc = Mys_Oper.PostParser(post.structured_content);
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
async function toJson(post_id: string) {
	const post = await getPost(post_id).then(res => {
		return res.data.post.post.structured_content;
	});
	// 将 json 保存到 文件
	await fs.writeTextFile(
		`${appStore.dataPath.temp}\\${post_id}.json`,
		JSON.stringify(JSON.parse(post), null, 4)
	);
	const logUrl = `file:\\\\\\${appStore.dataPath.temp}\\${post_id}.json`;
	// 打开窗口
	createTGWindow(logUrl, "MysPostJson", post_id, 960, 720, false);
}
async function getPost(post_id: string): Promise<PostResponse> {
	return http
		.fetch(POST_FULL_API.replace("{post_id}", post_id), {
			method: "GET",
			headers: {
				referer: POST_FULL_REFERER.replace("{post_id}", post_id),
			},
		})
		.then(res => {
			return res.data as Promise<PostResponse>;
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
