<!-- 帖子页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="posts-top">
        <img alt="posts" src="/source/UI/posts.webp" />
        <span>帖子</span>
      </div>
    </template>
    <div class="posts-switch">
      <v-select
        v-model="curGid"
        :disabled="isReq"
        :items="sortGameList"
        class="post-switch-item"
        item-title="text"
        item-value="gid"
        label="分区"
        variant="outlined"
      >
        <template #selection="{ item }">
          <div class="select-item main">
            <TMiImg
              v-if="item.raw.icon"
              :alt="item.raw.text"
              :ori="true"
              :src="item.raw.icon"
              :title="item.raw.text"
              class="icon"
            />
            <span>{{ item.raw.text }}</span>
          </div>
        </template>
        <template #item="{ props, item }">
          <div
            :class="{ selected: item.raw.gid === curGid }"
            class="select-item sub"
            v-bind="props"
          >
            <TMiImg
              v-if="item.raw.icon"
              :alt="item.raw.text"
              :ori="true"
              :src="item.raw.icon"
              class="icon"
            />
            <span>{{ item.raw.text }}</span>
          </div>
        </template>
      </v-select>
      <v-select
        v-model="selectedForum"
        :disabled="isReq"
        :items="curForums"
        class="post-switch-item"
        item-title="text"
        label="版块"
        variant="outlined"
      >
        <template #selection="{ item }">
          <div class="select-item main">
            <TMiImg
              :alt="item.raw.text"
              :ori="true"
              :src="item.raw.icon"
              :title="item.raw.text"
              class="icon"
            />
            <span>{{ item.raw.text }}</span>
          </div>
        </template>
        <template #item="{ props, item }">
          <div
            :class="{ selected: item.raw.value === selectedForum?.value }"
            class="select-item sub"
            v-bind="props"
            @click="selectedForum = item.raw"
          >
            <TMiImg :alt="item.raw.text" :ori="true" :src="item.raw.icon" class="icon" />
            <span>{{ item.raw.text }}</span>
          </div>
        </template>
      </v-select>
      <v-select
        v-model="curSortType"
        :disabled="isReq"
        :items="sortOrderList"
        class="post-switch-item"
        item-title="text"
        item-value="value"
        label="排序"
        variant="outlined"
      />
      <v-text-field
        v-model="search"
        :hide-details="true"
        :single-line="true"
        append-inner-icon="mdi-magnify"
        class="post-switch-item"
        label="请输入帖子 ID 或搜索词"
        variant="outlined"
        @click:append="searchPost"
        @keyup.enter="searchPost"
      />
      <v-btn
        :loading="isReq"
        :rounded="true"
        class="post-forum-btn"
        variant="elevated"
        @click="freshPostData()"
      >
        <v-icon>mdi-refresh</v-icon>
        <span>刷新</span>
      </v-btn>
    </div>
    <template #extension>
      <TGameNav :model-value="curGid" style="margin-left: 8px" />
    </template>
  </v-app-bar>
  <div class="posts-grid">
    <div v-for="post in posts" :key="post.post.post_id">
      <TPostCard :model-value="post" :user-click="true" @onUserClick="handleUserClick" />
    </div>
  </div>
  <VpOverlaySearch v-model="showSearch" :gid="curGid" :keyword="search" />
  <VpOverlayUser v-model="showUser" :gid="curGid" :uid="curUid" />
</template>
<script lang="ts" setup>
import TGameNav from "@comp/app/t-gameNav.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import { usePageReachBottom } from "@hooks/reachBottom.js";
import painterReq from "@req/painterReq.js";
import useBBSStore from "@store/bbs.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

type SortSelect = { text: string; value: number; icon: string };
type SortSelectGame = { gid: number; forum: Array<SortSelect>; text: string; icon?: string };
type PostRaw = { isLast: boolean; lastId: string; total: number };

const sortOrderList: Array<Omit<SortSelect, "icon">> = [
  { text: "最新回复", value: 1 },
  { text: "最新发布", value: 2 },
  { text: "热门", value: 3 },
];

