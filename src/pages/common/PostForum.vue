<!-- 帖子页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="posts-top">
        <img alt="posts" src="/UI/nav/posts.webp" />
        <span>帖子</span>
        <v-menu v-if="topPosts.length > 0" location="bottom start" offset="4">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              aria-label="置顶帖子"
              class="posts-pinned-trigger"
              icon="mdi-pin"
              size="small"
              title="置顶帖子"
              variant="flat"
            />
          </template>
          <v-list aria-label="置顶帖子" class="posts-pinned-menu" density="compact">
            <v-list-item v-for="post in topPosts" :key="post.post_id" @click="openTopPost(post)">
              <template #title>
                <TpTitle
                  :single-line="true"
                  :text="post.subject || '无标题帖子'"
                  :title="post.subject || '无标题帖子'"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </template>
    <div class="posts-switch">
      <v-select
        v-model="curGid"
        :disabled="isReq"
        :items="sortGameList"
        :label="gidLabel"
        class="post-switch-item"
        density="compact"
        hide-details
        item-title="text"
        item-value="gid"
        variant="outlined"
      >
        <template #selection="{ item }">
          <div class="select-item main">
            <img
              v-if="item.icon"
              :alt="item.text"
              :src="item.icon"
              :title="item.text"
              class="icon"
            />
            <span>{{ item.text }}</span>
          </div>
        </template>
        <template #item="{ props, item }">
          <div :class="{ selected: item.gid === curGid }" class="select-item sub" v-bind="props">
            <img v-if="item.icon" :alt="item.text" :src="item.icon" class="icon" />
            <span>{{ item.text }}</span>
          </div>
        </template>
      </v-select>
      <v-select
        v-model="selectedForum"
        :disabled="isReq"
        :items="curForums"
        :label="forumLabel"
        class="post-switch-item"
        density="compact"
        hide-details
        item-title="text"
        return-object
        variant="outlined"
      >
        <template #selection="{ item }">
          <div class="select-item main">
            <v-icon v-if="item.value === discoverForumId" class="icon">mdi-compass-outline</v-icon>
            <img v-else :alt="item.text" :src="item.icon" :title="item.text" class="icon" />
            <span>{{ item.text }}</span>
          </div>
        </template>
        <template #item="{ props, item }">
          <div
            :class="{ selected: item.value === selectedForum?.value }"
            class="select-item sub"
            v-bind="props"
          >
            <v-icon v-if="item.value === discoverForumId" class="icon">mdi-compass-outline</v-icon>
            <img v-else :alt="item.text" :src="item.icon" class="icon" />
            <span>{{ item.text }}</span>
          </div>
        </template>
      </v-select>
      <v-select
        v-if="!isDiscover"
        v-model="curSortType"
        :disabled="isReq"
        :items="sortOrderList"
        :label="sortLabel"
        class="post-switch-item"
        density="compact"
        hide-details
        item-title="text"
        item-value="value"
        variant="outlined"
      />
      <v-text-field
        v-model="search"
        :clearable="true"
        :hide-details="true"
        append-inner-icon="mdi-magnify"
        autocomplete="off"
        class="post-switch-item"
        density="compact"
        label="请输入帖子 ID 或搜索词"
        variant="outlined"
        @click:append-inner="searchPost"
        @keyup.enter="searchPost"
      />
      <v-menu v-if="publishTypes.length > 0" location="bottom start" offset="4">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            :disabled="!selectedForum"
            class="post-forum-btn"
            prepend-icon="mdi-pencil-plus-outline"
            rounded
            variant="elevated"
          >
            发布
          </v-btn>
        </template>
        <v-list aria-label="选择发布类型" class="post-publish-menu" density="compact" lines="two">
          <v-list-item
            v-for="item in publishTypes"
            :key="item.value"
            :prepend-icon="item.icon"
            :subtitle="item.desc"
            :title="item.title"
            @click="newPost(item.value)"
          />
        </v-list>
      </v-menu>
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
      <TGameNav :gid="disGid" style="margin-left: 8px" />
      <div class="posts-conf">
        <v-checkbox
          v-model="syncRefresh"
          class="post-sync-check"
          density="compact"
          hide-details
          label="同步刷新"
        />
        <v-btn-toggle
          v-model="postGridMode"
          :divided="false"
          :mandatory="true"
          class="posts-view-conf"
          color="var(--tgc-od-blue)"
          variant="outlined"
        >
          <v-btn :value="true" size="small" title="网格布局">
            <v-icon size="16">mdi-view-grid</v-icon>
          </v-btn>
          <v-btn :value="false" size="small" title="列表布局">
            <v-icon size="20">mdi-view-list</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>
    </template>
  </v-app-bar>
  <div ref="postsGridEl" :class="{ grid: postGridMode }" class="posts-grid">
    <div v-for="post in posts" :key="post.post.post_id">
      <TPostCard :listMode="!postGridMode" :post @user-click="handleUserClick" />
    </div>
  </div>
  <VpOverlaySearch
    v-model="showSearch"
    :gid="disGid"
    :keyword="search"
    topOffset="112px"
    @user-click="handleUserClick"
  />
  <VpOverlayUser v-model="showUser" :gid="disGid" :uid="curUid" />
