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
      class="news-search"
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
        <v-card v-for="item in postData.notice" :key="item.postId" class="news-card">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover" />
          </div>
          <v-card-title class="news-card-title">{{ item.title }}</v-card-title>
          <div class="news-card-info">
            <div class="news-card-user">
              <div class="ncu-left">
                <div class="ncu-icon">
                  <img :src="item.user.icon" alt="userIcon" />
                </div>
                <div v-if="item.user.pendant !== ''" class="ncu-pendant">
                  <img :src="item.user.pendant" alt="userPendant" />
                </div>
              </div>
              <div class="ncu-right">
                <span>{{ item.user.nickname }}</span>
                <span>{{ item.user.label }}</span>
              </div>
            </div>
            <v-btn
              v-show="!appStore.devMode"
              class="news-card-btn"
              variant="outlined"
              @click="toPost(item)"
            >
              查看详情
            </v-btn>
            <v-btn
              v-show="appStore.devMode"
              class="news-dev-btn"
              variant="outlined"
              @click="toJson(item)"
            >
              <img src="../assets/icons/arrow-right.svg" alt="right" />
              <span>JSON</span>
            </v-btn>
            <div class="news-card-forum">
              <img :src="item.forum.icon" alt="forumIcon" />
              <span>{{ item.forum.name }}</span>
            </div>
            <div class="news-card-data">
              <div class="ncd-item">
                <v-icon>mdi-eye</v-icon>
                <span>{{ item.data.view }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-star</v-icon>
                <span>{{ item.data.mark }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-comment</v-icon>
                <span>{{ item.data.reply }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-thumb-up</v-icon>
                <span>{{ item.data.like }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-share-variant</v-icon>
                <span>{{ item.data.forward }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('notice')">
          已加载：{{ rawData.notice.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
    <v-window-item value="activity">
      <div class="news-grid">
        <v-card v-for="item in postData.activity" :key="item.postId" class="news-card">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover" />
            <div class="news-card-act">
              <div
                class="nca-status"
                :style="{
                  background: item.status?.colorCss,
                }"
              >
                {{ item.status?.status }}
              </div>
              <div class="nca-time">
                <v-icon>mdi-clock-time-four-outline</v-icon>
                <span>{{ item.subtitle }}</span>
              </div>
            </div>
          </div>
          <v-card-title class="news-card-title">{{ item.title }}</v-card-title>
          <div class="news-card-info">
            <div class="news-card-user">
              <div class="ncu-left">
                <div class="ncu-icon">
                  <img :src="item.user.icon" alt="userIcon" />
                </div>
                <div v-if="item.user.pendant !== ''" class="ncu-pendant">
                  <img :src="item.user.pendant" alt="userPendant" />
                </div>
              </div>
              <div class="ncu-right">
                <span>{{ item.user.nickname }}</span>
                <span>{{ item.user.label }}</span>
              </div>
            </div>
            <v-btn
              v-show="!appStore.devMode"
              class="news-card-btn"
              variant="outlined"
              @click="toPost(item)"
            >
              查看详情
            </v-btn>
            <v-btn
              v-show="appStore.devMode"
              class="news-dev-btn"
              variant="outlined"
              @click="toJson(item)"
            >
              <img src="../assets/icons/arrow-right.svg" alt="right" />
              <span>JSON</span>
            </v-btn>
            <div class="news-card-forum">
              <img :src="item.forum.icon" alt="forumIcon" />
              <span>{{ item.forum.name }}</span>
            </div>
            <div class="news-card-data">
              <div class="ncd-item">
                <v-icon>mdi-eye</v-icon>
                <span>{{ item.data.view }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-star</v-icon>
                <span>{{ item.data.mark }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-comment</v-icon>
                <span>{{ item.data.reply }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-thumb-up</v-icon>
                <span>{{ item.data.like }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-share-variant</v-icon>
                <span>{{ item.data.forward }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('activity')">
          已加载:{{ rawData.activity.lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
    <v-window-item v-if="showNews" value="news">
      <div class="news-grid">
        <v-card v-for="item in postData.news" :key="item.postId" class="news-card">
          <div class="news-cover" @click="toPost(item)">
            <img :src="item.cover" alt="cover" />
          </div>
          <v-card-title class="news-card-title">{{ item.title }}</v-card-title>
          <div class="news-card-info">
            <div class="news-card-user">
              <div class="ncu-left">
                <div class="ncu-icon">
                  <img :src="item.user.icon" alt="userIcon" />
                </div>
                <div v-if="item.user.pendant !== ''" class="ncu-pendant">
                  <img :src="item.user.pendant" alt="userPendant" />
                </div>
              </div>
              <div class="ncu-right">
                <span>{{ item.user.nickname }}</span>
                <span>{{ item.user.label }}</span>
              </div>
            </div>
            <v-btn
              v-show="!appStore.devMode"
              class="news-card-btn"
              variant="outlined"
              @click="toPost(item)"
            >
              查看详情
            </v-btn>
            <v-btn
              v-show="appStore.devMode"
              class="news-dev-btn"
              variant="outlined"
              @click="toJson(item)"
            >
              <img src="../assets/icons/arrow-right.svg" alt="right" />
              <span>JSON</span>
            </v-btn>
            <div class="news-card-forum">
              <img :src="item.forum.icon" alt="forumIcon" />
              <span>{{ item.forum.name }}</span>
            </div>
            <div class="news-card-data">
              <div class="ncd-item">
                <v-icon>mdi-eye</v-icon>
                <span>{{ item.data.view }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-star</v-icon>
                <span>{{ item.data.mark }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-comment</v-icon>
                <span>{{ item.data.reply }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-thumb-up</v-icon>
                <span>{{ item.data.like }}</span>
              </div>
              <div class="ncd-item">
                <v-icon>mdi-share-variant</v-icon>
                <span>{{ item.data.forward }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore('news')">
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
import Mys from "../plugins/Mys";
// utils
import { createTGWindow } from "../utils/TGWindow";

// 路由
const router = useRouter();
const gid = <string>useRoute().params.gid;
const showNews = ref<boolean>(gid !== "5");

// Store
const appStore = useAppStore();

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<boolean>(false);
// snackbar
const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarColor = ref<string>("success");

// search
const search = ref<string>("");

// 数据
const tab = ref<string>("");
const showList = ref<boolean>(false);
const postData = ref({
  notice: <TGApp.Plugins.Mys.News.RenderCard[]>[],
  activity: <TGApp.Plugins.Mys.News.RenderCard[]>[],
  news: <TGApp.Plugins.Mys.News.RenderCard[]>[],
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
  const noticeData = await Mys.News.get(gid);
  rawData.value.notice.isLast = noticeData.is_last;
  rawData.value.notice.lastId = noticeData.list.length;
  postData.value.notice = Mys.News.card.notice(noticeData);
  tab.value = "notice";
  setTimeout(() => {
    loading.value = false;
  }, 1500);
});

async function firstLoad(data: string): Promise<void> {
  if (rawData.value.activity.lastId !== 0 && rawData.value.news.lastId !== 0) {
    return;
  }
  if (data === "activity" && rawData.value.activity.lastId === 0) {
    loadingTitle.value = "正在获取活动数据...";
    loading.value = true;
    const activityData = await Mys.News.get(gid, "2");
    rawData.value.activity.isLast = activityData.is_last;
    rawData.value.activity.lastId = activityData.list.length;
    postData.value.activity = Mys.News.card.activity(activityData);
  }
  if (data === "news" && rawData.value.news.lastId === 0) {
    loadingTitle.value = "正在获取咨讯数据...";
    loading.value = true;
    const newsData = await Mys.News.get(gid, "3");
    rawData.value.news.isLast = newsData.is_last;
    rawData.value.news.lastId = newsData.list.length;
    postData.value.news = Mys.News.card.news(newsData);
  }
  setTimeout(() => {
    loading.value = false;
  }, 1500);
}

async function switchAnno(): Promise<void> {
  await router.push("/announcements");
}

// 加载更多
async function loadMore(data: "notice" | "activity" | "news"): Promise<void> {
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
  const dataList = ["notice", "activity", "news"];
  const dataIndex = (dataList.indexOf(data) + 1).toString();
  const getData = await Mys.News.get(gid, dataIndex, 20, rawData.value[data].lastId);
  rawData.value[data].lastId = rawData.value[data].lastId + getData.list.length;
  rawData.value[data].isLast = getData.is_last;
  const getCard = Mys.News.card[data](getData);
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

async function toPost(item: TGApp.Plugins.Mys.News.RenderCard | string): Promise<void> {
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
        post_id: item.postId.toString(),
      },
    }).href;
    createTGWindow(path, "帖子", item.title, 960, 720, false, false);
  }
}

async function toJson(item: TGApp.Plugins.Mys.News.RenderCard | string): Promise<void> {
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
        post_id: item.postId.toString(),
      },
    }).href;
    createTGWindow(path, "帖子-JSON", `${item.title}-JSON`, 960, 720, false, false);
  }
}

async function searchPost(): Promise<void> {
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

.news-search {
  margin-left: 10px;
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

.news-card-title {
  position: relative;
  height: 50px;
  color: var(--common-text-title);
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

/* news item info */
.news-card-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
  margin: 0 10px 10px;
  gap: 10px;
}

.news-card-user {
  display: flex;
  max-width: 200px;
  height: 50px;
  align-items: center;
  color: var(--common-text-content);
}

.ncu-left {
  position: relative;
  width: 50px;
  height: 50px;
}

.ncu-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.ncu-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ncu-pendant {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.ncu-pendant img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ncu-right {
  display: flex;
  height: 50px;
  flex-direction: column;
  align-items: start;
}

.ncu-right :nth-child(1) {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: start;
  font-size: 16px;
}

.ncu-right :nth-child(2) {
  display: flex;
  height: 20px;
  align-items: center;
  justify-content: start;
  border-top: 2px solid var(--common-shadow-2);
  font-size: 8px;
  opacity: 0.7;
}

.news-card-forum {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/20%);
  border-bottom-left-radius: 5px;
  border-top-right-radius: 5px;
  box-shadow: 0 0 10px rgb(0 0 0);
  color: #faf7e8;
}

.news-card-forum img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.news-card-btn {
  border-radius: 5px;
  margin-left: auto;
}

.news-dev-btn {
  border-radius: 5px;
  margin-left: auto;
  font-family: var(--font-title);
}

.news-dev-btn img {
  width: 20px;
  height: 20px;
  padding: 5px;
  border-radius: 50%;
  margin-right: 5px;
  background: var(--common-shadow-2);
  object-fit: cover;
}

.news-cover img:hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.news-card-data {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
  column-gap: 10px;
}

.ncd-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-quote);
  font-size: 12px;
  gap: 5px;
  opacity: 0.6;
}

/* 活动页 */
.news-card-act {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/50%);
  font-size: 12px;
}

.nca-status {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px 30px 5px 5px;
  clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%);
  color: #faf7e8;

  &::after {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(255 255 255/40%);
    clip-path: polygon(
      calc(100% - 25px) 0,
      100% 0,
      100% 100%,
      calc(100% - 25px) 100%,
      calc(100% - 10px) 50%
    );
    content: "";
  }
}

.nca-time {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 5px;
  color: #faf7e8;
  gap: 5px;
  opacity: 0.8;
}

/* load more */
.load-news {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px;
  font-family: var(--font-title);
  transition: all 0.3s linear;
}

.load-news button {
  border-radius: 5px;
  background: var(--common-bg-1);
  color: var(--common-bgt-1);
}
</style>