const route = useRoute();
const router = useRouter();
const curGid = ref<number>(2);
const curSortType = ref<number>(1);
const firstLoad = ref<boolean>(false);
const isReq = ref<boolean>(false);

const { isReachBottom } = usePageReachBottom();

const search = ref<string>("");
const showSearch = ref<boolean>(false);
const curUid = ref<string>("");
const showUser = ref<boolean>(false);

const bbsStore = useBBSStore();
const { gameList, forumList } = storeToRefs(bbsStore);
const selectedForum = shallowRef<SortSelect>();
const sortGameList = shallowRef<Array<SortSelectGame>>([]);
const postRaw = shallowRef<PostRaw>({ isLast: false, lastId: "", total: 0 });
const posts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const curGame = computed<SortSelectGame | undefined>(() => {
  return sortGameList.value.find((item) => item.gid === curGid.value);
});
const curForums = computed<Array<SortSelect>>(() => {
  return curGame.value?.forum ?? [];
});

onMounted(async () => {
  await showLoading.start("正在加载帖子数据");
  await loadForums();
  await nextTick();
  let { gid, forum } = route.query;
  if (!gid) gid = route.params.gid;
  if (!forum) forum = route.params.forum;
  if (gid && typeof gid === "string") curGid.value = Number(gid);
  if (forum && typeof forum === "string") {
    selectedForum.value = getForum(Number(forum));
  } else {
    selectedForum.value = curForums.value[0];
  }
  const gameLabel = curGame.value?.text ?? "";
  await TGLogger.Info(`[Posts][${gameLabel}][onMounted][${selectedForum.value.text}] 打开帖子列表`);
  await freshPostData();
  firstLoad.value = true;
});
watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value || !firstLoad.value) return;
    await loadMore();
  },
);
watch(
  () => curGid.value,
  () => {
    if (!selectedForum.value) return;
    const forumFind = curForums.value.find((item) => item.text === selectedForum.value?.text);
    if (!firstLoad.value) return;
    selectedForum.value = forumFind ?? curForums.value[0];
    showSnackbar.success(`已将分区切换到 ${curGame.value?.text}`);
  },
);
watch(
  () => selectedForum.value,
  async () => {
    if (!selectedForum.value) return;
    await freshPostData();
    showSnackbar.success(`已将版块切换到 ${selectedForum.value.text}`);
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

// 初始化
async function loadForums(): Promise<void> {
  await bbsStore.refreshForumList();
  const list: Array<SortSelectGame> = [];
  for (const gameForum of forumList.value) {
    const gameFind = gameList.value.find((i) => i.id === gameForum.game_id);
    if (!gameFind) continue;
    const gameItem: SortSelectGame = {
      gid: gameForum.game_id,
      icon: gameFind.app_icon,
      forum: gameForum.forums
        .sort((a, b) => a.order - b.order)
        .map((i) => ({ text: i.name, value: i.id, icon: i.icon_pure })),
      text: gameFind.name,
    };
    list.push(gameItem);
  }
  sortGameList.value = list;
}

function getForum(forum: number): SortSelect {
  const forumItem = curForums.value.find((item) => item.value === forum);
  return forumItem ? forumItem : curForums.value[0];
}

function getSortLabel(value: number): string {
  const order = sortOrderList.find((item) => item.value === value);
  return order ? order.text : "";
}

async function getCurrentPosts(
  loadMore: boolean = false,
  forum: number,
): Promise<TGApp.BBS.Forum.PostForumRes> {
  const mod20 = postRaw.value.total % 20;
  const pageSize = mod20 === 0 ? 20 : 20 - mod20;
  if (curSortType.value === 3) {
    if (loadMore) {
      return await painterReq.forum.hot(forum, curGid.value, postRaw.value.lastId, pageSize);
    }
    return await painterReq.forum.hot(forum, curGid.value);
  }
  if (loadMore) {
    return await painterReq.forum.recent(
      forum,
      curGid.value,
      curSortType.value,
      postRaw.value.lastId,
      pageSize,
    );
  }
  return await painterReq.forum.recent(forum, curGid.value, curSortType.value);
}

async function freshPostData(): Promise<void> {
  if (!selectedForum.value || isReq.value) return;
  await router.push({
    name: "酒馆",
    params: route.params,
    query: { gid: curGid.value, forum: selectedForum.value.value },
  });
  isReq.value = true;
  if (showSearch.value) showSearch.value = false;
  if (showUser.value) showUser.value = false;
  const gameLabel = curGame.value?.text ?? "";
  await showLoading.start(`正在刷新${gameLabel}帖子`);
  const forumLabel = getForum(selectedForum.value.value).text;
  const sortLabel = getSortLabel(curSortType.value);
  await TGLogger.Info(
    `[Posts][${gameLabel}][freshPostData][${forumLabel}][${sortLabel}] 刷新帖子列表`,
  );
  await showLoading.update(`版块：${forumLabel}，排序：${sortLabel}`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const postsGet = await getCurrentPosts(false, selectedForum.value.value);
  posts.value = postsGet.list;
  postRaw.value = {
    isLast: postsGet.is_last,
    lastId: postsGet.last_id,
    total: postsGet.list.length,
  };
  showSnackbar.success(`刷新成功，共加载 ${postsGet.list.length} 条帖子`);
  await showLoading.end();
  isReq.value = false;
}

async function loadMore(): Promise<void> {
  if (!selectedForum.value) {
    showSnackbar.warn("请先选择一个版块");
    return;
  }
  if (postRaw.value.isLast) {
    showSnackbar.warn("没有更多帖子了");
    return;
  }
  if (isReq.value) return;
  isReq.value = true;
  await showLoading.start("正在加载更多帖子数据", `游戏：${curGame.value?.text}`);
  const postsGet = await getCurrentPosts(true, selectedForum.value.value);
  await showLoading.update(
    `版块：${selectedForum.value.text}，排序：${getSortLabel(curSortType.value)}，数量：${postsGet.list.length}`,
  );
  posts.value = posts.value.concat(postsGet.list);
  postRaw.value = {
    isLast: postsGet.is_last,
    lastId: postsGet.last_id,
    total: postRaw.value.total + postsGet.list.length,
  };
  showSnackbar.success(`加载成功，共加载 ${postsGet.list.length} 条帖子`);
  await showLoading.end();
  isReq.value = false;
}

function searchPost(): void {
  if (search.value === "") {
    showSnackbar.warn("请输入搜索内容");
    return;
  }
  const numCheck = Number(search.value);
  if (isNaN(numCheck) || numCheck % 1 !== 0) {
    if (showUser.value) showUser.value = false;
    showSearch.value = true;
  } else createPost(search.value);
}

function handleUserClick(user: TGApp.BBS.Post.User, gid: number): void {
  if (showSearch.value) showSearch.value = false;
  curGid.value = gid;
  curUid.value = user.uid;
  showUser.value = true;
}
</script>
<style lang="css" scoped>
.posts-top {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  gap: 8px;

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
  margin-right: 16px;
  gap: 8px;
}

.post-switch-item {
  width: 250px;
  height: 50px;
}

.post-forum-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.posts-grid {
  display: grid;
  font-family: var(--font-title);
  gap: 8px;
  grid-auto-rows: auto;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}

.select-item {
  position: relative;
  display: flex;
  align-items: center;
  column-gap: 4px;

  &.main {
    position: relative;
    height: 24px;
    font-family: var(--font-title);
    font-size: 16px;
  }

  &.sub {
    padding: 8px;
    font-family: var(--font-title);
    font-size: 16px;

    &:hover {
      background: var(--common-shadow-2);
    }

    &.selected:not(:hover) {
      background: var(--common-shadow-1);
    }
  }

  .icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
  }
}
</style>