</template>
<script lang="ts" setup>
import TGameNav from "@comp/app/t-gameNav.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TpTitle from "@comp/viewPost/tp-title.vue";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import bbsEnum from "@enum/bbs.js";
import { usePageReachBottom } from "@hooks/reachBottom.js";
import apiHubReq from "@req/apiHubReq.js";
import painterReq from "@req/painterReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { createPost } from "@utils/app/TGWindow.js";
import { canPublishForumPost } from "@utils/bbs/postPublish.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

type SortSelect<T extends number = number> = { text: string; value: T; icon: string };
type SortSelectForum = Omit<SortSelect<TGApp.BBS.Post.ForumSortTypeEnum>, "icon">;
type SortSelectGame = { gid: number; forum: Array<SortSelect>; text: string; icon?: string };
type PublishType = { value: 1 | 2; title: string; desc: string; icon: string };
type PostRaw = { isLast: boolean; lastId: string; total: number };

type PostListResp = TGApp.BBS.Forum.PostForumResp | TGApp.BBS.Forum.DiscoverResp;

const discoverForumId = 0;
// 推荐流每页仅返回少量帖子，首屏未铺满时最多自动续页次数
const DISCOVER_FILL_PAGE_LIMIT = 12;
const initializedDiscoverGids = new Set<number>();

// 简单封装选项生成
const genSortOrderItem = (order: TGApp.BBS.Post.ForumSortTypeEnum): SortSelectForum => ({
  text: bbsEnum.post.forumSortTypeDesc(order),
  value: order,
});
const sortOrderList: ReadonlyArray<SortSelectForum> = [
  bbsEnum.post.forumSortType.LATEST_REPLY,
  bbsEnum.post.forumSortType.LATEST_POST,
  bbsEnum.post.forumSortType.HOT,
].map(genSortOrderItem);

const route = useRoute();
const router = useRouter();

const curGid = ref<number>(2);
const disGid = ref<number>(2);
const curSortType = ref<TGApp.BBS.Post.ForumSortTypeEnum>(bbsEnum.post.forumSortType.LATEST_REPLY);

const gidLabel = ref<string>("分区");
const forumLabel = ref<string>("版块");
const sortLabel = ref<string>("排序");

const firstLoad = ref<boolean>(false);
const isReq = ref<boolean>(false);
const syncRefresh = ref<boolean>(true);
const hasPendingChange = ref<boolean>(false);

const { isReachBottom } = usePageReachBottom();

const search = ref<string>("");
const showSearch = ref<boolean>(false);
const curUid = ref<string>("");
const showUser = ref<boolean>(false);
const postsGridEl = useTemplateRef<HTMLElement>("postsGridEl");

const bbsStore = useBBSStore();
const { gameList, forumList } = storeToRefs(bbsStore);
const { incognito, postGridMode } = storeToRefs(useAppStore());
const { cookie, uid } = storeToRefs(useUserStore());

