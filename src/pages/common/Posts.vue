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
        label="请输入帖子 ID"
        variant="outlined"
        :single-line="true"
        hide-details
        @click:append="searchPost"
        @keyup.enter="searchPost"
      />
      <v-btn class="post-fresh-btn" @click="freshPostData(false)">
        <v-icon>mdi-refresh</v-icon>
        <span>刷新</span>
      </v-btn>
    </div>
    <div class="posts-nav">
      <div
        v-for="navItem in nav"
        :key="navItem.id"
        class="post-nav"
        @click="toNav(navItem.app_path)"
      >
        <img alt="navIcon" :src="navItem.icon" />
        <span>{{ navItem.name }}</span>
      </div>
    </div>
    <!-- todo 无限加载 -->
    <div class="posts-grid">
      <v-card v-for="post in posts" :key="post.postId" class="post-card">
        <div class="post-cover" @click="createPost(post)">
          <img :src="post.cover" alt="cover" />
        </div>
        <div class="post-content">
          <div class="post-card-title" :title="post.title">{{ post.title }}</div>
          <div class="post-card-user">
            <div class="pcu-left">
              <div class="pcu-icon">
                <img :src="post.user.icon" alt="userIcon" />
              </div>
              <div v-if="post.user.pendant !== ''" class="pcu-pendent">
                <img :src="post.user.pendant" alt="userPendant" />
              </div>
            </div>
            <div class="pcu-right">
              <span>{{ post.user.nickname }}</span>
              <span :title="post.user.label">{{ post.user.label }}</span>
            </div>
          </div>
          <div class="post-card-data">
            <div class="pcd-item" :title="`浏览数：${post.data.view}`">
              <v-icon>mdi-eye</v-icon>
              <span>{{ post.data.view }}</span>
            </div>
            <div class="pcd-item" :title="`收藏数：${post.data.mark}`">
              <v-icon>mdi-star</v-icon>
              <span>{{ post.data.mark }}</span>
            </div>
            <div class="pcd-item" :title="`回复数：${post.data.reply}`">
              <v-icon>mdi-comment</v-icon>
              <span>{{ post.data.reply }}</span>
            </div>
            <div class="pcd-item" :title="`点赞数：${post.data.like}`">
              <v-icon>mdi-thumb-up</v-icon>
              <span>{{ post.data.like }}</span>
            </div>
            <div class="pcd-item" :title="`转发数：${post.data.forward}`">
              <v-icon>mdi-share-variant</v-icon>
              <span>{{ post.data.forward }}</span>
            </div>
          </div>
        </div>
        <div class="post-card-forum" :title="`频道: ${post.forum.name}`">
          <img :src="post.forum.icon" :alt="post.forum.name" />
          <span>{{ post.forum.name }}</span>
        </div>
      </v-card>
    </div>
    <!-- todo 完善 loadmore   -->
    <div class="load-more">
      <v-btn :loading="loading" @click="freshPostData(true)">
        第{{ rawData.page }}页，已加载：{{ posts.length }}，加载更多
      </v-btn>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import ToLoading from "../../components/overlay/to-loading.vue";
import Mys from "../../plugins/Mys";
import TGClient from "../../utils/TGClient";
import { createPost } from "../../utils/TGWindow";

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
const rawData = ref({ page: 1, is_last: false });

// 游戏相关
const curGameLabel = ref<keyof typeof gameList>("原神");
const gameItem = ref<string[]>([
  "原神",
  "崩坏：星穹铁道",
  "崩坏3",
  "崩坏2",
  "未定事件簿",
  "绝区零",
  "大别野",
]);
const curGid = ref<number>(2);

// 排序相关
const curSortLabel = ref<keyof typeof sortList>("默认排序");
const sortItem = ref<string[]>(["默认排序", "最新回复", "最新发布"]);
const curSortType = ref<number>(0);

// 渲染数据
const posts = ref<TGApp.Plugins.Mys.Forum.RenderCard[]>([]);
const nav = ref<TGApp.BBS.Navigator.Navigator[]>([]);
const search = ref<string>();

onMounted(async () => {
  loading.value = true;
  await freshNavData();
  await freshPostData(false);
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
    await freshPostData(false);
  }
  await freshNavData();
});

// 监听论坛变化
watch(curForumLabel, async (newVal) => {
  freshCurForum(newVal);
  await freshPostData(false);
});

// 监听排序变化
watch(curSortLabel, async (newVal) => {
  curSortType.value = sortList[newVal];
  await freshPostData(false);
});

