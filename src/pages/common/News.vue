<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="tab" align-tabs="start" class="news-tab">
    <v-tab
      v-for="(value, index) in tabValues"
      :key="index"
      :value="value"
      @click="firstLoad(value)"
      >{{ rawData[value].name }}</v-tab
    >
    <v-text-field
      v-model="search"
      class="news-search"
      append-icon="mdi-magnify"
      label="请输入米游社帖子 ID"
      single-line
      hide-details
      @click:append="searchPost"
      @keyup.enter="searchPost"
    />
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
  </v-tabs>
  <v-window v-model="tab">
    <v-window-item v-for="(value, index) in tabValues" :key="index" :value="value">
      <div class="news-grid">
        <v-card v-for="item in postData[value]" :key="item.postId" class="news-card">
          <div class="news-cover" @click="createPost(item)">
            <img :src="item.cover" alt="cover" />
            <div v-if="value === 'activity'" class="news-card-act">
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
          <div class="news-content">
            <div class="news-card-title" :title="item.title">{{ item.title }}</div>
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
            <div class="news-card-data">
              <div class="ncd-item" :title="`浏览数：${item.data.view}`">
                <v-icon>mdi-eye</v-icon>
                <span>{{ item.data.view }}</span>
              </div>
              <div class="ncd-item" :title="`收藏数：${item.data.mark}`">
                <v-icon>mdi-star</v-icon>
                <span>{{ item.data.mark }}</span>
              </div>
              <div class="ncd-item" :title="`回复数：${item.data.reply}`">
                <v-icon>mdi-comment</v-icon>
                <span>{{ item.data.reply }}</span>
              </div>
              <div class="ncd-item" :title="`点赞数：${item.data.like}`">
                <v-icon>mdi-thumb-up</v-icon>
                <span>{{ item.data.like }}</span>
              </div>
              <div class="ncd-item" :title="`转发数：${item.data.forward}`">
                <v-icon>mdi-share-variant</v-icon>
                <span>{{ item.data.forward }}</span>
              </div>
            </div>
          </div>
          <div class="news-card-forum" :title="`频道: ${item.forum.name}`">
            <img :src="item.forum.icon" :alt="item.forum.name" />
            <span>{{ item.forum.name }}</span>
          </div>
        </v-card>
      </div>
      <div class="load-news">
        <v-btn :loading="loadingSub" @click="loadMore(value)">
          已加载：{{ rawData[value].lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
  </v-window>
  <ToChannel v-model="showList" />
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import showSnackbar from "../../components/func/snackbar";
import ToChannel from "../../components/overlay/to-channel.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import Mys from "../../plugins/Mys";
import { createPost } from "../../utils/TGWindow";

// 类型定义
enum NewsType {
  notice = "1",
  activity = "2",
  news = "3",
}
type NewsKey = keyof typeof NewsType;
type PostData = {
  [key in NewsKey]: TGApp.Plugins.Mys.News.RenderCard[];
};
type RawData = {
  [key in NewsKey]: {
    isLast: boolean;
    name: string;
    lastId: number;
  };
};

// 路由
const router = useRouter();
const gid = <string>useRoute().params.gid;

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<boolean>(false);

// UI 数据
const tab = ref<NewsKey>("notice");
const showList = ref<boolean>(false);
const tabValues = ref<Array<NewsKey>>(["notice", "activity", "news"]);

// 渲染数据
const search = ref<string>("");
const postData = ref<PostData>({
  notice: [],
  activity: [],
  news: [],
});
const rawData = ref<RawData>({
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
  tab.value = "notice";
  await firstLoad("notice");
});

async function firstLoad(key: NewsKey): Promise<void> {
  if (rawData.value[key].lastId !== 0) {
    return;
  }
  loadingTitle.value = `正在获取${rawData.value[key].name}数据...`;
  loading.value = true;
  const getData = await Mys.News.get(gid, NewsType[key]);
  rawData.value[key].isLast = getData.is_last;
  rawData.value[key].lastId = getData.list.length;
  postData.value[key] = Mys.News.card[key](getData);
  loadingTitle.value = `正在渲染${rawData.value[key].name}数据...`;
  await nextTick(() => {
    loading.value = false;
  });
}

async function switchAnno(): Promise<void> {
  await router.push("/announcements");
}

// 加载更多
async function loadMore(key: NewsKey): Promise<void> {
  loadingSub.value = true;
  if (rawData.value[key].isLast) {
    showSnackbar({
      text: "已经是最后一页了",
      color: "warn",
    });
    loadingSub.value = false;
    return;
  }
  loadingTitle.value = `正在获取${rawData.value[key].name}数据...`;
  loading.value = true;
  const getData = await Mys.News.get(gid, NewsType[key], 20, rawData.value[key].lastId);
  rawData.value[key].lastId = rawData.value[key].lastId + getData.list.length;
  rawData.value[key].isLast = getData.is_last;
  const getCard = Mys.News.card[key](getData);
  postData.value[key] = postData.value[key].concat(getCard);
  if (rawData.value[key].isLast) {
    showSnackbar({
      text: "已经是最后一页了",
      color: "warn",
    });
    loadingSub.value = false;
    loading.value = false;
    return;
  }
  await nextTick(() => {
    loadingSub.value = false;
    loading.value = false;
  });
}

function searchPost(): void {
  if (search.value === "") {
    showSnackbar({
      text: "请输入搜索内容",
      color: "error",
    });
    return;
  }
  if (!isNaN(Number(search.value))) {
    createPost(search.value);
  } else {
    showSnackbar({
      text: "请输入搜索内容",
      color: "error",
    });
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
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.news-search {
  margin-left: 10px;
  color: var(--box-text-1);
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
  background: var(--app-page-bg);
  color: var(--box-text-1);
}

/* 增加辨识度 */
.dark .news-card {
  border: 1px solid var(--common-shadow-2);
}

.news-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 36 / 13;
}

.news-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

/* news item info */
.news-content {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}

.news-card-title {
  overflow: hidden;
  width: 100%;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.news-card-user {
  display: flex;
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
  position: relative;
  display: flex;
  height: 50px;
  flex-direction: column;
  align-items: start;
  color: var(--box-text-4);
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
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: start;
  border-top: 2px solid var(--common-shadow-2);
  font-size: 14px;
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
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
}

.news-card-forum img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
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
  color: var(--box-text-7);
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
  color: var(--tgc-white-1);

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
  color: var(--tgc-white-1);
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
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