const selectedForum = shallowRef<SortSelect>();
const sortGameList = shallowRef<Array<SortSelectGame>>([]);
const postRaw = shallowRef<PostRaw>({ isLast: false, lastId: "", total: 0 });
const posts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const topPosts = shallowRef<Array<TGApp.BBS.Forum.TopPost>>([]);
let topPostRequestId = 0;
const curGame = computed<SortSelectGame | undefined>(() => {
  return sortGameList.value.find((item) => item.gid === curGid.value);
});
const curForums = computed<Array<SortSelect>>(() => {
  if (!curGame.value) return [];
  return [...curGame.value.forum, { text: "发现", value: discoverForumId, icon: "" }];
});
const isDiscover = computed<boolean>(() => selectedForum.value?.value === discoverForumId);
const currentForumInfo = computed<TGApp.BBS.Forum.GameForumItem | undefined>(() => {
  const forumId = selectedForum.value?.value;
  if (forumId === undefined) return undefined;
  return forumList.value
    .find((item) => item.game_id === curGid.value)
    ?.forums.find((item) => item.id === forumId);
});
const publishTypes = computed<Array<PublishType>>(() => {
  const forum = currentForumInfo.value;
  if (!forum || !canPublishForumPost(forum, 2)) return [];
  if (!canPublishForumPost(forum, 1)) {
    return [
      {
        value: 2,
        title: "发布图文",
        desc: forum.view_type === 2 ? "当前版块仅支持发布图片帖" : "当前版块未开放长文发布",
        icon: "mdi-image-plus-outline",
      },
    ];
  }
  return [
    {
      value: 1,
      title: "发布长文",
      desc: "支持文字、图片与富文本组件",
      icon: "mdi-text-box-plus-outline",
    },
    { value: 2, title: "发布图文", desc: "以图片列表展示帖子", icon: "mdi-image-plus-outline" },
  ];
});
const canWrite = computed<boolean>(
  () => !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken.trim(),
);
const reqCk = computed<TGApp.App.Account.Cookie | undefined>(() => {
  if (incognito.value) return undefined;
  return cookie.value;
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
  await TGLogger.Info(
    `[Posts][${gameLabel}][onMounted][${selectedForum.value?.text ?? ""}] 打开帖子列表`,
  );
  await freshPostData();
  firstLoad.value = true;
});

watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value || !firstLoad.value) return;
    if (!syncRefresh.value && hasPendingChange.value) {
      await freshPostData();
      hasPendingChange.value = false;
    } else {
      await loadMore();
    }
  },
);
watch(
  () => curGid.value,
  () => {
    if (!selectedForum.value) return;
    const forumFind = curForums.value.find((item) => item.text === selectedForum.value?.text);
    if (!firstLoad.value) return;
    selectedForum.value = forumFind ?? curForums.value[0];
    if (syncRefresh.value) {
      disGid.value = curGid.value;
      showSnackbar.success(`已将分区切换到 ${curGame.value?.text}`);
    }
    hasPendingChange.value = true;
  },
);
watch(
  () => selectedForum.value,
  async () => {
    if (!firstLoad.value || !selectedForum.value) return;
    if (syncRefresh.value) {
      await freshPostData();
      showSnackbar.success(`已将版块切换到 ${selectedForum.value.text}`);
    } else {
      hasPendingChange.value = true;
    }
  },
);
watch(
  () => curSortType.value,
  async () => {
    if (syncRefresh.value) {
      await freshPostData();
      const sortLabel = getSortLabel(curSortType.value);
      showSnackbar.success(`已将排序切换到 ${sortLabel}`);
    } else {
      hasPendingChange.value = true;
    }
  },
);
watch(
  () => syncRefresh.value,
  async (newVal, oldVal) => {
    if (!syncRefresh.value) {
      gidLabel.value = `分区-${curGame.value?.text ?? ""}`;
      forumLabel.value = `版块-${selectedForum.value?.text ?? ""}`;
      sortLabel.value = `排序-${isDiscover.value ? "推荐" : getSortLabel(curSortType.value)}`;
    }
    if (syncRefresh.value) {
      refreshSelect();
    }
    if (!oldVal && newVal && hasPendingChange.value) {
      await freshPostData();
    }
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

async function newPost(viewType: 1 | 2): Promise<void> {
  if (!selectedForum.value) return;
  if (!canWrite.value) {
    showSnackbar.warn("请先登录米游社账号");
    return;
  }
  await router.push({
    name: "新建帖子",
    params: { gid: String(curGid.value), viewType: String(viewType) },
    query: { forum: String(selectedForum.value.value), from: "forum" },
  });
}

async function getCurrentPosts(loadMore: boolean = false, forum: number): Promise<PostListResp> {
  if (forum === discoverForumId) {
    const gid = curGid.value;
    const resp = await painterReq.discover(
      gid,
      loadMore ? postRaw.value.lastId : "",
      !initializedDiscoverGids.has(gid),
      reqCk.value,
    );
    if (resp.retcode === 0) initializedDiscoverGids.add(gid);
    return resp;
  }
  const mod20 = postRaw.value.total % 20;
  const pageSize = mod20 === 0 ? 20 : 20 - mod20;
  if (curSortType.value === 3) {
    return await painterReq.forum.hot(
      forum,
      curGid.value,
      loadMore ? postRaw.value.lastId : undefined,
      loadMore ? pageSize : 20,
      reqCk.value,
    );
  }
  return await painterReq.forum.recent(
    forum,
    curGid.value,
    curSortType.value,
    loadMore ? postRaw.value.lastId : undefined,
    loadMore ? pageSize : 20,
    reqCk.value,
  );
}

function refreshSelect(): void {
  disGid.value = curGid.value;
  gidLabel.value = "分区";
  forumLabel.value = "版块";
  sortLabel.value = "排序";
}

async function loadTopPosts(forumId: number, gid: number): Promise<void> {
  const requestId = ++topPostRequestId;
  topPosts.value = [];
  if (forumId === discoverForumId) return;
  try {
    const resp = await apiHubReq.forumMain(forumId, gid);
    if (requestId !== topPostRequestId) return;
    if (resp.retcode !== 0) {
      topPosts.value = [];
      await TGLogger.Warn(`[PostForum][loadTopPosts] 获取置顶帖子异常`);
      await TGLogger.Warn(`[PostForum][loadTopPosts] ${resp.retcode}-${resp.message}`);
      return;
    }
    topPosts.value = resp.data.top_posts;
  } catch (e) {
    if (requestId !== topPostRequestId) return;
    topPosts.value = [];
    await TGLogger.Error(`[PostForum][loadTopPosts] 获取置顶帖子异常`);
    await TGLogger.Error(`[PostForum][loadTopPosts] ${e}`);
  }
}

// 判断帖子列表是否已延伸到首屏之外
function isPostListFilled(): boolean {
  const grid = postsGridEl.value;
  if (!grid) return true;
  return grid.getBoundingClientRect().bottom > window.innerHeight;
}

// 推荐流单页只返回少量帖子，首屏未铺满时自动续页，避免无法触发触底加载
async function fillDiscoverPosts(maxPages: number = DISCOVER_FILL_PAGE_LIMIT): Promise<void> {
  if (!isDiscover.value || posts.value.length === 0) return;
  for (let page = 0; page < maxPages; page++) {
    await nextTick();
    if (postRaw.value.isLast || isPostListFilled()) return;
    try {
      const resp = await getCurrentPosts(true, discoverForumId);
      if (resp.retcode !== 0) {
        await TGLogger.Warn(`[PostForum][fillDiscoverPosts] ${resp.retcode}-${resp.message}`);
        return;
      }
      if (resp.data.list.length === 0) return;
      posts.value = posts.value.concat(resp.data.list);
      postRaw.value = {
        isLast: resp.data.is_last ?? !resp.data.last_id,
        lastId: resp.data.last_id,
        total: postRaw.value.total + resp.data.list.length,
      };
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await TGLogger.Warn(`[PostForum][fillDiscoverPosts] 自动续页异常：${errMsg}`);
      return;
    }
  }
}

async function freshPostData(): Promise<void> {
  if (!selectedForum.value || isReq.value) return;
  hasPendingChange.value = false;
  refreshSelect();
  await router.replace({
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
  const sortLabel = isDiscover.value ? "推荐" : getSortLabel(curSortType.value);
  await TGLogger.Info(
    `[Posts][${gameLabel}][freshPostData][${forumLabel}][${sortLabel}] 刷新帖子列表`,
  );
  await showLoading.update(`版块：${forumLabel}，排序：${sortLabel}`);
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  // 获取置顶帖子与帖子列表
  const topPostTask = loadTopPosts(selectedForum.value.value, curGid.value);
  let postsResp: PostListResp | undefined;
  try {
    postsResp = await getCurrentPosts(false, selectedForum.value.value);
    if (postsResp.retcode !== 0) {
      showSnackbar.error(`[${postsResp.retcode}] ${postsResp.message}`);
      await TGLogger.Warn(`[PostForum][freshPostData] 获取帖子列表异常`);
      await TGLogger.Warn(`[PostForum][freshPostData] ${postsResp.retcode}-${postsResp.message}`);
      await showLoading.end();
      isReq.value = false;
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取帖子列表异常：${errMsg}`);
    await TGLogger.Error(`[PostForum][freshPostData] 获取帖子列表异常`);
    await TGLogger.Error(`[PostForum][freshPostData] ${e}`);
    await showLoading.end();
    isReq.value = false;
  }
  await topPostTask;
  if (!postsResp) return;
  // 处理帖子列表数据
  posts.value = postsResp.data.list;
  postRaw.value = {
    isLast: postsResp.data.is_last ?? !postsResp.data.last_id,
    lastId: postsResp.data.last_id,
    total: postsResp.data.list.length,
  };
  await fillDiscoverPosts();
  showSnackbar.success(`刷新成功，共加载 ${posts.value.length} 条帖子`);
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

  // 获取帖子列表
  let postsResp: PostListResp | undefined;
  try {
    postsResp = await getCurrentPosts(true, selectedForum.value.value);
    if (postsResp.retcode !== 0) {
      showSnackbar.error(`[${postsResp.retcode}] ${postsResp.message}`);
      await TGLogger.Warn(`[PostForum][loadMore] 获取帖子列表异常`);
      await TGLogger.Warn(`[PostForum][loadMore] ${postsResp.retcode}-${postsResp.message}`);
      await showLoading.end();
      isReq.value = false;
      return;
    }
    await showLoading.update(
      `版块：${selectedForum.value.text}，排序：${isDiscover.value ? "推荐" : getSortLabel(curSortType.value)}，数量：${postsResp.data.list.length}`,
    );
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取帖子列表异常：${errMsg}`);
    await TGLogger.Error(`[PostForum][loadMore] 获取帖子列表异常`);
    await TGLogger.Error(`[PostForum][loadMore] ${e}`);
    await showLoading.end();
    isReq.value = false;
  }
  if (!postsResp) return;
  // 处理帖子列表数据
  posts.value = posts.value.concat(postsResp.data.list);
  postRaw.value = {
    isLast: postsResp.data.is_last ?? !postsResp.data.last_id,
    lastId: postsResp.data.last_id,
    total: postRaw.value.total + postsResp.data.list.length,
  };
  showSnackbar.success(`加载成功，共加载 ${postsResp.data.list.length} 条帖子`);
  await showLoading.end();
  isReq.value = false;
}

async function searchPost(): Promise<void> {
  const searchText = typeof search.value === "string" ? search.value.trim() : "";
  if (searchText === "") {
    showSnackbar.warn("请输入搜索内容");
    return;
  }
  const postId = Number(searchText);
  if (Number.isSafeInteger(postId) && postId > 0) {
    await createPost(searchText);
    return;
  }
  if (showUser.value) showUser.value = false;
  showSearch.value = true;
}

async function openTopPost(post: TGApp.BBS.Forum.TopPost): Promise<void> {
  await createPost({ postId: post.post_id, title: post.subject });
}

function handleUserClick(user: TGApp.BBS.Post.User, gid: number): void {
  curGid.value = gid;
  curUid.value = user.uid;
  showUser.value = true;
}
</script>
<style lang="scss" scoped>
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

  > span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.posts-pinned-trigger {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.posts-pinned-menu {
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: 360px;
  padding-block: 4px;

  :deep(.v-list-item-title) {
    overflow: hidden;
    font-family: var(--font-title);
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
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
}

.post-forum-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.post-publish-menu {
  padding-block: 4px;

  :deep(.v-list-item--two-line) {
    --v-list-prepend-gap: 16px;

    min-height: 46px;
    padding-block: 5px;
  }

  :deep(.v-list-item-title) {
    font-size: 14px;
    line-height: 20px;
  }

  :deep(.v-list-item-subtitle) {
    font-size: 12px;
    line-height: 16px;
  }

  :deep(.v-list-item__prepend > .v-icon) {
    font-size: 20px;
  }
}

.posts-conf {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  margin-left: auto;
  column-gap: 8px;
}

.posts-view-conf.v-btn-toggle {
  height: 36px;
}

.posts-grid {
  position: relative;
  display: grid;
  width: 100%;
  font-family: var(--font-title);
  gap: 12px;
  grid-auto-rows: auto;
  grid-template-columns: repeat(auto-fill, minmax(640px, 1fr));

  &.grid {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  }
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
