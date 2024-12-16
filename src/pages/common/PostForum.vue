<template>
  <v-app-bar>
    <template #prepend>
      <div class="posts-top">
        <img src="/source/UI/posts.png" alt="posts" />
        <span>帖子</span>
      </div>
    </template>
    <div class="posts-switch">
      <v-select
        v-model="curGid"
        class="post-switch-item"
        :items="sortGameList"
        item-title="text"
        item-value="gid"
        variant="outlined"
        label="分区"
      />
      <v-select
        v-model="curForum"
        class="post-switch-item"
        :items="getGameForums(curGid)"
        item-title="text"
        item-value="value"
        variant="outlined"
        label="版块"
      />
      <v-select
        v-model="curSortType"
        class="post-switch-item"
        :items="sortOrderList"
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
      <v-btn :rounded="true" class="post-forum-btn" @click="freshPostData()">
        <v-icon>mdi-refresh</v-icon>
        <span>刷新</span>
      </v-btn>
    </div>
    <template #extension>
      <TGameNav :model-value="curGid" />
    </template>
  </v-app-bar>
  <div class="posts-grid">
    <div v-for="post in posts" :key="post.post.post_id">
      <TPostCard :model-value="post" v-if="post" />
    </div>
  </div>
  <div class="posts-load-more">
    <v-btn class="post-forum-btn" :rounded="true" @click="loadMore()">
      已加载：{{ posts.length }}，加载更多
    </v-btn>
  </div>
  <VpOverlaySearch :gid="curGid.toString()" v-model="showSearch" :keyword="search" />
</template>
<script setup lang="ts">
import TGameNav from "@comp/app/t-gameNav.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import Mys from "@Mys/index.js";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import TGLogger from "@/utils/TGLogger.js";
import { createPost } from "@/utils/TGWindow.js";

type SortSelect = { text: string; value: number };
type SortSelectGame = { gid: number; forum: Array<SortSelect>; text: string };

const sortOrderList: Array<SortSelect> = [
  { text: "最新回复", value: 1 },
  { text: "最新发布", value: 2 },
  { text: "热门", value: 3 },
];
const forumYsList: Array<SortSelect> = [
  { text: "酒馆", value: 26 },
  { text: "攻略", value: 43 },
  { text: "同人图", value: 29 },
  { text: "COS", value: 49 },
  { text: "硬核", value: 50 },
];
const forumSrList: Array<SortSelect> = [
  { text: "候车室", value: 52 },
  { text: "攻略", value: 61 },
  { text: "同人图", value: 56 },
  { text: "COS", value: 62 },
];
const forumBh3List: Array<SortSelect> = [
  { text: "甲板", value: 1 },
  { text: "攻略", value: 14 },
  { text: "同人图", value: 4 },
  { text: "同人文", value: 41 },
];
const forumBh2List: Array<SortSelect> = [
  { text: "学园", value: 30 },
  { text: "攻略", value: 51 },
  { text: "同人图", value: 40 },
];
const forumWdList: Array<SortSelect> = [
  { text: "律所", value: 37 },
  { text: "攻略", value: 60 },
  { text: "同人文", value: 42 },
  { text: "同人图", value: 38 },
];
const forumZzzList: Array<SortSelect> = [
  { text: "咖啡馆", value: 57 },
  { text: "攻略", value: 64 },
  { text: "同人图", value: 59 },
  { text: "COS", value: 65 },
];
const forumDbyList: Array<SortSelect> = [
  { text: "校园", value: 54 },
  { text: "ACG", value: 35 },
  { text: "生活", value: 34 },
  { text: "同人图", value: 39 },
  { text: "COS", value: 47 },
  { text: "脑洞", value: 48 },
  { text: "科技", value: 55 },
  { text: "公告", value: 36 },
];
const sortGameList: Readonly<Array<SortSelectGame>> = [
  { gid: 2, forum: forumYsList, text: "原神" },
  { gid: 6, forum: forumSrList, text: "崩坏：星穹铁道" },
  { gid: 8, forum: forumZzzList, text: "绝区零" },
  { gid: 1, forum: forumBh3List, text: "崩坏3" },
  { gid: 3, forum: forumBh2List, text: "崩坏2" },
  { gid: 4, forum: forumWdList, text: "未定事件簿" },
  { gid: 5, forum: forumDbyList, text: "大别野" },
];
const { gid, forum } = useRoute().params;
const curGid = ref<number>(2);
const curSortType = ref<number>(1);
const curForum = ref<number>(26);
const curForumLabel = ref<string>("");
const lastId = ref<string>("");
const isLast = ref<boolean>(false);
const search = ref<string>("");
const showSearch = ref<boolean>(false);
const firstLoad = ref<boolean>(false);
const posts = shallowRef<Array<TGApp.Plugins.Mys.Post.FullData>>([]);

