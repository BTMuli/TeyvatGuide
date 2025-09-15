<template>
  <v-app-bar>
    <template #prepend>
      <div class="post-topic-top" v-if="topicInfo">
        <TMiImg :src="topicInfo.topic.cover" alt="cover" :ori="true" />
        <div class="post-topic-info">
          <span>{{ curTopic }}-{{ topicInfo.topic.name }}</span>
          <span :class="sidebar.collapse ? 'wide' : 'thin'" :title="topicInfo.topic.desc">
            {{ topicInfo.topic.desc }}
          </span>
        </div>
      </div>
    </template>
    <template #extension>
      <TGameNav :model-value="curGid" v-if="curGid !== 0" style="margin-left: 8px" />
    </template>
    <div class="post-topic-switch">
      <v-select
        v-model="curGame"
        class="post-switch-item"
        :items="getGameList(topicInfo?.game_info_list)"
        item-title="name"
        :item-value="(item) => item"
        variant="outlined"
        label="分区"
        :disabled="isReq"
      >
        <template #selection="{ item }">
          <div class="select-item main">
            <img
              v-if="item.raw.icon"
              :src="item.raw.icon"
              :alt="item.raw.name"
              :title="item.raw.name"
              class="icon"
            />
            <span>{{ item.raw.name }}</span>
          </div>
        </template>
        <template #item="{ props, item }">
          <div v-bind="props" class="select-item sub" :class="{ selected: item.raw.id === curGid }">
            <img
              v-if="item.raw.icon"
              :src="item.raw.icon"
              :alt="item.raw.name"
              :title="item.raw.name"
              class="icon"
            />
            <span>{{ item.raw.name }}</span>
          </div>
        </template>
      </v-select>
      <v-select
        v-model="curSortType"
        class="post-switch-item"
        :items="sortList"
        item-title="text"
        item-value="value"
        variant="outlined"
        label="排序"
        :disabled="isReq"
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
      <v-btn
        :loading="isReq"
        class="post-topic-btn"
        @click="freshPostData()"
        prepend-icon="mdi-refresh"
      >
        刷新
      </v-btn>
    </div>
  </v-app-bar>
  <div class="post-topic-grid">
    <div v-for="post in posts" :key="post.post.post_id">
      <TPostCard :model-value="post" :user-click="true" @onUserClick="handleUserClick" />
    </div>
  </div>
  <VpOverlaySearch :gid="curGid.toString()" v-model="showSearch" :keyword="search" />
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
import postReq from "@req/postReq.js";
import topicReq from "@req/topicReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

type SortSelect = { text: string; value: number };
type PostMiniData = { isLast: boolean; lastId: string; total: number };
type GameList = TGApp.BBS.Topic.GameInfo & { icon?: string };

const route = useRoute();
const router = useRouter();

const { isReachBottom } = usePageReachBottom();
const { sidebar } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());

const curGid = ref<number>(0);
const curSortType = ref<0 | 1 | 2>(0);
const curTopic = ref<string>("");

const search = ref<string>("");
const showSearch = ref<boolean>(false);
const curUid = ref<string>("");
const showUser = ref<boolean>(false);

const isReq = ref<boolean>(false);
const firstLoad = ref<boolean>(false);
const postRaw = shallowRef<PostMiniData>({ isLast: false, lastId: "", total: 0 });
const topicInfo = shallowRef<TGApp.BBS.Topic.InfoRes>();
const posts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const curGame = shallowRef<GameList>();
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
  let { gid, topic } = route.query;
  if (!gid) gid = route.params.gid;
  if (!topic) topic = route.params.topic;
  if (!gid || typeof gid !== "string") gid = "0";
  if (!topic || typeof topic !== "string") topic = "0";
  curGid.value = Number(gid);
  curTopic.value = topic;
  await showLoading.start(`正在加载话题${topic}信息`);
  const info = await topicReq.info(gid, topic);
  if ("retcode" in info) {
    await showLoading.end();
    showSnackbar.error(`[${info.retcode}] ${info.message}`);
    return;
  }
  topicInfo.value = info;
  let tmpGame: GameList | undefined;
  if (curGame.value === undefined) {
    tmpGame = info.game_info_list.find((i) => i.id === curGid.value);
  }
  if (tmpGame === undefined) tmpGame = info.game_info_list[0];
  const gameFind = gameList.value.find((i) => i.id === tmpGame?.id);
  curGame.value = { ...tmpGame, icon: gameFind?.app_icon };
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
  () => curGame.value,
  async () => {
    if (curGame.value) curGid.value = curGame.value.id;
    await freshPostData();
  },
);
watch(
  () => curSortType.value,
  async () => await freshPostData(),
);

