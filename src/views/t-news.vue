<template>
  <TOLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="tab" align-tabs="start" class="news-tab">
    <v-tab value="notice">
      公告
    </v-tab>
    <v-tab value="activity" @click="firstLoad('activity')">
      活动
    </v-tab>
    <v-tab v-if="showNews" value="news" @click="firstLoad('news')">
      新闻
    </v-tab>
    <v-spacer />
    <v-btn class="switch-btn" @click="switchAnno">
      <template #prepend>
        <v-icon>mdi-bullhorn</v-icon>
      </template>
      切换游戏内公告
    </v-btn>
    <v-btn class="switch-chan" @click="showList=true">
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
        <v-card v-for="item in postData.notice" :key="item.post_id" class="news-card" width="340">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover">
          </div>
          <v-card-title>{{ item.title }}</v-card-title>
          <v-card-actions>
            <v-btn class="card-btn" @click="toPost(item)">
              <template #prepend>
                <img src="../assets/icons/circle-check.svg" alt="check">查看
              </template>
            </v-btn>
            <v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
            <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
              <template #prepend>
                <img src="../assets/icons/arrow-right.svg" alt="right">
              </template>
              JSON
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('notice')">
          <template #append>
            <img src="../assets/icons/arrow-left.svg" alt="right">
          </template>
          已加载：{{ rawData.notice.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
    <v-window-item value="activity">
      <div class="news-grid">
        <v-card v-for="item in postData.activity" :key="item.post_id" class="news-card" width="340">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover">
          </div>
          <v-card-title>{{ item.title }}</v-card-title>
          <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
          <v-card-actions>
            <v-btn class="card-btn" @click="toPost(item)">
              <template #prepend>
                <img src="../assets/icons/circle-check.svg" alt="check">查看
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
                <img src="../assets/icons/arrow-right.svg" alt="right">
              </template>
              JSON
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('activity')">
          <template #append>
            <img src="../assets/icons/arrow-left.svg" alt="right">
          </template>
          已加载:{{ rawData.activity.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
    <v-window-item v-if="showNews" value="news">
      <div class="news-grid">
        <v-card v-for="item in postData.news" :key="item.post_id" class="news-card" width="340">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover">
          </div>
          <v-card-title>{{ item.title }}</v-card-title>
          <v-card-actions>
            <v-btn class="card-btn" @click="toPost(item)">
              <template #prepend>
                <img src="../assets/icons/circle-check.svg" alt="check">查看
              </template>
            </v-btn>
            <v-card-subtitle>id:{{ item.post_id }}</v-card-subtitle>
            <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
              <template #prepend>
                <img src="../assets/icons/arrow-right.svg" alt="right">
              </template>
              JSON
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('news')">
          <template #append>
            <img src="../assets/icons/arrow-left.svg" alt="right">
          </template>
          已加载：{{ rawData.news.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
  </v-window>
  <v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor">
    {{ snackbarText }}
  </v-snackbar>
  <v-overlay v-model="showList">
    <div class="choice-box">
      <div class="choice-title">
        请选择要跳转的频道
      </div>
      <div class="choice-list">
        <div class="choice-item" @click="toChannel('/news/2')">
          <div class="choice-icon">
            <img src="/platforms/mhy/ys.webp" alt="ys">
          </div>
          <div class="choice-name">
            原神
          </div>
        </div>
        <div class="choice-item" @click="toChannel('/news/6')">
          <div class="choice-icon">
            <img src="/platforms/mhy/sr.webp" alt="sr">
          </div>
          <div class="choice-name">
            崩坏：星穹铁道
          </div>
        </div>
        <div class="choice-item" @click="toChannel('/news/1')">
          <div class="choice-icon">
            <img src="/platforms/mhy/bh3.webp" alt="bh3">
          </div>
          <div class="choice-name">
            崩坏3
          </div>
        </div>
        <div class="choice-item" @click="toChannel('/news/3')">
          <div class="choice-icon">
            <img src="/platforms/mhy/bh2.webp" alt="bh2">
          </div>
          <div class="choice-name">
            崩坏2
          </div>
        </div>
        <div class="choice-item" @click="toChannel('/news/4')">
          <div class="choice-icon">
            <img src="/platforms/mhy/wd.webp" alt="wd">
          </div>
          <div class="choice-name">
            未定事件簿
          </div>
        </div>
        <div class="choice-item" @click="toChannel('/news/8')">
          <div class="choice-icon">
            <img src="/platforms/mhy/zzz.webp" alt="zzz">
          </div>
          <div class="choice-name">
            绝区零
          </div>
        </div>
        <div class="choice-item" @click="toChannel('/news/5')">
          <div class="choice-icon">
            <img src="/platforms/mhy/dby.webp" alt="sg">
          </div>
          <div class="choice-name">
            大别野
          </div>
        </div>
      </div>
    </div>
  </v-overlay>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import TOLoading from "../components/overlay/to-loading.vue";
// store
import { useAppStore } from "../store/modules/app";
// plugin
import MysOper from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";
// interface
import { NewsCard, NewsData } from "../plugins/Mys/interface/news";

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

async function firstLoad (data: string) {
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

async function switchAnno () {
  await router.push("/announcements");
}

async function toChannel (chan: string) {
  showList.value = false;
  await router.push(chan);
  await window.location.reload();
}

// 加载更多
async function loadMore (data: string) {
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

async function toPost (item: NewsCard | string) {
  if (typeof item === "string") {
    const path = router.resolve({
      name: "帖子详情",
      params: {
        // eslint-disable-next-line camelcase
        post_id: item,
      },
    }).href;
    createTGWindow(path, "帖子-Dev", item, 960, 720, false, false);
  } else {
    const path = router.resolve({
      name: "帖子详情",
      params: {
        // eslint-disable-next-line camelcase
        post_id: item.post_id.toString(),
      },
    }).href;
    createTGWindow(path, "帖子", item.title, 960, 720, false, false);
  }
}

async function toJson (item: NewsCard | string) {
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

async function searchPost () {
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
  font-family: Genshin, serif;
  margin-bottom: 20px;
  color: var(--content-text-3);
}

.news-grid {
  font-family: Genshin, serif;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  grid-gap: 20px;
}

.news-card {
  border-radius: 10px;
  background: var(--content-bg-2);
  color: var(--content-text-2);
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
  background: var(--btn-bg-1);
  height: 40px;
  margin-right: 10px;
  margin-top: 5px;
  color: var(--content-text-3);
}

.switch-chan {
  font-family: Genshin, serif;
  background: var(--btn-bg-1);
  height: 40px;
  margin-right: 10px;
  margin-top: 5px;
  color: var(--content-text-3);
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
  background: var(--btn-bg-3);
  color: #faf7e8;
}

.load-news button img {
  width: 18px;
  height: 18px;
}

/* chan choice */
.choice-box {
  position: absolute;
  top: calc(50vh - 200px);
  left: calc(50vw - 140px);
  width: 400px;
  height: 280px;
  background: var(--content-bg-2);
  border-radius: 10px;
  padding: 10px;
}

.choice-title {
  font-family: Genshin, serif;
  font-size: 20px;
  color: var(--content-text-3);
  margin-bottom: 10px;
}

.choice-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 10px;
}

.choice-item {
  cursor: pointer;
  font-family: Genshin, serif;
  background: rgb(0 0 0 / 30%);
  color: var(--content-text-3);
  height: 45px;
  border-radius: 5px;
  display: flex;
  justify-content: space-around;
  transition: all 0.3s linear;
}

.choice-item:hover {
  border-radius: 5px;
  background: rgb(0 0 0 / 50%);
  transition: all 0.5s linear;
}

.choice-icon {
  position: relative;
  width: 45px;
  height: 45px;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
}

.choice-icon img {
  width: 45px;
  height: 45px;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
}

.choice-name {
  width: calc(100% - 50px);
  height: 45px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 5px;
  position: relative;
  color: #fff;
  font-size: 12px;
  font-family: Genshin-Light, serif;
}
</style>