async function toNav(path: string): Promise<void> {
  const link = new URL(path);
  const mysList = [
    "https://act.mihoyo.com",
    "https://webstatic.mihoyo.com",
    "https://bbs.mihoyo.com",
    "https://qaa.miyoushe.com",
  ];
  if (link.protocol != "https:") {
    toBBS(link);
    return;
  }
  // 如果不在上面的域名里面，就直接打开
  if (!mysList.includes(link.origin)) {
    window.open(path);
    return;
  }
  const modeConfirm = await showConfirm({
    title: "是否采用宽屏模式打开？",
    text: "取消则采用竖屏模式打开",
  });
  if (modeConfirm === undefined) {
    showSnackbar({
      text: "已取消打开",
      color: "cancel",
    });
    return;
  }
  if (modeConfirm) await TGClient.open("web_act", path);
  else await TGClient.open("web_act_thin", path);
}

// 处理 protocol
function toBBS(link: URL): void {
  if (link.protocol == "mihoyobbs:") {
    if (link.pathname.startsWith("//article")) {
      const postId = link.pathname.split("/").pop();
      createPost(<string>postId);
      return;
    }
    if (link.pathname.startsWith("//forum")) {
      const forumId = link.pathname.split("/").pop();
      const url = `https://www.miyoushe.com/ys/home/${forumId}`;
      window.open(url);
      return;
    }
  }
  showSnackbar({
    text: `不支持的链接：${link.href}`,
    color: "warn",
  });
}

async function freshNavData(): Promise<void> {
  nav.value = await Mys.Posts.nav(curGid.value);
}

async function freshPostData(more: boolean = false): Promise<void> {
  loading.value = true;
  loadingTitle.value = `正在加载 ${curGameLabel.value}-${curForumLabel.value}-${curSortLabel.value} 的数据`;
  if (more) {
    const postsGet = await Mys.Posts.get(
      curForum.value,
      curGid.value,
      curSortType.value,
      rawData.value.page,
    );
    if (rawData.value.is_last) {
      showSnackbar({
        text: "已经是最后一页了",
        color: "warn",
      });
      loading.value = false;
      return;
    }
    posts.value = posts.value.concat(Mys.Posts.card(postsGet));
    rawData.value.is_last = postsGet.is_last;
    rawData.value.page = postsGet.page;
  } else {
    const postsGet = await Mys.Posts.get(curForum.value, curGid.value, curSortType.value);
    posts.value = Mys.Posts.card(postsGet);
    rawData.value.is_last = false;
    rawData.value.page = 1;
  }
  await nextTick();
  loading.value = false;
}

function freshCurForum(newVal: string): void {
  const forum = forumList[curGameLabel.value];
  // @ts-ignore
  curForum.value = forum[newVal];
}

// 查询帖子
function searchPost(): void {
  if (search.value === undefined || search.value === "") {
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
.posts-box {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.posts-nav {
  display: flex;
  flex-wrap: wrap;
  padding: 5px;
  gap: 10px 10px;
}

.post-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-t-4);
  box-shadow: 0 0 5px var(--common-shadow-4);
  color: var(--tgc-white-1);
  cursor: pointer;
}

.post-nav img {
  width: 25px;
  height: 25px;
}

.posts-nav span {
  display: none;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
}

.post-nav:hover span {
  display: block;
}

.posts-switch {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 5px;
  column-gap: 10px;
}

.post-switch-item {
  max-width: 200px;
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

.post-card {
  border-radius: 5px;
  background: var(--app-page-bg);
  color: var(--box-text-1);
}

.dark .post-card {
  border: 1px solid var(--common-shadow-2);
}

.post-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 36 / 13;
}

.post-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.post-content {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}

.post-card-title {
  overflow: hidden;
  width: 100%;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-card-user {
  display: flex;
}

.pcu-left {
  position: relative;
  width: 50px;
  height: 50px;
}

.pcu-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.pcu-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pcu-pendent {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 50px;
  height: 50px;
}

.pcu-pendent img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pcu-right {
  position: relative;
  display: flex;
  max-width: calc(100% - 50px);
  height: 50px;
  flex-direction: column;
  align-items: start;
  color: var(--box-text-4);
}

.pcu-right :nth-child(1) {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: start;
  font-size: 16px;
}

.pcu-right :nth-child(2) {
  overflow: hidden;
  width: 100%;
  height: 20px;
  border-top: 2px solid var(--common-shadow-2);
  font-size: 14px;
  opacity: 0.7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-card-forum {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/20%);
  border-bottom-left-radius: 5px;
  border-top-right-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
}

.post-card-forum img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.post-cover img:hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.post-card-data {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
  column-gap: 10px;
}

.pcd-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-7);
  font-size: 12px;
  gap: 5px;
  opacity: 0.6;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px;
  font-family: var(--font-title);
  transition: all 0.3s linear;
}

.load-more button {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
