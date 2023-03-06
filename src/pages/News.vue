<template>
	<v-tabs v-model="tab" align-tabs="start" stacked>
		<v-tab value="activity">活动</v-tab>
		<v-tab value="news">新闻</v-tab>
		<v-tab value="notice">公告</v-tab>
	</v-tabs>
	<v-window v-model="tab">
		<v-window-item value="activity">
			<div v-show="postData.activity === {}">暂无活动</div>
			<div class="cards-grid" v-show="postData.activity !== {}">
				<v-card
					v-for="item in postData.activity"
					class="justify-space-between flex-nowrap"
					width="320"
				>
					<v-img :src="item.cover" class="post-cover"></v-img>
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
			<div v-show="postData.news === {}">暂无新闻</div>
			<div class="cards-grid" v-show="postData.news !== {}">
				<v-card
					v-for="item in postData.news"
					class="justify-space-between flex-nowrap"
					width="320"
				>
					<v-img :src="item.cover" class="post-cover"></v-img>
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
			<div v-show="postData.news === {}">暂无新闻</div>
			<div class="cards-grid" v-show="postData.news !== {}">
				<v-card
					v-for="item in postData.notice"
					class="justify-space-between flex-nowrap"
					width="320"
				>
					<!-- todo: 优化图片显示 -->
					<v-img :src="item.cover" class="post-cover"></v-img>
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
import { MysPostType, ResponseListType, ResponseType } from "../interface/MysPost";
import { http } from "@tauri-apps/api";

const MysApi = "https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&type=";
const enum MysType {
	activity = 1,
	news = 2,
	notice = 3,
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
				activity: {},
				news: {},
				notice: {},
			},
		};
	},
	methods: {
		async getPosts() {
			console.log("正在获取数据...");
			console.log("正在获取活动数据...");
			const activityRaw: ResponseType = await http
				.fetch(MysApi + MysType.activity)
				.then(res => res.data as Promise<ResponseType>);
			console.log("正在获取新闻数据...");
			const newsRaw: ResponseType = await http
				.fetch(MysApi + MysType.news)
				.then(res => res.data as Promise<ResponseType>);
			console.log("正在获取公告数据...");
			const noticeRaw: ResponseType = await http
				.fetch(MysApi + MysType.notice)
				.then(res => res.data as Promise<ResponseType>);
			console.log("数据获取完毕,正在转换数据...");
			console.log("正在转换数据...");
			this.postData = {
				activity: this.transData(activityRaw),
				news: this.transData(newsRaw),
				notice: this.transData(noticeRaw),
			};
			console.log("数据转换完毕");
		},
		transData(rawData: ResponseType) {
			let cardData: any[] = [];
			rawData.data.list.map((item: ResponseListType) => {
				const postData: MysPostType = item.post;
				const card = {
					title: postData.subject,
					cover: postData.images[0],
					post_id: postData.post_id,
				};
				return cardData.push(card);
			});
			return cardData;
		},
		async toPost(post_id: number) {
			// 获取帖子内容
			const post: MysPostType = await this.getPost(post_id).then(res => {
				return res.data.post.post;
			});
			// 将内容转换为 html
			const postHtml = new DOMParser().parseFromString(post.content, "text/html");
			// 用帖子标题替换 html 中的标题
			postHtml.title = post.subject;
			// 将 html 转为能够通过 window.open 打开的 url
			const postUrl = URL.createObjectURL(
				new Blob([postHtml.documentElement.outerHTML], { type: "text/html;charset=utf-8" })
			);
			// 调用 tauri 打开无边框窗口
			window.open(
				postUrl,
				"_blank",
				"height=720, width=960, toolbar=no, menubar=no, scrollbars=no,status=no"
			);
		},
		getPost(post_id: number) {
			const postUrl = `https://bbs-api.mihoyo.com/post/wapi/getPostFull?gids=2&post_id=${post_id}`;
			return http
				.fetch(postUrl, {
					method: "GET",
					headers: {
						referer: `https://bbs.mihoyo.com/ys/article/${post_id}`,
					},
				})
				.then(res => {
					return res.data as Promise<ResponseType>;
				});
		},
	},
});
</script>

<style lang="css">
/* todo 样式优化 */
.cards-grid {
	display: grid;
	/* 卡片大小固定，自动填充 */
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	/* 卡片间距 */
	grid-gap: 20px;
}

.post-cover {
	object-fit: cover;
	width: 100%;
	min-height: 150px;
}
</style>