async function freshPostData(): Promise<void> {
  if (isReq.value) return;
  isReq.value = true;
  await showLoading.start(`正在加载话题${topicInfo.value?.topic.name}信息`);
  await router.push({
    name: "话题",
    params: route.params,
    query: { gid: curGid.value, topic: curTopic.value },
  });
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  const postList = await postReq.topic(curGid.value, curTopic.value, curSortType.value);
  if ("retcode" in postList) {
    await showLoading.end();
    showSnackbar.error(`[${postList.retcode}] ${postList.message}`);
    return;
  }
  await showLoading.update(`数量：${postList.posts.length}，是否最后一页：${postList.is_last}`);
  postRaw.value = {
    isLast: postList.is_last,
    lastId: postList.last_id,
    total: postList.posts.length,
  };
  posts.value = postList.posts;
  await showLoading.end();
  isReq.value = false;
  showSnackbar.success(`加载了 ${postList.posts.length} 条帖子`);
}

async function loadMore(): Promise<void> {
  if (isReq.value) return;
  isReq.value = true;
  if (showSearch.value) showSearch.value = false;
  if (showUser.value) showUser.value = false;
  if (postRaw.value.isLast) {
    showSnackbar.warn("已经到底了");
    isReq.value = false;
    return;
  }
  await showLoading.start(`正在刷新${topicInfo.value?.topic.name}帖子列表`);
  const mod20 = postRaw.value.total % 20;
  const pageSize = mod20 === 0 ? 20 : 20 - mod20;
  const resp = await postReq.topic(
    curGid.value,
    curTopic.value,
    curSortType.value,
    postRaw.value.lastId,
    pageSize,
  );
  if ("retcode" in resp) {
    await showLoading.end();
    isReq.value = false;
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  await showLoading.update(`数量：${resp.posts.length}，是否最后一页：${resp.is_last}`);
  postRaw.value = {
    isLast: resp.is_last,
    lastId: resp.last_id,
    total: postRaw.value.total + resp.posts.length,
  };
  posts.value = posts.value.concat(resp.posts);
  await showLoading.end();
  isReq.value = false;
  showSnackbar.success(`加载了 ${resp.posts.length} 条帖子`);
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

function getGameList(list: Array<TGApp.BBS.Topic.GameInfo> | undefined): Array<GameList> {
  if (!list) return [];
  return list.map((item) => {
    const game = gameList.value.find((i) => i.id === item.id);
    return { ...item, icon: game?.app_icon };
  });
}

function handleUserClick(user: TGApp.BBS.Post.User, gid: number): void {
  if (showSearch.value) showSearch.value = false;
  curGid.value = gid;
  curUid.value = user.uid;
  showUser.value = true;
}
</script>
<style lang="css" scoped>
.post-topic-top {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-right: 12px;
  margin-left: 12px;
  background: var(--box-bg-2);
  gap: 4px;

  img {
    width: 50px;
    height: 50px;
  }
}

.post-topic-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  :first-child {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
  }

  :last-child {
    overflow: hidden;
    box-sizing: border-box;
    padding-right: 8px;
    max-lines: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;

    &.wide {
      max-width: 580px;
      transition: max-width 0.5s ease-in-out;
    }

    &.thin {
      max-width: 380px;
    }
  }
}

.post-topic-switch {
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

.post-topic-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .post-topic-btn {
  border: 1px solid var(--common-shadow-2);
}

.post-topic-grid {
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
  }
}
</style>
