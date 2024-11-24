<template>
  <v-app-bar density="compact">
    <template #prepend>
      <v-tabs v-model="tab" align-tabs="start" class="news-tab">
        <v-tab
          v-for="(value, index) in tabValues"
          :key="index"
          :value="value"
          @click="firstLoad(value)"
          >{{ rawData[value].name }}
        </v-tab>
      </v-tabs>
    </template>
    <template #title>
      <v-text-field
        v-model="search"
        class="news-search"
        append-icon="mdi-magnify"
        label="请输入帖子 ID 或搜索词"
        :single-line="true"
        :hide-details="true"
        @keydown.enter="searchPost()"
        @click:append="searchPost()"
      />
    </template>
    <template #append>
      <v-btn class="post-news-btn" @click="firstLoad(tab, true)">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-btn class="post-news-btn" @click="showList = true">
        <v-icon>mdi-view-list</v-icon>
      </v-btn>
      <v-btn class="post-news-btn" @click="switchAnno" v-if="gid === '2'">
        <template #prepend>
          <v-icon>mdi-bullhorn</v-icon>
        </template>
        切换游戏内公告
      </v-btn>
    </template>
  </v-app-bar>
  <v-window v-model="tab">
    <v-window-item v-for="(value, index) in tabValues" :key="index" :value="value">
      <div class="news-grid">
        <div v-for="item in postData[value]" :key="item.post.post_id">
          <TPostCard :model-value="item" />
        </div>
      </div>
      <div class="load-news">
        <v-btn class="post-news-btn" :rounded="true" :loading="loading" @click="loadMore(value)">
          已加载：{{ rawData[value].lastId }}，加载更多
        </v-btn>
      </div>
    </v-window-item>
  </v-window>
  <ToChannel v-model="showList" :gid="gid" />
  <VpOverlaySearch :gid="gid" v-model="showSearch" :keyword="search" />
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import TPostCard from "../../components/app/t-postcard.vue";
import showLoading from "../../components/func/loading.js";
import showSnackbar from "../../components/func/snackbar.js";
import ToChannel from "../../components/pageNews/to-channel.vue";
import VpOverlaySearch from "../../components/viewPost/vp-overlay-search.vue";
import Mys from "../../plugins/Mys/index.js";
import { useAppStore } from "../../store/modules/app.js";
import TGLogger from "../../utils/TGLogger.js";
import { createPost } from "../../utils/TGWindow.js";
import { getGameName } from "../../web/utils/tools.js";

// 类型定义
enum NewsType {
  notice = "1",
  activity = "2",
  news = "3",
}

type NewsKey = keyof typeof NewsType;
type PostData = {
  [key in NewsKey]: TGApp.Plugins.Mys.Post.FullData[];
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
const gameName = getGameName(Number(gid));
// loading
const loading = ref<boolean>(false);

// UI 数据
const appStore = useAppStore();
const showList = ref<boolean>(false);
const showSearch = ref<boolean>(false);
const tabValues = ref<Array<NewsKey>>(["notice", "activity", "news"]);
const tabList = ["notice", "activity", "news"];
const tab = computed({
  get: () => {
    if (appStore.recentNewsType === "" || !tabList.includes(appStore.recentNewsType)) {
      return "notice";
    }
    return <NewsKey>appStore.recentNewsType;
  },
  set: (val) => {
    appStore.recentNewsType = val;
  },
});

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

onMounted(async () => await firstLoad(tab.value));

async function firstLoad(key: NewsKey, refresh: boolean = false): Promise<void> {
  if (rawData.value[key].lastId !== 0) {
    if (!refresh) return;
    postData.value[key] = [];
    rawData.value[key].lastId = 0;
  }
  showLoading.start(`正在获取${gameName}${rawData.value[key].name}数据...`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const getData = await Mys.Painter.getNewsList(gid, NewsType[key]);
  rawData.value[key].isLast = getData.is_last;
  rawData.value[key].lastId = getData.list.length;
  postData.value[key] = getData.list;
  showLoading.update(`正在渲染${gameName}${rawData.value[key].name}数据...`);
  await nextTick(() => showLoading.end());
  await TGLogger.Info(`[News][${gid}][firstLoad] 获取${rawData.value[key].name}数据成功`);
}

async function switchAnno(): Promise<void> {
  await TGLogger.Info(`[News][${gid}][switchAnno] 切换公告`);
  await router.push("/announcements");
}

// 加载更多
async function loadMore(key: NewsKey): Promise<void> {
  loading.value = true;
  if (rawData.value[key].isLast) {
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  showLoading.start(`正在获取${gameName}${rawData.value[key].name}数据...`);
  const getData = await Mys.Painter.getNewsList(gid, NewsType[key], 20, rawData.value[key].lastId);
  rawData.value[key].lastId = rawData.value[key].lastId + getData.list.length;
  rawData.value[key].isLast = getData.is_last;
  postData.value[key] = postData.value[key].concat(getData.list);
  if (rawData.value[key].isLast) {
    showLoading.end();
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  await nextTick(() => showLoading.end());
  loading.value = false;
}

async function searchPost(): Promise<void> {
  if (search.value === "") {
    showSnackbar.warn("请输入搜索内容");
    return;
  }
  const numCheck = Number(search.value);
  if (isNaN(numCheck)) {
    showSearch.value = true;
  } else {
    await createPost(search.value);
    showSearch.value = false;
  }
}
</script>

<style lang="css" scoped>
.news-tab {
  margin-bottom: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.post-news-btn {
  height: 40px;
  margin-left: 15px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .post-news-btn {
  border: 1px solid var(--common-shadow-2);
}

.news-search {
  margin: 0 10px;
  color: var(--box-text-1);
}

.news-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
</style>
