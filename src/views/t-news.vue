<template>
	<div v-if="loading">
		<t-loading :title="loadingTitle" />
	</div>
	<div v-else>
		<v-tabs v-model="tab" align-tabs="start" class="news-tabs">
			<v-tab value="notice" title="公告" />
			<v-tab value="activity" title="活动" />
			<v-tab value="news" title="新闻" v-if="showNews" />
			<v-spacer></v-spacer>
			<v-btn class="switch-btn" @click="switchAnno" v-if="showSwitch">
				<template v-slot:prepend>
					<v-icon>mdi-bullhorn</v-icon>
				</template>
				切换游戏内公告
			</v-btn>
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
						<div class="news-cover" @click="toPost(item)">
							<img :src="item.cover" alt="cover" />
						</div>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/circle-check.svg" alt="check" />查看
								</template>
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
							<v-btn @click="toJson(item)" class="card-dev-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
				<div class="load-news">
					<v-btn @click="loadMore('notice')" :loading="loadingSub">
						<template v-slot:append>
							<img src="../assets/icons/arrow-left.svg" alt="right" />
						</template>
						已加载：{{ rawData.notice.last_id }}，加载更多
					</v-btn>
				</div>
			</v-window-item>
			<v-window-item value="activity">
				<div class="news-grid">
					<v-card class="news-card" v-for="item in postData.activity" width="340">
						<div class="news-cover" @click="toPost(item)">
							<img :src="item.cover" alt="cover" />
						</div>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/circle-check.svg" alt="check" />查看
								</template>
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
							<div v-show="!appStore.devMode">
								<v-btn
									:style="{
										background: item.status?.colorCss,
										color: '#faf7e8 !important',
									}"
									>{{ item.status?.status }}</v-btn
								>
							</div>
							<v-btn @click="toJson(item)" class="card-dev-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
				<div class="load-news">
					<v-btn @click="loadMore('activity')" :loading="loadingSub">
						<template v-slot:append>
							<img src="../assets/icons/arrow-left.svg" alt="right" />
						</template>
						已加载:{{ rawData.activity.last_id }}，加载更多
					</v-btn>
				</div>
			</v-window-item>
			<v-window-item value="news" v-if="showNews">
				<div class="news-grid">
					<v-card class="news-card" v-for="item in postData.news" width="340">
						<div class="news-cover" @click="toPost(item)">
							<img :src="item.cover" alt="cover" />
						</div>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/circle-check.svg" alt="check" />查看
								</template>
							</v-btn>
							<v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
							<v-btn @click="toJson(item)" class="card-dev-btn" v-show="appStore.devMode">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" />
								</template>
								JSON
							</v-btn>
						</v-card-actions>
					</v-card>
				</div>
				<div class="load-news">
					<v-btn @click="loadMore('news')" :loading="loadingSub">
						<template v-slot:append>
							<img src="../assets/icons/arrow-left.svg" alt="right" />
						</template>
						已加载：{{ rawData.news.last_id }}，加载更多
					</v-btn>
				</div>
			</v-window-item>
		</v-window>
		<v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor">
			{{ snackbarText }}
		</v-snackbar>
	</div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import TLoading from "../components/t-loading.vue";
// store
import useAppStore from "../store/modules/app";
// plugin
import MysOper from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import { NewsCard } from "../plugins/Mys/interface/news";

// 路由
const router = useRouter();
const gid = useRoute().params.gid as string;
const showNews = ref((gid !== "5") as boolean);
const showSwitch = ref((gid === "2") as boolean);

// Store
const appStore = useAppStore();

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载" as string);
const loadingSub = ref(false as boolean);
// snackbar
const snackbar = ref(false as boolean);
const snackbarText = ref("" as string);
const snackbarColor = ref("success" as string);

// search
const search = ref("" as string);

// 数据
const tab = ref("" as string);
const postData = ref({
	notice: [] as NewsCard[],
	activity: [] as NewsCard[],
	news: [] as NewsCard[],
});
const rawData = ref({
	notice: {
		is_last: false,
		last_id: 0,
	},
	activity: {
		is_last: false,
		last_id: 0,
	},
	news: {
		is_last: false,
		last_id: 0,
	},
});