onMounted(async () => {
  if (gid && typeof gid === "string") curGid.value = Number(gid);
  if (forum && typeof forum === "string") curForum.value = Number(forum);
  const gameLabel = getGameLabel(curGid.value);
  const forumLabel = getForumLabel(curGid.value, curForum.value);
  await TGLogger.Info(`[Posts][${gameLabel}][onMounted][${forumLabel}] 打开帖子列表`);
  await freshPostData();
  curForumLabel.value = forumLabel;
  firstLoad.value = true;
});
watch(
  () => curGid.value,
  () => {
    const forums = getGameForums(curGid.value);
    const forumFind = forums.find((item) => item.text === curForumLabel.value);
    if (!firstLoad.value) return;
    if (forumFind) curForum.value = forumFind.value;
    else curForum.value = forums[0].value;
    showSnackbar.success(`已将分区切换到 ${getGameLabel(curGid.value)}`);
  },
);
watch(
  () => curForum.value,
  async () => {
    await freshPostData();
    const oldForumLabel = JSON.parse(JSON.stringify(curForumLabel.value));
    curForumLabel.value = getForumLabel(curGid.value, curForum.value);
    if (oldForumLabel !== curForumLabel.value) {
      showSnackbar.success(`已将版块切换到 ${curForumLabel.value}`);
    }
  },
);
watch(
  () => curSortType.value,
  async () => {
    await freshPostData();
    const sortLabel = getSortLabel(curSortType.value);
    showSnackbar.success(`已将排序切换到 ${sortLabel}`);
  },
);

function getGameForums(gid: number): SortSelect[] {
  const game = sortGameList.find((item) => item.gid === gid);
  if (game) return game.forum;
  return [];
}

function getGameLabel(gid: number): string {
  const game = sortGameList.find((item) => item.gid === gid);
  if (game) return game.text;
  return "";
}

function getForumLabel(gid: number, forum: number): string {
  const forums = getGameForums(gid);
  const forumItem = forums.find((item) => item.value === forum);
  return forumItem ? forumItem.text : "";
}

function getSortLabel(value: number): string {
  const order = sortOrderList.find((item) => item.value === value);
  return order ? order.text : "";
}

async function freshPostData(): Promise<void> {
  await showLoading.start(`正在刷新${getGameLabel(curGid.value)}帖子`);
  const gameLabel = getGameLabel(curGid.value);
  const forumLabel = getForumLabel(curGid.value, curForum.value);
  const sortLabel = getSortLabel(curSortType.value);
  await TGLogger.Info(
    `[Posts][${gameLabel}][freshPostData][${forumLabel}][${sortLabel}] 刷新帖子列表`,
  );
  await showLoading.update(`版块：${forumLabel}，排序：${sortLabel}`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const postsGet = await Mys.Post.getForumPostList(curForum.value, curSortType.value);
  posts.value = postsGet.list;
  lastId.value = postsGet.last_id;
  isLast.value = postsGet.is_last;
  await showLoading.end();
}

async function loadMore(): Promise<void> {
  if (isLast.value) {
    showSnackbar.warn("没有更多帖子了");
    return;
  }
  await showLoading.start("正在加载更多帖子数据", `游戏：${getGameLabel(curGid.value)}`);
  const postsGet = await Mys.Post.getForumPostList(curForum.value, curSortType.value, lastId.value);
  await showLoading.update(
    `版块：${curForumLabel.value}，排序：${getSortLabel(curSortType.value)}，数量：${postsGet.list.length}`,
  );
  posts.value = posts.value.concat(postsGet.list);
  lastId.value = postsGet.last_id;
  isLast.value = postsGet.is_last;
  showSnackbar.success(`加载成功，共加载 ${postsGet.list.length} 条帖子`);
  await showLoading.end();
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
.posts-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.posts-switch {
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

.post-forum-btn {
  height: 40px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .post-forum-btn {
  border: 1px solid var(--common-shadow-2);
}

.posts-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.posts-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px;
  font-family: var(--font-title);
  transition: all 0.3s linear;
}
</style>
