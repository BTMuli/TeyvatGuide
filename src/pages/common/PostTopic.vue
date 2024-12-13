<template>
  <v-app-bar>
    <template #prepend>
      <div class="post-topic-top" v-if="topicInfo">
        <img :src="topicInfo.topic.cover" alt="cover" />
        <div class="post-topic-info">
          <span>{{ topicInfo.topic.name }}({{ topic }})</span>
          <span :title="topicInfo.topic.desc">{{ topicInfo.topic.desc }}</span>
        </div>
      </div>
    </template>
    <template #extension>
      <TGameNav :model-value="curGid" v-if="curGid !== 0" />
    </template>
    <div class="post-topic-switch">
      <v-select
        v-model="curGame"
        class="post-switch-item"
        :items="topicInfo?.game_info_list"
        item-title="name"
        :item-value="(item) => item"
        variant="outlined"
        label="分区"
      />
      <v-select
        v-model="curSortType"
        class="post-switch-item"
        :items="sortList"
        item-title="text"
        item-value="value"
        variant="outlined"
        label="排序"
      />
      <v-text-field
        v-model="search"
        class="post-switch-item"
        append-inner-icon="mdi-magnify"
        label="请输入帖子 ID 或搜索词"
        variant="outlined"
        :single-line="true"
        :hide-details="true"
        @click:append="searchPost"
        @keyup.enter="searchPost"
      />
      <v-btn class="post-topic-btn" @click="firstLoad()" prepend-icon="mdi-refresh">刷新</v-btn>
    </div>
  </v-app-bar>
  <div class="post-topic-grid">
    <div v-for="post in posts" :key="post.post.post_id">
      <TPostCard :model-value="post" v-if="post" />
    </div>
  </div>
  <div class="load-more">
    <v-btn class="post-topic-btn" @click="freshPostData()">
      已加载：{{ posts.length }}，加载更多
    </v-btn>
  </div>
  <VpOverlaySearch :gid="curGid.toString()" v-model="showSearch" :keyword="search" />
</template>
<script lang="ts" setup>
import TGameNav from "@comp/app/t-gameNav.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import Mys from "@Mys/index.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { createPost } from "@/utils/TGWindow.js";

type SortSelect = { text: string; value: number };

const { gid, topic } = <{ gid: string; topic: string }>useRoute().params;
const showSearch = ref<boolean>(false);
const curGid = ref<number>(Number(gid));
const curSortType = ref<0 | 1 | 2>(0);
const search = ref<string>("");
const lastPostId = ref<string>();
const isLastPage = ref<boolean>(false);
const topicInfo = shallowRef<TGApp.Plugins.Mys.Topic.InfoData>();
const posts = shallowRef<Array<TGApp.Plugins.Mys.Post.FullData>>([]);
const curGame = shallowRef<TGApp.Plugins.Mys.Topic.GameInfo>();
const sortList = computed<Array<SortSelect>>(() => {
  if (!topicInfo.value) return [];
  if (!topicInfo.value.good_post_exist) {
    return [
      { text: "最新", value: 0 },
      { text: "热门", value: 2 },
    ];
  }
  return [
    { text: "最新", value: 0 },
    { text: "热门", value: 2 },
    { text: "精选", value: 1 },
  ];
});

onMounted(async () => {
  showLoading.start(`正在加载话题${topic}信息`);
  const info = await Mys.Post.getTopicFullInfo(gid, topic);
  if ("retcode" in info) {
    showLoading.end();
    showSnackbar.error(`[${info.retcode}] ${info.message}`);
    return;
  }
  topicInfo.value = info;
  if (curGame.value === undefined) {
    curGame.value = info.game_info_list.find((i) => i.id === curGid.value);
  }
  if (curGame.value === undefined) curGame.value = info.game_info_list[0];
  await firstLoad();
});

watch(
  () => curGame.value,
  async () => {
    if (curGame.value) curGid.value = curGame.value.id;
    await firstLoad();
  },
);
watch(
  () => curSortType.value,
  async () => await firstLoad(),
);

async function firstLoad(): Promise<void> {
  if (curGame.value) showLoading.update(`正在加载${curGame.value.name}帖子列表`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const postList = await Mys.Post.getTopicPostList(curGid.value, topic, curSortType.value);
  if ("retcode" in postList) {
    showLoading.end();
    showSnackbar.error(`[${postList.retcode}] ${postList.message}`);
    return;
  }
  isLastPage.value = postList.is_last;
  lastPostId.value = postList.last_id;
  posts.value = postList.posts;
  showLoading.end();
  showSnackbar.success(`加载了 ${postList.posts.length} 条帖子`);
}

async function freshPostData(): Promise<void> {
  if (isLastPage.value) {
    showSnackbar.warn("已经到底了");
    return;
  }
  showLoading.start("正在加载帖子列表");
  const postList = await Mys.Post.getTopicPostList(
    curGid.value,
    topic,
    curSortType.value,
    lastPostId.value,
  );
  if ("retcode" in postList) {
    showLoading.end();
    showSnackbar.error(`[${postList.retcode}] ${postList.message}`);
    return;
  }
  isLastPage.value = postList.is_last;
  lastPostId.value = postList.last_id;
  posts.value = posts.value.concat(postList.posts);
  showLoading.end();
  showSnackbar.success(`加载了 ${postList.posts.length} 条帖子`);
}

function searchPost(): void {
  if (search.value === "") {
    showSnackbar.warn("请输入搜索内容");
    return;
  }
  const numCheck = Number(search.value);
  if (isNaN(numCheck)) showSearch.value = true;
  else createPost(search.value);
}
</script>
<style lang="css" scoped>
.post-topic-top {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  padding-right: 5px;
  border-radius: 5px;
  background: var(--box-bg-2);
  gap: 5px;

  img {
    width: 64px;
    height: 64px;
  }

  .post-topic-info {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 5px;

    :first-child {
      color: var(--common-text-title);
      font-family: var(--font-title);
      font-size: 20px;
    }

    :last-child {
      overflow: hidden;
      height: 24px;
      max-lines: 1;
      text-overflow: ellipsis;
      word-break: break-all;
    }
  }
}

.post-topic-switch {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin: 0 10px;
  gap: 10px;
}

.post-switch-item {
  width: 250px;
  height: 50px;
}

.post-topic-btn {
  height: 40px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .post-topic-btn {
  border: 1px solid var(--common-shadow-2);
}

.post-topic-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px;
  font-family: var(--font-title);
  transition: all 0.3s linear;
}
</style>
