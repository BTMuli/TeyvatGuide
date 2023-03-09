<template>
	<v-tabs v-model="tab" align-tabs="start" stacked>
		<v-tab value="activity">活动</v-tab>
		<v-tab value="news">新闻</v-tab>
		<v-tab value="notice">公告</v-tab>
	</v-tabs>
	<v-window v-model="tab">
		<v-window-item value="activity">
			<div class="cards-grid">
				<v-card
					v-for="item in postData.activity"
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
					</v-card-actions>
				</v-card>
			</div>
		</v-window-item>
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
					</v-card-actions>
				</v-card>
			</div>
		</v-window-item>
	</v-window>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
	MysPostType,
	ResponseNewsList,
	ResponseNews,
	EnumPostType,
	ResponsePost,
} from "../interface/MysPost";
// import { http,window as TauriWindow } from "@tauri-apps/api";
import { http } from "@tauri-apps/api";

const MysApi = "https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&type=";

export interface CardDataType {
	title: string;
	cover: string;
	post_id: string;
}

export default defineComponent({
	name: "News",
	// 进入页面时，获取数据
	mounted() {
		this.getPosts();
	},
	data() {
		return {
			tab: "activity",
			postData: {
				activity: {} as CardDataType[],
				news: {} as CardDataType[],
				notice: {} as CardDataType[],
			},
		};
	},
	methods: {
		async getPosts() {
			console.log("正在获取数据...");
			console.log("正在获取活动数据...");
			const activityRaw: ResponseNewsList = await http
				.fetch(MysApi + EnumPostType.Activity)
				.then(res => res.data as Promise<ResponseNewsList>);
			console.log("正在获取新闻数据...");
			const newsRaw: ResponseNewsList = await http
				.fetch(MysApi + EnumPostType.News)
				.then(res => res.data as Promise<ResponseNewsList>);
			console.log("正在获取公告数据...");
			const noticeRaw: ResponseNewsList = await http
				.fetch(MysApi + EnumPostType.Notice)
				.then(res => res.data as Promise<ResponseNewsList>);
			console.log("数据获取完毕,正在转换数据...");
			console.log("正在转换数据...");
			this.postData = {
				activity: this.transData(activityRaw),
				news: this.transData(newsRaw),
				notice: this.transData(noticeRaw),
			};
			console.log("数据转换完毕");
		},
		transData(rawData: ResponseNewsList) {
			let cardData: CardDataType[] = [];
			rawData.data.list.map((item: ResponseNews) => {
				const postData: MysPostType = item.post;
				const card: CardDataType = {
					title: postData.subject,
					cover: postData.images[0],
					post_id: postData.post_id,
				};
				return cardData.push(card);
			});
			return cardData;
		},
		async toPost(post_id: string) {
			// 获取帖子内容
			const post: MysPostType = await this.getPost(post_id).then(res => {
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
		},
		getPost(post_id: string): Promise<ResponsePost> {
			const postUrl = `https://bbs-api.mihoyo.com/post/wapi/getPostFull?gids=2&post_id=${post_id}`;
			return http
				.fetch(postUrl, {
					method: "GET",
					headers: {
						referer: `https://bbs.mihoyo.com/ys/article/${post_id}`,
					},
				})
				.then(res => {
					return res.data as Promise<ResponsePost>;
				});
		},
	},
});
</script>

<style lang="css">
.cards-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	grid-gap: 20px;
}
</style>
