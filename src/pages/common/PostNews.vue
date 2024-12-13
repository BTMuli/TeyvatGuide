<template>
  <v-app-bar density="compact">
    <template #prepend>
      <v-tabs v-model="tab" align-tabs="start" class="news-tab">
        <v-tab
          v-for="(value, index) in tabValues"
          :key="index"
          :value="value"
          @click="firstLoad(value)"
        >
          {{ rawData[value].name }}
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
      <v-btn class="post-news-btn" @click="firstLoad(tab, true)" icon="mdi-refresh" />
      <v-btn class="post-news-btn" @click="showList = true" icon="mdi-view-list" />
      <v-btn
        class="post-news-btn"
        @click="switchAnno"
        v-if="gid === '2'"
        prepend-icon="mdi-bullhorn"
      >
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
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToChannel from "@comp/pageNews/to-channel.vue";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import Mys from "@Mys/index.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, triggerRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type NewsType, NewsTypeEnum, useAppStore } from "@/store/modules/app.js";
import TGLogger from "@/utils/TGLogger.js";
import { createPost } from "@/utils/TGWindow.js";
import { getGameName } from "@/web/utils/tools.js";

type PostData = { [key in NewsType]: Array<TGApp.Plugins.Mys.Post.FullData> };
type RawData = { [key in NewsType]: { isLast: boolean; name: string; lastId: number } };

const router = useRouter();
const { recentNewsType } = storeToRefs(useAppStore());
const tabValues: Readonly<Array<NewsType>> = ["notice", "activity", "news"];
const { gid } = <{ gid: string }>useRoute().params;
const gameName = getGameName(Number(gid));
const loading = ref<boolean>(false);
const showList = ref<boolean>(false);
const showSearch = ref<boolean>(false);
const search = ref<string>("");
const postData = shallowRef<PostData>({ notice: [], activity: [], news: [] });
const rawData = shallowRef<RawData>({
  notice: { isLast: false, name: "公告", lastId: 0 },
  activity: { isLast: false, name: "活动", lastId: 0 },
  news: { isLast: false, name: "咨讯", lastId: 0 },
});
const tab = computed<NewsType>({
  get: () => ((recentNewsType.value satisfies NewsType) ? recentNewsType.value : "notice"),
  set: (v) => (recentNewsType.value = v),
});

onMounted(async () => await firstLoad(tab.value));

async function firstLoad(key: NewsType, refresh: boolean = false): Promise<void> {
  if (rawData.value[key].lastId !== 0) {
    if (!refresh) return;
    postData.value[key] = [];
    rawData.value[key].lastId = 0;
  }
  showLoading.start(`正在获取${gameName}${rawData.value[key].name}数据...`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const getData = await Mys.Painter.getNewsList(gid, NewsTypeEnum[key]);
  rawData.value[key].isLast = getData.is_last;
  rawData.value[key].lastId = getData.list.length;
  postData.value[key] = getData.list;
  triggerRef(postData);
  triggerRef(rawData);
  showLoading.end();
  await TGLogger.Info(`[News][${gid}][firstLoad] 获取${rawData.value[key].name}数据成功`);
}

async function switchAnno(): Promise<void> {
  await TGLogger.Info(`[News][${gid}][switchAnno] 切换公告`);
  await router.push("/announcements");
}

// 加载更多
async function loadMore(key: NewsType): Promise<void> {
  loading.value = true;
  if (rawData.value[key].isLast) {
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  showLoading.start(`正在获取${gameName}${rawData.value[key].name}数据...`);
  const getData = await Mys.Painter.getNewsList(
    gid,
    NewsTypeEnum[key],
    20,
    rawData.value[key].lastId,
  );
  rawData.value[key].lastId = rawData.value[key].lastId + getData.list.length;
  rawData.value[key].isLast = getData.is_last;
  postData.value[key] = postData.value[key].concat(getData.list);
  triggerRef(postData);
  triggerRef(rawData);
  if (rawData.value[key].isLast) {
    showLoading.end();
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  showLoading.end();
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
    return;
  }
  await createPost(search.value);
  showSearch.value = false;
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
  border-radius: 3px;
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
