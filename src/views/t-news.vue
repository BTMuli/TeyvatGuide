<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="tab" align-tabs="start" class="news-tab">
    <v-tab value="notice"> 公告 </v-tab>
    <v-tab value="activity" @click="firstLoad('activity')"> 活动 </v-tab>
    <v-tab v-if="showNews" value="news" @click="firstLoad('news')"> 咨讯 </v-tab>
    <v-spacer />
    <v-btn class="news-switch-btn" @click="switchAnno">
      <template #prepend>
        <v-icon>mdi-bullhorn</v-icon>
      </template>
      切换游戏内公告
    </v-btn>
    <v-btn class="news-switch-btn" @click="showList = true">
      <v-icon>mdi-view-list</v-icon>
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
    />
  </v-tabs>
  <v-window v-model="tab">
    <v-window-item value="notice">
      <div class="news-grid">
        <v-card v-for="item in postData.notice" :key="item.post_id" class="news-card">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover" />
          </div>
          <v-card-title class="news-card-title">{{ item.title }}</v-card-title>
          <v-card-actions>
            <v-btn class="news-btn" @click="toPost(item)">
              <img src="../assets/icons/circle-check.svg" alt="check" />
              <span>查看</span>
            </v-btn>
            <v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
            <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
              <template #prepend>
                <img src="../assets/icons/arrow-right.svg" alt="right" />
              </template>
              JSON
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('notice')">
          <template #append>
            <img src="../assets/icons/arrow-left.svg" alt="right" />
          </template>
          已加载：{{ rawData.notice.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
    <v-window-item value="activity">
      <div class="news-grid">
        <v-card v-for="item in postData.activity" :key="item.post_id" class="news-card">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover" />
          </div>
          <v-card-title class="news-card-title">{{ item.title }}</v-card-title>
          <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
          <v-card-actions>
            <v-btn class="news-btn" @click="toPost(item)">
              <template #prepend>
                <img src="../assets/icons/circle-check.svg" alt="check" />
                <span>查看</span>
              </template>
            </v-btn>
            <v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
            <div v-show="!appStore.devMode">
              <v-btn
                :style="{
                  background: item.status?.colorCss,
                  color: '#faf7e8 !important',
                }"
              >
                {{ item.status?.status }}
              </v-btn>
            </div>
            <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
              <template #prepend>
                <img src="../assets/icons/arrow-right.svg" alt="right" />
              </template>
              JSON
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('activity')">
          <template #append>
            <img src="../assets/icons/arrow-left.svg" alt="right" />
          </template>
          已加载:{{ rawData.activity.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
    <v-window-item v-if="showNews" value="news">
      <div class="news-grid">
        <v-card v-for="item in postData.news" :key="item.post_id" class="news-card">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover" />
          </div>
          <v-card-title class="news-card-title">{{ item.title }}</v-card-title>
          <v-card-actions>
            <v-btn class="news-btn" @click="toPost(item)">
              <template #prepend>
                <img src="../assets/icons/circle-check.svg" alt="check" />
                <span>查看</span>
              </template>
            </v-btn>
            <v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
            <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
              <template #prepend>
                <img src="../assets/icons/arrow-right.svg" alt="right" />
              </template>
              JSON
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('news')">
          <template #append>
            <img src="../assets/icons/arrow-left.svg" alt="right" />
          </template>
          已加载：{{ rawData.news.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
  </v-window>
  <v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor">
    {{ snackbarText }}
  </v-snackbar>
  <ToChannel v-model="showList" />
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ToLoading from "../components/overlay/to-loading.vue";
import ToChannel from "../components/overlay/to-channel.vue";
// store
import { useAppStore } from "../store/modules/app";
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
const showList = ref(false as boolean);
const postData = ref({
  notice: [] as NewsCard[],
  activity: [] as NewsCard[],
  news: [] as NewsCard[],
});
const rawData = ref({
  notice: {
    isLast: false,
    name: "公告",
    lastId: 0,
  },
  activity: {
    isLast: false,
    name: "活动",
    lastId: 0,
  },
  news: {
    isLast: false,
    name: "咨讯",
    lastId: 0,
  },
});

onMounted(async () => {
  loadingTitle.value = "正在获取公告数据";
  const noticeData = await MysOper.News.get.notice(gid);
  rawData.value.notice.isLast = noticeData.is_last;
  rawData.value.notice.lastId = noticeData.list.length;
  postData.value.notice = MysOper.News.card.notice(noticeData);
  tab.value = "notice";
  setTimeout(() => {
    loading.value = false;
  }, 1500);
});

async function firstLoad(data: string) {
  if (rawData.value.activity.lastId !== 0 && rawData.value.news.lastId !== 0) {
    return;
  }
  if (data === "activity" && rawData.value.activity.lastId === 0) {
    loadingTitle.value = "正在获取活动数据...";
    loading.value = true;
    const activityData = await MysOper.News.get.activity(gid);
    rawData.value.activity.isLast = activityData.is_last;
    rawData.value.activity.lastId = activityData.list.length;
    postData.value.activity = MysOper.News.card.activity(activityData);
  }
  if (data === "news" && rawData.value.news.lastId === 0) {
    loadingTitle.value = "正在获取咨讯数据...";
    loading.value = true;
    const newsData = await MysOper.News.get.news(gid);
    rawData.value.news.isLast = newsData.is_last;
    rawData.value.news.lastId = newsData.list.length;
    postData.value.news = MysOper.News.card.news(newsData);
  }
  setTimeout(() => {
    loading.value = false;
  }, 1500);
}

async function switchAnno() {
  await router.push("/announcements");
}

// 加载更多
async function loadMore(data: string) {
  loadingSub.value = true;
  if (rawData.value[data].isLast) {
    snackbarText.value = "已经是最后一页了";
    snackbarColor.value = "#35acce";
    snackbar.value = true;
    loadingSub.value = false;
    return;
  }
  loadingTitle.value = `正在获取${rawData.value[data].name}数据...`;
  loading.value = true;
  const getData = await MysOper.News.get[data](gid, 20, rawData.value[data].lastId);
  rawData.value[data].lastId = rawData.value[data].lastId + getData.list.length;
  rawData.value[data].isLast = getData.is_last;
  const getCard = MysOper.News.card[data](getData);
  postData.value[data] = postData.value[data].concat(getCard);
  if (rawData.value[data].isLast) {
    snackbarText.value = "已经是最后一页了";
    snackbarColor.value = "#35acce";
    snackbar.value = true;
    loadingSub.value = false;
    loading.value = false;
    return;
  }
  setTimeout(() => {
    loading.value = false;
    loadingSub.value = false;
  }, 1500);
}

async function toPost(item: NewsCard | string) {
  console.log(item);
  // if (typeof item === "string") {
  //   const path = router.resolve({
  //     name: "帖子详情",
  //     params: {
  //       // eslint-disable-next-line camelcase
  //       post_id: item,
  //     },
  //   }).href;
  //   createTGWindow(path, "帖子-Dev", item, 960, 720, false, false);
  // } else {
  //   const path = router.resolve({
  //     name: "帖子详情",
  //     params: {
  //       // eslint-disable-next-line camelcase
  //       post_id: item.post_id.toString(),
  //     },
  //   }).href;
  //   createTGWindow(path, "帖子", item.title, 960, 720, false, false);
  // }
}

async function toJson(item: NewsCard | string) {
  if (typeof item === "string") {
    const path = router.resolve({
      name: "帖子详情（JSON）",
      params: {
        // eslint-disable-next-line camelcase
        post_id: item,
      },
    }).href;
    createTGWindow(path, "帖子-JSON-Dev", `${item}-JSON`, 960, 720, false, false);
  } else {
    const path = router.resolve({
      name: "帖子详情（JSON）",
      params: {
        // eslint-disable-next-line camelcase
        post_id: item.post_id.toString(),
      },
    }).href;
    createTGWindow(path, "帖子-JSON", `${item.title}-JSON`, 960, 720, false, false);
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
  }
}
</script>

<style lang="css" scoped>
.news-tab {
  margin-bottom: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.news-switch-btn {
  height: 40px;
  margin-left: 15px;
  background: var(--common-btn-bg-1);
  color: var(--common-btn-bgt-1);
  font-family: var(--font-title);
}

.news-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.news-card {
  border-radius: 5px;
  background: var(--common-bg-1);
  color: var(--common-bgt-1);
}

.news-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 150px;
  align-items: center;
  justify-content: center;
}

.news-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.news-cover :hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.news-card-title {
  position: relative;
  height: 50px;
  transition: padding-top 0.3s linear, padding-bottom 0.3s linear, background 0.3s linear,
    font-size 0.3s linear, line-height 0.3s linear, white-space 0.3s linear;
}

.news-card-title:hover {
  display: flex;
  height: 50px;
  padding: 5px;
  background: var(--common-shadow-2);
  font-size: 16px;
  line-height: normal;
  white-space: normal;
}

.news-btn {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--common-btn-bg-2);
  color: var(--common-btn-bgt-2);
}

.news-btn img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
  object-fit: cover;
}

/* load more */
.load-news {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  margin-top: 10px;
  font-family: Genshin, serif;
  transition: all 0.3s linear;
}

.load-news button {
  background: var(--btn-bg-3);
  color: #faf7e8;
}

.load-news button img {
  width: 18px;
  height: 18px;
}
</style>
