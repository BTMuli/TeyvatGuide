<template>
	<div v-if="loading">
		<t-loading :title="loadingTitle" />
	</div>
	<div v-else>
		<v-tabs v-model="tab" align-tabs="start" class="global-font mb-2">
			<v-tab value="activity" title="活动公告" />
			<v-tab value="game" title="游戏公告" />
			<v-spacer></v-spacer>
			<v-btn class="switch-btn" @click="switchNews">
				<template v-slot:prepend>
					<v-icon>mdi-bullhorn</v-icon>
				</template>
				切换米游社咨讯
			</v-btn>
		</v-tabs>
		<v-window v-model="tab">
			<v-window-item value="activity">
				<div class="anno-grid">
					<v-card class="anno-card" v-for="item in annoCards.activity" width="340">
						<div class="anno-cover" @click="toPost(item)">
							<img :src="item.banner" alt="cover" />
						</div>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle
								><v-icon>mdi-calendar</v-icon> {{ item.start_time.split(" ")[0] }} -
								{{ item.end_time.split(" ")[0] }}</v-card-subtitle
							>
						</v-card-actions>
					</v-card>
				</div>
			</v-window-item>
			<v-window-item value="game">
				<div class="anno-grid">
					<v-card class="anno-card" v-for="item in annoCards.game" width="340">
						<div class="anno-cover" @click="toPost(item)">
							<img :src="item.banner" alt="cover" />
						</div>
						<v-card-title>{{ item.title }}</v-card-title>
						<v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
						<v-card-actions>
							<v-btn @click="toPost(item)" class="card-btn">
								<template v-slot:prepend>
									<img src="../assets/icons/arrow-right.svg" alt="right" />
								</template>
								查看
							</v-btn>
							<v-card-subtitle>
								<v-icon>mdi-calendar</v-icon>
								{{ item.start_time.split(" ")[0] }} -
								{{ item.end_time.split(" ")[0] }}</v-card-subtitle
							>
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
import { useRouter } from "vue-router";
import TLoading from "../components/t-loading.vue";
// plugin
import GenshinOper from "../plugins/Genshin";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import { AnnoListData, AnnoListCard } from "../plugins/Genshin/interface/announcement";

// loading
const loading = ref(true);
const loadingTitle = ref("正在加载");
// 路由
const router = useRouter();

// 数据
const tab = ref("");
const annoCards = ref({
	activity: [] as AnnoListCard[],
	game: [] as AnnoListCard[],
});
const annoData = ref({} as AnnoListData);

onMounted(async () => {
	loadingTitle.value = "正在获取公告数据";
	annoData.value = await GenshinOper.Announcement.get.list();
	loadingTitle.value = "正在转换公告数据";
	const listCards = GenshinOper.Announcement.card(annoData.value);
	const activityCard = listCards.filter(item => item.type_label === "活动公告");
	const newsCard = listCards.filter(item => item.type_label === "游戏公告");
	annoCards.value = {
		activity: activityCard,
		game: newsCard,
	};
	console.log(annoCards.value);
	tab.value = "activity";
	loading.value = false;
});

function switchNews() {
	router.push("/news");
}

async function toPost(item: AnnoListCard) {
	const path = router.resolve({
		name: "游戏内公告",
		params: {
			anno_id: item.id,
		},
	}).href;
	createTGWindow(path, "游戏内公告", item.title, 960, 720, false);
}
</script>

<style lang="css" scoped>
.anno-grid {
	font-family: Genshin, serif;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	grid-gap: 20px;
}

.anno-card {
	border-radius: 10px;
	background: #faf7e8;
	color: #546d8b;
}

.anno-cover {
	height: 130px;
	overflow: hidden;
}

.anno-cover :hover {
	transform: scale(1.1);
	transition: all 0.3s linear;
	cursor: pointer;
}

.anno-cover img {
	object-fit: cover;
	width: 100%;
	height: 130px;
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
</style>
