<template>
	<div v-if="loading">
		<t-loading :title="loadingTitle" />
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
				<!-- todo 加载更多 -->
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
								<v-btn
									class="ms-2"
									:style="{
										background: item.status_color + ' !important',
										color: '#faf7e8 !important',
									}"
									>{{ item.status }}</v-btn
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
				<!-- todo 加载更多 -->
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
				<!-- todo 加载更多 -->
			</v-window-item>
		</v-window>
	</div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TLoading from "../components/t-loading.vue";
// tauri
import { fs } from "@tauri-apps/api";
// store
import useAppStore from "../store/modules/app";
// tools
// @ts-ignore
import "../tools/svg-inject.js";
// plugin
import MysOper from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import { Post } from "../plugins/Mys/interface/post";
import { NewsCard, NewsData } from "../plugins/Mys/interface/news";

// Store
const appStore = useAppStore();

// 渲染模式
const renderMode = ref(appStore.structureRender);
// loading
const loading = ref(true);
const loadingTitle = ref("正在加载");

// 数据
const tab = ref("");
const postData = ref({
	notice: [] as NewsCard[],
	activity: [] as NewsCard[],
	news: [] as NewsCard[],
});
const noticeData = ref({} as NewsData);
const activityData = ref({} as NewsData);
const newsData = ref({} as NewsData);

onMounted(async () => {
	loadingTitle.value = "正在获取公告数据...";
	noticeData.value = await MysOper.News.get.notice();
	loadingTitle.value = "正在获取活动数据...";
	activityData.value = await MysOper.News.get.activity();
	loadingTitle.value = "正在获取新闻数据...";
	newsData.value = await MysOper.News.get.news();
	loadingTitle.value = "正在渲染数据...";
	postData.value = {
		notice: MysOper.News.card.notice(noticeData.value),
		activity: MysOper.News.card.activity(activityData.value),
		news: MysOper.News.card.news(newsData.value),
	};
	tab.value = "notice";
	loading.value = false;
});

async function toPost(post_id: number) {
	// 获取帖子内容
	const post: Post = (await MysOper.Post.get(post_id)).post;
	let parseDoc: Document;
	// 获取渲染模式
	if (renderMode.value) {
		// 结构化渲染
		parseDoc = MysOper.Post.parser(post.structured_content);
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
async function toJson(post_id: number) {
	const post: string = (await MysOper.Post.get(post_id)).post.structured_content;
	// 将 json 保存到 文件
	await fs.writeTextFile(
		`${appStore.dataPath.temp}\\${post_id}.json`,
		JSON.stringify(JSON.parse(post), null, 4)
	);
	const logUrl = `file:\\\\\\${appStore.dataPath.temp}\\${post_id}.json`;
	// 打开窗口
	createTGWindow(logUrl, "MysPostJson", post_id.toString(), 960, 720, false);
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
</style>
