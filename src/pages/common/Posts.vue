<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="posts-box">
    <div class="posts-switch">
      <v-select
        v-model="curGameLabel"
        class="post-switch-item"
        :items="gameItem"
        variant="outlined"
        label="游戏"
      />
      <v-select
        v-model="curForumLabel"
        class="post-switch-item"
        :items="forumItem"
        variant="outlined"
        label="频道"
      />
      <v-select
        v-model="curSortLabel"
        class="post-switch-item"
        :items="sortItem"
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
        hide-details
        @click:append="searchPost"
        @keyup.enter="searchPost"
      />
      <v-btn rounded class="post-fresh-btn" @click="freshPostData()">
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
import { nextTick, onMounted, ref, watch } from "vue";

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

// 常量
const sortList = {
  默认排序: 0,
  最新回复: 1,
  最新发布: 2,
};
const forumGenshin = {
  酒馆: 26,
  攻略: 43,
  同人图: 29,
  COS: 49,
  硬核: 50,
};
const forumSr = {
  候车室: 52,
  攻略: 61,
  同人图: 56,
  COS: 62,
};
const forumBh3 = {
  甲板: 1,
  攻略: 14,
  同人图: 4,
  同人文: 41,
};
const forumBh2 = {
  学园: 30,
  攻略: 51,
  同人图: 40,
};
const forumWd = {
  律所: 37,
  攻略: 60,
  同人文: 42,
  同人图: 38,
};
const forumZzz = {
  咖啡馆: 57,
  同人图: 59,
  攻略: 64,
  COS: 65,
};
const forumDby = {
  校园: 54,
  ACG: 35,
  生活: 34,
  同人图: 39,
  COS: 47,
  脑洞: 48,
  科技: 55,
  公告: 36,
};
const forumList = {
  原神: forumGenshin,
  "崩坏：星穹铁道": forumSr,
  崩坏3: forumBh3,
  崩坏2: forumBh2,
  未定事件簿: forumWd,
  绝区零: forumZzz,
  大别野: forumDby,
};
const gameList = {
  原神: 2,
  "崩坏：星穹铁道": 6,
  崩坏3: 1,
  崩坏2: 3,
  未定事件簿: 4,
  绝区零: 8,
  大别野: 5,
};

// 渲染参数
const curForumLabel = ref<string>("酒馆");
const forumItem = ref<string[]>(["酒馆", "攻略", "同人图", "COS", "硬核"]);
const curForum = ref<number>(26);

// 游戏相关
const curGameLabel = ref<keyof typeof gameList>("原神");
const gameItem = ref<string[]>([
  "原神",
  "崩坏：星穹铁道",
  "绝区零",
  "崩坏3",
  "崩坏2",
  "未定事件簿",
  "大别野",
]);
const curGid = ref<number>(2);

// 排序相关
const curSortLabel = ref<keyof typeof sortList>("默认排序");
const sortItem = ref<string[]>(["默认排序", "最新回复", "最新发布"]);
const curSortType = ref<number>(0);

// 渲染数据
const posts = ref<TGApp.Plugins.Mys.Post.FullData[]>([]);
const search = ref<string>("");
const showSearch = ref<boolean>(false);

onMounted(async () => {
  await TGLogger.Info(
    `[Posts][${curGameLabel.value}][onMounted][${curForumLabel.value}] 打开帖子列表`,
  );
  loading.value = true;
  await freshPostData();
  loading.value = false;
});

// 监听游戏变化
watch(curGameLabel, async (newVal) => {
  curGid.value = gameList[newVal];
  forumItem.value = Object.keys(forumList[newVal]);
  if (!forumItem.value.includes(curForumLabel.value)) {
    curForumLabel.value = forumItem.value[0];
    freshCurForum(forumItem.value[0]);
  } else {
    freshCurForum(curForumLabel.value);
    await freshPostData();
  }
});

// 监听论坛变化
watch(curForumLabel, async (newVal) => {
  freshCurForum(newVal);
  await freshPostData();
});

// 监听排序变化
watch(curSortLabel, async (newVal) => {
  curSortType.value = sortList[newVal];
  await freshPostData();
});

async function freshPostData(): Promise<void> {
  await TGLogger.Info(
    `[Posts][${curGameLabel.value}][freshPostData][${curForumLabel.value}] 刷新帖子列表`,
  );
  loading.value = true;
  loadingTitle.value = `正在加载 ${curGameLabel.value}-${curForumLabel.value}-${curSortLabel.value} 的数据`;
  const postsGet = await Mys.Posts.get(curForum.value, curSortType.value);
  posts.value = postsGet.list;
  await nextTick();
  loading.value = false;
}

function freshCurForum(newVal: string): void {
  const forum = forumList[curGameLabel.value];
  // todo，这边需要优化逻辑以经过测试，目前暂时ignore
  // @ts-expect-error-next-line Vue: Element implicitly has an any type because expression of type string can't be used to index type
  curForum.value = forum[newVal];
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
