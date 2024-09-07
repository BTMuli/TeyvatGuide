<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="posts-box">
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
      <v-btn :rounded="true" class="post-fresh-btn" @click="freshPostData()">
        <v-icon>mdi-refresh</v-icon>
        <span>刷新</span>
      </v-btn>
    </div>
    <TGameNav :model-value="curGid" />
    <div class="posts-grid">
      <div v-for="post in posts" :key="post.post.post_id">
        <TPostCard :model-value="post" v-if="post" />
      </div>
    </div>
  </div>
  <ToPostSearch :gid="curGid.toString()" v-model="showSearch" :keyword="search" />
</template>
<script setup lang="ts">
import { nextTick, onBeforeMount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import showSnackbar from "../../components/func/snackbar.js";
import TGameNav from "../../components/main/t-gamenav.vue";
import TPostCard from "../../components/main/t-postcard.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import ToPostSearch from "../../components/post/to-postSearch.vue";
import Mys from "../../plugins/Mys/index.js";
import TGLogger from "../../utils/TGLogger.js";
import { createPost } from "../../utils/TGWindow.js";

const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载数据");

type SortSelect = {
  text: string;
  value: number;
};
type SortSelectGame = {
  gid: number;
  forum: SortSelect[];
  text: string;
};

const sortOrderList: SortSelect[] = [
  { text: "默认排序", value: 0 },
  { text: "最新回复", value: 1 },
  { text: "最新发布", value: 2 },
];
const forumYsList: SortSelect[] = [
  { text: "酒馆", value: 26 },
  { text: "攻略", value: 43 },
  { text: "同人图", value: 29 },
  { text: "COS", value: 49 },
  { text: "硬核", value: 50 },
];
const forumSrList: SortSelect[] = [
  { text: "候车室", value: 52 },
  { text: "攻略", value: 61 },
  { text: "同人图", value: 56 },
  { text: "COS", value: 62 },
];
const forumBh3List: SortSelect[] = [
  { text: "甲板", value: 1 },
  { text: "攻略", value: 14 },
  { text: "同人图", value: 4 },
  { text: "同人文", value: 41 },
];
const forumBh2List: SortSelect[] = [
  { text: "学园", value: 30 },
  { text: "攻略", value: 51 },
  { text: "同人图", value: 40 },
];
const forumWdList: SortSelect[] = [
  { text: "律所", value: 37 },
  { text: "攻略", value: 60 },
  { text: "同人文", value: 42 },
  { text: "同人图", value: 38 },
];
const forumZzzList: SortSelect[] = [
  { text: "咖啡馆", value: 57 },
  { text: "攻略", value: 64 },
  { text: "同人图", value: 59 },
  { text: "COS", value: 65 },
];
const forumDbyList: SortSelect[] = [
  { text: "校园", value: 54 },
  { text: "ACG", value: 35 },
  { text: "生活", value: 34 },
  { text: "同人图", value: 39 },
  { text: "COS", value: 47 },
  { text: "脑洞", value: 48 },
  { text: "科技", value: 55 },
  { text: "公告", value: 36 },
];
const sortGameList: SortSelectGame[] = [
  {
    gid: 2,
    forum: forumYsList,
    text: "原神",
  },
  {
    gid: 6,
    forum: forumSrList,
    text: "崩坏：星穹铁道",
  },
  {
    gid: 1,
    forum: forumBh3List,
    text: "崩坏3",
  },
  {
    gid: 3,
    forum: forumBh2List,
    text: "崩坏2",
  },
  {
    gid: 4,
    forum: forumWdList,
    text: "未定事件簿",
  },
  {
    gid: 8,
    forum: forumZzzList,
    text: "绝区零",
  },
  {
    gid: 5,
    forum: forumDbyList,
    text: "大别野",
  },
];

// 路由
const gid = useRoute().params.gid;
const forum = useRoute().params.forum;

function getGameForums(gid: number): SortSelect[] {
  const game = sortGameList.find((item) => item.gid === gid);
  if (game) {
    return game.forum;
  }
  return [];
}

function getGameLabel(gid: number): string {
  const game = sortGameList.find((item) => item.gid === gid);
  if (game) {
    return game.text;
  }
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

// 渲染参数
const curGid = ref<number>(2);
const curSortType = ref<number>(0);
const curForum = ref<number>(26);
const curForumLabel = ref<string>("");

// 渲染数据
const posts = ref<TGApp.Plugins.Mys.Post.FullData[]>([]);
const search = ref<string>("");
const showSearch = ref<boolean>(false);

onBeforeMount(async () => {
  if (gid && typeof gid === "string") {
    curGid.value = Number(gid);
  }
  if (forum && typeof forum === "string") {
    curForum.value = Number(forum);
  }
});

onMounted(async () => {
  const gameLabel = getGameLabel(curGid.value);
  const forumLabel = getForumLabel(curGid.value, curForum.value);
  await TGLogger.Info(`[Posts][${gameLabel}][onMounted][${forumLabel}] 打开帖子列表`);
  loading.value = true;
  await freshPostData();
  curForumLabel.value = forumLabel;
  loading.value = false;
});

watch(
  () => curGid.value,
  async (newVal: number) => {
    const forums = getGameForums(newVal);
    const forumFind = forums.find((item) => item.text === curForumLabel.value);
    if (forumFind) {
      curForum.value = forumFind.value;
    } else {
      curForum.value = forums[0].value;
    }
    await nextTick();
    showSnackbar({
      text: `已将分区切换到 ${getGameLabel(newVal)}`,
      color: "success",
    });
  },
);

watch(
  () => curForum.value,
  async () => {
    await freshPostData();
    const oldForumLabel = JSON.parse(JSON.stringify(curForumLabel.value));
    curForumLabel.value = getForumLabel(curGid.value, curForum.value);
    if (oldForumLabel !== curForumLabel.value) {
      showSnackbar({
        text: `已将版块切换到 ${curForumLabel.value}`,
        color: "success",
      });
    }
  },
);

// 监听排序变化
watch(
  () => curSortType.value,
  async (newVal) => {
    await freshPostData();
    const sortLabel = getSortLabel(newVal);
    showSnackbar({
      text: `已将排序切换到 ${sortLabel}`,
      color: "success",
    });
  },
);

async function freshPostData(): Promise<void> {
  const gameLabel = getGameLabel(curGid.value);
  const forumLabel = getForumLabel(curGid.value, curForum.value);
  const sortLabel = getSortLabel(curSortType.value);
  await TGLogger.Info(
    `[Posts][${gameLabel}][freshPostData][${forumLabel}][${sortLabel}] 刷新帖子列表`,
  );
  loading.value = true;
  loadingTitle.value = `正在加载 ${gameLabel}-${forumLabel}-${sortLabel} 数据`;
  const postsGet = await Mys.Posts.get(curForum.value, curSortType.value, 12);
  posts.value = postsGet.list;
  await nextTick();
  loading.value = false;
}

// 查询帖子
function searchPost(): void {
  if (search.value === "") {
    showSnackbar({
      text: "请输入搜索内容",
      color: "error",
    });
    return;
  }
  const numCheck = Number(search.value);
  if (isNaN(numCheck)) {
    showSearch.value = true;
  } else {
    createPost(search.value);
  }
}
</script>
<style lang="css" scoped>
.posts-box {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.posts-switch {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 5px;
  column-gap: 10px;
}

.post-switch-item {
  width: fit-content;
  height: 50px;
}

.post-fresh-btn {
  height: 40px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .post-fresh-btn {
  border: 1px solid var(--common-shadow-2);
}

.posts-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}
</style>
