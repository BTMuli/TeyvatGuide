<template>
	<div v-if="loading">
		<t-loading :title="loadingTitle" />
	</div>
	<div v-else>
		<v-tabs v-model="tab" align-tabs="start" class="global-font mb-2">
			<v-tab value="notice" title="公告" />
			<v-tab value="activity" title="活动" />
			<v-tab value="news" title="新闻" />
			<v-spacer></v-spacer>
			<v-text-field
				v-show="appStore.devMode"
				v-model="search"
				append-icon="mdi-magnify"
				label="搜索"
				single-line
				hide-details
				@click:append="searchPost"
				@keyup.enter="searchPost"
			></v-text-field>
		</v-tabs>
		<v-window v-model="tab">
			<v-window-item value="notice">
				<div class="news-grid">
					<v-card v-for="item in postData.notice" class="news-card" width="340">
						<v-img :src="item.cover" cover style="height: 150px" @click="toPost(item)"></v-img>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="ms-2 card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
							<v-btn @click="toJson(item)" class="ms-2 card-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
				<div class="load-news">
					<v-btn @click="loadMore('notice')">
						<template v-slot:append>
							<img src="../assets/icons/arrow-left.svg" alt="right" onload="SVGInject(this)" />
						</template>
						已加载：{{ noticeData.last_id }}，加载更多
					</v-btn>
				</div>
			</v-window-item>
			<v-window-item value="activity">
				<div class="news-grid">
					<v-card class="news-card" v-for="item in postData.activity" width="340">
						<v-img :src="item.cover" cover style="height: 150px" @click="toPost(item)"></v-img>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="ms-2 card-btn">
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
										background: item.status?.colorCss,
										color: '#faf7e8 !important',
									}"
									>{{ item.status?.status }}</v-btn
								>
							</div>
							<v-btn @click="toJson(item)" class="ms-2 card-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
				<div class="load-news">
					<v-btn @click="loadMore('activity')">
						<template v-slot:append>
							<img src="../assets/icons/arrow-left.svg" alt="right" onload="SVGInject(this)" />
						</template>
						已加载:{{ activityData.last_id }}，加载更多
					</v-btn>
				</div>
			</v-window-item>
			<v-window-item value="news">
				<div class="news-grid">
					<v-card class="news-card" v-for="item in postData.news" width="340">
						<v-img :src="item.cover" cover style="height: 150px" @click="toPost(item)"></v-img>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="ms-2 card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
							<v-btn @click="toJson(item)" class="ms-2 card-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" onload="SVGInject(this)" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
				<div class="load-news">
					<v-btn @click="loadMore('news')">
						<template v-slot:append>
							<img src="../assets/icons/arrow-left.svg" alt="right" onload="SVGInject(this)" />
						</template>
						已加载：{{ newsData.last_id }}，加载更多
					</v-btn>
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
import { dialog } from "@tauri-apps/api";
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
import { NewsCard, NewsData } from "../plugins/Mys/interface/news";
import { useRouter } from "vue-router";

// Store
const appStore = useAppStore();

// loading
const loading = ref(true);
const loadingTitle = ref("正在加载");
// 路由
const router = useRouter();
// search
const search = ref("");

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

// 加载更多
async function loadMore(data: string) {
	let check = true;
	switch (data) {
		case "notice":
			if (noticeData.value.is_last) {
				await dialog.message("已经是最后一页了");
				return;
			}
			if (noticeData.value.last_id === 50) {
				check = await dialog.confirm("由于API限制，获取到的数据数量可能变更为20，是否继续？");
				if (!check) return;
			}
			loading.value = true;
			loadingTitle.value = "正在获取公告数据...";
			noticeData.value = await MysOper.News.get.notice(noticeData.value.last_id + 10);
			loadingTitle.value = "正在渲染数据...";
			postData.value.notice = MysOper.News.card.notice(noticeData.value);
			loading.value = false;
			break;
		case "activity":
			if (activityData.value.is_last) {
				await dialog.message("已经是最后一页了");
				return;
			}
			if (activityData.value.last_id === 50) {
				check = await dialog.confirm("由于API限制，获取到的数据数量可能变更为20，是否继续？");
				if (!check) return;
			}
			loading.value = true;
			loadingTitle.value = "正在获取活动数据...";
			activityData.value = await MysOper.News.get.activity(activityData.value.last_id + 10);
			loadingTitle.value = "正在渲染数据...";
			postData.value.activity = MysOper.News.card.activity(activityData.value);
			loading.value = false;
			break;
		case "news":
			if (newsData.value.is_last) {
				await dialog.message("已经是最后一页了");
				return;
			}
			if (newsData.value.last_id === 50) {
				check = await dialog.confirm("由于API限制，获取到的数据数量可能变更为20，是否继续？");
				if (!check) return;
			}
			loading.value = true;
			loadingTitle.value = "正在获取新闻数据...";
			newsData.value = await MysOper.News.get.news(newsData.value.last_id + 10);
			loadingTitle.value = "正在渲染数据...";
			postData.value.news = MysOper.News.card.news(newsData.value);
			loading.value = false;
			break;
	}
}

async function toPost(item: NewsCard | string) {
	if (typeof item === "string") {
		const path = router.resolve({
			name: "帖子详情",
			params: {
				post_id: item,
			},
		}).href;
		createTGWindow(path, "帖子-Dev", item, 960, 720, false);
	} else {
		const path = router.resolve({
			name: "帖子详情",
			params: {
				post_id: item.post_id.toString(),
			},
		}).href;
		createTGWindow(path, "帖子", item.title, 960, 720, false);
	}
}
async function toJson(item: NewsCard | string) {
	if (typeof item === "string") {
		const path = router.resolve({
			name: "帖子详情（JSON）",
			params: {
				post_id: item,
			},
		}).href;
		createTGWindow(path, "帖子-JSON-Dev", `${item}-JSON`, 960, 720, false);
		return;
	} else {
		const path = router.resolve({
			name: "帖子详情（JSON）",
			params: {
				post_id: item.post_id.toString(),
			},
		}).href;
		createTGWindow(path, "帖子-JSON", `${item.title}-JSON`, 960, 720, false);
		return;
	}
}

async function searchPost() {
	if (search.value === "") {
		await dialog.message("请输入搜索内容");
		return;
	}
	if (!isNaN(Number(search.value))) {
		await toPost(search.value);
		await toJson(search.value);
	} else {
		await dialog.message("请输入数字");
		return;
	}
}
</script>

<style lang="css">
.news-grid {
	font-family: Genshin, serif;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	grid-gap: 20px;
}

.news-grid img {
	transition: all 0.3s linear;
}

.news-grid :hover img {
	cursor: pointer;
	transform: scale(1.1);
	transition: all 0.3s linear;
}

.news-card {
	border-radius: 10px;
	background: #faf7e8;
	color: #546d8b;
}

/* load more */
.load-news {
	font-family: Genshin, serif;
	margin-top: 10px;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 10px;
	border-radius: 5px;
	cursor: pointer;
	transition: all 0.3s linear;
}

.load-news button {
	background: #546d8b !important;
	color: #faf7e8 !important;
}

.load-news button svg {
	width: 18px;
	height: 18px;
}

.load-news button svg path {
	fill: #faf7e8;
}
</style>
