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
          已加载：{{ rawData[value].lastId }}，
          {{ rawData[value].isLast ? "已加载完毕" : "加载更多" }}
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
import { storeToRefs } from "pinia";
import type { Ref } from "vue";
import { computed, onMounted, reactive, ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type NewsType, NewsTypeEnum, useAppStore } from "@/store/modules/app.js";
import TGBbs from "@/utils/TGBbs.js";
import TGLogger from "@/utils/TGLogger.js";
import { createPost } from "@/utils/TGWindow.js";
import painterReq from "@/web/request/painterReq.js";

type PostData = { [key in NewsType]: Ref<Array<TGApp.BBS.Post.FullData>> };
type RawItem = { isLast: boolean; name: string; lastId: number };
type RawData = { [key in NewsType]: Ref<RawItem> };

const router = useRouter();
const { recentNewsType } = storeToRefs(useAppStore());
const { gid } = <{ gid: string }>useRoute().params;

const tabValues: Readonly<Array<NewsType>> = ["notice", "activity", "news"];
const gameName = TGBbs.channels.find((v) => v.gid.toString() === gid)?.title || "未知分区";

const loading = ref<boolean>(false);
const showList = ref<boolean>(false);
const showSearch = ref<boolean>(false);
const search = ref<string>("");
const postData = reactive<PostData>({
  notice: shallowRef<Array<TGApp.BBS.Post.FullData>>([]),
  activity: shallowRef<Array<TGApp.BBS.Post.FullData>>([]),
  news: shallowRef<Array<TGApp.BBS.Post.FullData>>([]),
});
const rawData = reactive<RawData>({
  notice: shallowRef<RawItem>({ isLast: false, name: "公告", lastId: 0 }),
  activity: shallowRef<RawItem>({ isLast: false, name: "活动", lastId: 0 }),
  news: shallowRef<RawItem>({ isLast: false, name: "咨讯", lastId: 0 }),
});
const tab = computed<NewsType>({
  get: () => ((recentNewsType.value satisfies NewsType) ? recentNewsType.value : "notice"),
  set: (v) => (recentNewsType.value = v),
});

onMounted(async () => await firstLoad(tab.value));

async function firstLoad(key: NewsType, refresh: boolean = false): Promise<void> {
  if (rawData[key].lastId !== 0) {
    if (!refresh) return;
    postData[key] = [];
    rawData[key].lastId = 0;
  }
  await showLoading.start(`正在获取${gameName}${rawData[key].name}数据`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const getData = await painterReq.news(gid, NewsTypeEnum[key]);
  await showLoading.update(`数量：${getData.list.length}，是否最后一页：${getData.is_last}`);
  rawData[key] = { isLast: getData.is_last, name: rawData[key].name, lastId: getData.list.length };
  postData[key] = getData.list;
  await showLoading.end();
  await TGLogger.Info(`[News][${gid}][firstLoad] 获取${rawData[key].name}数据成功`);
  showSnackbar.success(`获取${gameName}${rawData[key].name}数据成功，共 ${getData.list.length} 条`);
}

async function switchAnno(): Promise<void> {
  await TGLogger.Info(`[News][${gid}][switchAnno] 切换公告`);
  await router.push("/announcements");
}

// 加载更多
async function loadMore(key: NewsType): Promise<void> {
  loading.value = true;
  if (rawData[key].isLast) {
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  await showLoading.start(`正在获取${gameName}${rawData[key].name}数据`);
  const mod = rawData[key].lastId % 20;
  const pageSize = mod === 0 ? 20 : 20 - mod;
  const getData = await painterReq.news(gid, NewsTypeEnum[key], pageSize, rawData[key].lastId);
  await showLoading.update(`数量：${getData.list.length}，是否最后一页：${getData.is_last}`);
  rawData[key].lastId = rawData[key].lastId + getData.list.length;
  rawData[key].isLast = getData.is_last;
  postData[key] = postData[key].concat(getData.list);
  if (rawData[key].isLast) {
    await showLoading.end();
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  await showLoading.end();
  loading.value = false;
  showSnackbar.success(`加载成功，共加载 ${getData.list.length} 条`);
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
  grid-auto-rows: auto;
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
