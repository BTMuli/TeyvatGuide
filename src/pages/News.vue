<template>
	<v-tabs v-model="tab" align-tabs="start" stacked>
		<v-tab value="notice">公告</v-tab>
		<v-tab value="activity">活动</v-tab>
		<v-tab value="news">咨讯</v-tab>
	</v-tabs>
	<v-window v-model="tab" style="height: 800px;overflow: auto">
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
import {
	MysPostType,
	ResponseNewsList,
	ResponseNews,
	EnumPostType,
	ResponsePost,
} from "../interface/MysPost";
// import { http,window as TauriWindow } from "@tauri-apps/api";
import { http } from "@tauri-apps/api";

// Store
const devStore = useDevStore();

// 常量
const MysNewsApi = "https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&type=";
const MysPostApi = "https://bbs-api.mihoyo.com/post/wapi/getPostFull?gids=2&post_id=";

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
	// 将内容转换为 html
	const postHtml = new DOMParser().parseFromString(post.content, "text/html");
	// 用帖子标题替换 html 中的标题
	postHtml.title = post.subject;
	// 四周留白
	postHtml.body.style.padding = "12%";
	postHtml.querySelectorAll("img").forEach(img => {
		img.style.width = "100%";
	});
	// 将 html 转为能够通过 window.open 打开的 url
	const postUrl = URL.createObjectURL(
		new Blob([postHtml.documentElement.outerHTML], { type: "text/html;charset=utf-8" })
	);
	// 打开新窗口，窗口位置居中
	// 获取窗口宽度
	const width = window.screen.width;
	// 获取窗口高度
	const height = window.screen.height;
	// 计算窗口位置
	const left = width / 2 - 480;
	const top = height / 2 - 360;
	// 打开窗口
	window.open(postUrl, "_blank", `width=960,height=720,left=${left},top=${top}`);
	// new TauriWindow.WebviewWindow("blob", {
	// 	url: postUrl,
	// 	title: post.subject,
	// 	decorations: true,
	// 	width: 960,
	// 	x: left,
	// 	y: top,
	// 	height: 720,
	// 	resizable: false,
	// });
}
async function logPost(post_id: string) {
	const post = await getPost(post_id).then(res => {
		return res.data;
	});
	// 将 Json 内容写入 html
	const postHtml = new DOMParser().parseFromString(JSON.stringify(post), "text/html");
	// 将 html 转为能够通过 window.open 打开的 url
	const postUrl = URL.createObjectURL(
		new Blob([postHtml.documentElement.outerHTML], { type: "text/html;charset=utf-8" })
	);
	// 打开新窗口，窗口位置居中
	// 获取窗口宽度
	const width = window.screen.width;
	// 获取窗口高度
	const height = window.screen.height;
	// 计算窗口位置
	const left = width / 2 - 480;
	const top = height / 2 - 360;
	// 打开窗口
	window.open(postUrl, "_blank", `width=960,height=720,left=${left},top=${top}`);
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
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	grid-gap: 20px;
}
</style>
