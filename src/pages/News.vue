<template>
	<v-tabs v-model="tab" align-tabs="start" class="global-font">
		<v-tab value="notice" title="公告" />
		<v-tab value="activity" title="活动" />
		<v-tab value="news" title="新闻" />
	</v-tabs>
	<v-window v-model="tab">
		<v-window-item value="notice">
			<div class="cards-grid">
				<v-card
					v-for="item in postData.notice"
					class="justify-space-between flex-nowrap"
					width="320"
				>
					<v-img :src="item.cover" cover style="height: 150px"></v-img>
					<v-card-title>{{ item.title }}</v-card-title>
					<v-card-actions>
						<v-btn
							@click="toPost(item.post_id)"
							prepend-icon="mdi-arrow-right-circle"
							class="ms-2 bg-blue-accent-2"
							>查看</v-btn
						>
						<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
						<v-btn
							v-show="showLog"
							@click="logPost(item.post_id)"
							prepend-icon="mdi-arrow-right-circle"
							class="ms-2 bg-blue-accent-2"
							>原始数据</v-btn
						>
					</v-card-actions>
				</v-card>
			</div>
		</v-window-item>
		<v-window-item value="activity">
			<div class="cards-grid">
				<v-card
					v-for="item in postData.activity"
					class="justify-space-between flex-nowrap"
					width="320"
				>
					<v-img :src="item.cover" cover style="height: 150px"></v-img>
					<v-card-title>{{ item.title }}</v-card-title>
					<v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
					<v-card-actions>
						<v-btn
							@click="toPost(item.post_id)"
							prepend-icon="mdi-arrow-right-circle"
							class="ms-2 bg-blue-accent-2"
							>查看</v-btn
						>
						<v-btn v-if="item.status === 1" color="ms-2 bg-green-accent-1" variant="flat" disabled
							>进行中</v-btn
						>
						<v-btn
							v-else-if="item.status === 2"
							color="ms-2 bg-red-accent-1"
							variant="flat"
							disabled
							>已结束</v-btn
						>
						<v-btn v-else color="ms-2 bg-orange-accent-1" variant="flat" disabled>评选中</v-btn>
						<v-btn
							v-show="showLog"
							@click="logPost(item.post_id)"
							prepend-icon="mdi-arrow-right-circle"
							class="ms-2 bg-blue-accent-2"
							>原始数据</v-btn
						>
					</v-card-actions>
				</v-card>
			</div>
		</v-window-item>
		<v-window-item value="news">
			<div class="cards-grid">
				<v-card v-for="item in postData.news" class="justify-space-between flex-nowrap" width="320">
					<v-img :src="item.cover" cover style="height: 150px"></v-img>
					<v-card-title>{{ item.title }}</v-card-title>
					<v-card-actions>
						<v-btn
							@click="toPost(item.post_id)"
							prepend-icon="mdi-arrow-right-circle"
							class="ms-2 bg-blue-accent-2"
							>查看</v-btn
						>
						<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
						<v-btn
							v-show="showLog"
							@click="logPost(item.post_id)"
							prepend-icon="mdi-arrow-right-circle"
							class="ms-2 bg-blue-accent-2"
							>原始数据</v-btn
						>
					</v-card-actions>
				</v-card>
			</div>
		</v-window-item>
	</v-window>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import useDevStore from "../store/modules/dev";
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

// Store
const devStore = useDevStore();
const appStore = useAppStore();

// 渲染模式
const renderMode = ref(appStore.structureRender);

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
const showLog = ref(devStore.showDev);

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
.cards-grid {
	font-family: Genshin, serif;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	grid-gap: 20px;
}
</style>