onMounted(async () => {
	loadingTitle.value = "正在获取公告数据...";
	const noticeData = await MysOper.News.get.notice(gid);
	rawData.value.notice.is_last = noticeData.is_last;
	rawData.value.notice.last_id = noticeData.list.length;
	loadingTitle.value = "正在获取活动数据...";
	const activityData = await MysOper.News.get.activity(gid);
	rawData.value.activity.is_last = activityData.is_last;
	rawData.value.activity.last_id = activityData.list.length;
	if (showNews) {
		loadingTitle.value = "正在获取新闻数据...";
		const newsData = await MysOper.News.get.news(gid);
		console.log(newsData);
		rawData.value.news!.is_last = newsData.is_last;
		rawData.value.news!.last_id = newsData.list.length;
		postData.value = {
			notice: MysOper.News.card.notice(noticeData),
			activity: MysOper.News.card.activity(activityData),
			news: MysOper.News.card.news(newsData),
		};
	} else {
		postData.value = {
			notice: MysOper.News.card.notice(noticeData),
			activity: MysOper.News.card.activity(activityData),
			news: [],
		};
	}
	tab.value = "notice";
	loading.value = false;
});

function switchAnno() {
	router.push("/announcements");
}

// 加载更多
async function loadMore(data: string) {
	loadingSub.value = true;
	switch (data) {
		case "notice":
			if (rawData.value.notice.is_last) {
				snackbarText.value = "已经是最后一页了";
				snackbarColor.value = "#35acce";
				snackbar.value = true;
				loadingSub.value = false;
				return;
			}
			const getNotice = await MysOper.News.get.notice(gid, 20, rawData.value.notice.last_id);
			rawData.value.notice.last_id = rawData.value.notice.last_id + getNotice.list.length;
			rawData.value.notice.is_last = getNotice.is_last;
			const noticeCard = MysOper.News.card.notice(getNotice);
			postData.value.notice = postData.value.notice.concat(noticeCard);
			loadingSub.value = false;
			break;
		case "activity":
			if (rawData.value.activity.is_last) {
				snackbarText.value = "已经是最后一页了";
				snackbarColor.value = "#35acce";
				snackbar.value = true;
				loadingSub.value = false;
				return;
			}
			const getActivity = await MysOper.News.get.activity(gid, 20, rawData.value.activity.last_id);
			rawData.value.activity.last_id = rawData.value.activity.last_id + getActivity.list.length;
			rawData.value.activity.is_last = getActivity.is_last;
			const activityCard = MysOper.News.card.activity(getActivity);
			postData.value.activity = postData.value.activity.concat(activityCard);
			loadingSub.value = false;
			break;
		case "news":
			if (rawData.value.news.is_last) {
				snackbarText.value = "已经是最后一页了";
				snackbarColor.value = "#35acce";
				snackbar.value = true;
				loadingSub.value = false;
				return;
			}
			const getNews = await MysOper.News.get.news(gid, 20, rawData.value.news.last_id);
			rawData.value.news.last_id = getNews.last_id;
			rawData.value.news.is_last = getNews.is_last;
			const newsCard = MysOper.News.card.news(getNews);
			postData.value.news = postData.value.news.concat(newsCard);
			loadingSub.value = false;
			break;
		default:
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
		snackbarText.value = "请输入搜索内容";
		snackbarColor.value = "error";
		snackbar.value = true;
		return;
	}
	if (!isNaN(Number(search.value))) {
		await toPost(search.value);
		await toJson(search.value);
	} else {
		snackbarText.value = "请输入搜索内容";
		snackbarColor.value = "error";
		snackbar.value = true;
		return;
	}
}
</script>

<style lang="css" scoped>
.news-tabs {
	font-family: Genshin, serif;
	margin-bottom: 10px;
}

.news-grid {
	font-family: Genshin, serif;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	grid-gap: 20px;
}

.news-card {
	border-radius: 10px;
	background: #faf7e8;
	color: #546d8b;
}

.news-cover {
	height: 150px;
	overflow: hidden;
}

.news-cover :hover {
	transform: scale(1.1);
	transition: all 0.3s linear;
	cursor: pointer;
}

.news-cover img {
	object-fit: cover;
	width: 100%;
	height: 150px;
	transition: all 0.3s linear;
}
/* switch */
.switch-btn {
	font-family: Genshin, serif;
	background: #ffca0a;
	height: 40px;
	margin-right: 10px;
	margin-top: 5px;
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
	transition: all 0.3s linear;
}

.load-news button {
	background: #546d8b !important;
	color: #faf7e8 !important;
}

.load-news button img {
	width: 18px;
	height: 18px;
}
</style>
