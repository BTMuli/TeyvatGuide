<!-- 咨讯页面 -->
<template>
  <v-app-bar>
    <div class="pn-nav">
      <v-tabs
        :modelValue="currentNewsType"
        align-tabs="center"
        class="pn-nav-tabs"
        @update:model-value="selectNewsType"
      >
        <v-tab v-for="value in bbsEnum.post.newsTypeList" :key="value" :disabled="loading" :value>
          {{ rawData[value].name }}
        </v-tab>
      </v-tabs>
      <v-text-field
        v-model="search"
        :clearable="true"
        :hide-details="true"
        append-inner-icon="mdi-magnify"
        autocomplete="off"
        class="pn-nav-search"
        density="compact"
        label="请输入帖子 ID 或搜索词"
        variant="outlined"
        @keydown.enter="searchPost()"
        @click:append-inner="searchPost()"
      />
      <div class="pn-nav-btns">
        <v-btn :loading class="pn-nav-btn" size="small" variant="elevated" @click="firstLoad(true)">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn class="pn-nav-btn" size="small" variant="elevated" @click="handleList()">
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
      </div>
    </div>
  </v-app-bar>
  <v-window :modelValue="currentNewsType" @update:model-value="selectNewsType">
    <v-window-item v-for="value in bbsEnum.post.newsTypeList" :key="value" :value>
      <div class="pn-grid">
        <div v-for="post in postData[value]" :key="post.post.post_id">
          <TPostCard :post />
        </div>
      </div>
    </v-window-item>
  </v-window>
  <ToChannel v-model="showList" :curType="String(currentNewsType)" :gid="String(currentGid)" />
  <VpOverlaySearch
    v-model="showSearch"
    :gid="currentGid"
    :keyword="search"
    topOffset="64px"
    @user-click="handleUserClick"
  />
  <VpOverlayUser v-model="showUser" :gid="curGid" :uid="curUid" />
</template>
<script lang="ts" setup>
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToChannel from "@comp/pageNews/to-channel.vue";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import bbsEnum from "@enum/bbs.js";
import { usePageReachBottom } from "@hooks/reachBottom.js";
import painterReq from "@req/painterReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useCommunityBrowsingStore from "@store/communityBrowsing.js";
import { createPost } from "@utils/app/TGWindow.js";
import {
  defaultCommunityGid,
  parseBrowsingId,
  resolveBrowsingOption,
} from "@utils/bbs/browsing.js";
import { resolveNewsType } from "@utils/bbs/newsType.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  type ShallowRef,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";

type PostData = Record<TGApp.BBS.Post.NewsTypeEnum, Array<TGApp.BBS.Post.FullData>>;
type RawItem = { isLast: boolean; loaded: boolean; name: string; lastId: number };
type RawData = Record<TGApp.BBS.Post.NewsTypeEnum, RawItem>;

const { recentNewsType } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());
const { recentGid } = storeToRefs(useCommunityBrowsingStore());
const route = useRoute();
const router = useRouter();
const routeGid = computed<number | undefined>(() => {
  const gid = parseBrowsingId(route.params.gid);
  return gid !== undefined && gid > 0 ? gid : undefined;
});
const routeNewsType = computed<TGApp.BBS.Post.NewsTypeEnum | undefined>(() =>
  resolveNewsType(route.params.type),
);
const currentGid = computed<number>(() => {
  const rememberedGid =
    Number.isSafeInteger(recentGid.value) && recentGid.value > 0 ? recentGid.value : undefined;
  const preferredGid = routeGid.value ?? rememberedGid;
  const game = resolveBrowsingOption(
    gameList.value,
    (item) => item.id,
    routeGid.value,
    rememberedGid,
    defaultCommunityGid,
  );
  return game?.id ?? preferredGid ?? defaultCommunityGid;
});
const rememberedNewsType = computed<TGApp.BBS.Post.NewsTypeEnum>(
  () => resolveNewsType(recentNewsType.value) ?? bbsEnum.post.newsType.NOTICE,
);
const currentNewsType = ref<TGApp.BBS.Post.NewsTypeEnum>(
  routeNewsType.value ?? rememberedNewsType.value,
);

const { isReachBottom } = usePageReachBottom();

const label = computed<string>(() => {
  const game = gameList.value.find((v) => v.id === currentGid.value);
  return game?.name || "未知分区";
});

const loading = ref<boolean>(false);
const showList = ref<boolean>(false);
const showSearch = ref<boolean>(false);
const showUser = ref<boolean>(false);
const curUid = ref<string>("");
const curGid = ref<number>(currentGid.value);
const search = ref<string>("");

const postData: PostData = reactive(
  <Record<TGApp.BBS.Post.NewsTypeEnum, ShallowRef<Array<TGApp.BBS.Post.FullData>>>>(
    Object.fromEntries(
      bbsEnum.post.newsTypeList.map((v) => [v, shallowRef<Array<TGApp.BBS.Post.FullData>>([])]),
    )
  ),
);
const rawData: RawData = reactive(
  <Record<TGApp.BBS.Post.NewsTypeEnum, ShallowRef<RawItem>>>Object.fromEntries(
    bbsEnum.post.newsTypeList.map((type) => [
      type,
      shallowRef<RawItem>({
        isLast: false,
        loaded: false,
        name: bbsEnum.post.newsTypeDesc(type),
        lastId: 0,
      }),
    ]),
  ),
);

let dataGid = currentGid.value;
let dataGeneration = 0;
let pendingRefresh: boolean | undefined;
let active = false;

onMounted(() => {
  active = true;
  firstLoad();
});

onBeforeUnmount(() => {
  active = false;
  if (loading.value) void showLoading.end();
});

watch([currentGid, routeNewsType], () => {
  if (!active || route.name !== "资讯") return;
  const gid = currentGid.value;
  const type = routeNewsType.value ?? rememberedNewsType.value;
  if (gid === dataGid && type === currentNewsType.value) return;
  if (gid !== dataGid) {
    dataGid = gid;
    dataGeneration += 1;
    for (const item of bbsEnum.post.newsTypeList) resetNewsData(item);
  }
  currentNewsType.value = type;
  curGid.value = gid;
  showSearch.value = false;
  showUser.value = false;
  pendingRefresh = undefined;
  firstLoad();
});

watch(isReachBottom, (reached) => {
  if (reached) loadMore();
});

function firstLoad(refresh: boolean = false): void {
  if (loading.value) {
    pendingRefresh = refresh || pendingRefresh === true;
    return;
  }
  const type = currentNewsType.value;
  if (refresh) resetNewsData(type);
  if (rawData[type].loaded) {
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  void loadNews(false);
}

function resetNewsData(type: TGApp.BBS.Post.NewsTypeEnum): void {
  postData[type] = [];
  rawData[type].loaded = false;
  rawData[type].lastId = 0;
  rawData[type].isLast = false;
}

function selectNewsType(value: unknown): void {
  const type = resolveNewsType(value);
  if (!active || loading.value || type === undefined || type === currentNewsType.value) return;
  currentNewsType.value = type;
  recentNewsType.value = type;
  firstLoad();
  if (route.params.type) {
    void router.replace({
      name: "资讯",
      params: { gid: currentGid.value, type: "" },
      query: route.query,
      hash: route.hash,
    });
  }
}

function handleList(): void {
  if (showSearch.value) showSearch.value = false;
  showList.value = true;
}

function handleUserClick(user: TGApp.BBS.Post.User, gid: number): void {
  curGid.value = gid;
  curUid.value = user.uid;
  showUser.value = true;
}

function loadMore(): void {
  if (loading.value) return;
  const item = rawData[currentNewsType.value];
  if (!item.loaded) {
    firstLoad();
    return;
  }
  if (item.isLast) {
    showSnackbar.warn("已经是最后一页了");
    return;
  }
  void loadNews(true);
}

async function loadNews(append: boolean): Promise<void> {
  const gid = currentGid.value;
  const type = currentNewsType.value;
  const generation = dataGeneration;
  const item = rawData[type];
  const name = `${label.value}${item.name}`;
  const offset = append ? item.lastId : 0;
  const pageSize = 20 - (offset % 20);
  const isCurrent = (): boolean => active && generation === dataGeneration;
  loading.value = true;
  try {
    await showLoading.start(`正在获取${name}数据`);
    if (!isCurrent()) return;
    const response = await painterReq.news(String(gid), type, pageSize, offset);
    if (!isCurrent()) return;
    if (response.retcode !== 0) {
      showSnackbar.error(`[${response.retcode}] ${response.message}`);
      await TGLogger.Warn(`[PostNews] 获取资讯失败：${response.retcode} ${response.message}`);
      return;
    }
    const { list, is_last: isLast } = response.data;
    await showLoading.update(`数量：${list.length}，是否最后一页：${isLast}`);
    if (!isCurrent()) return;
    item.loaded = true;
    item.lastId = offset + list.length;
    item.isLast = isLast;
    postData[type] = append ? postData[type].concat(list) : list;
    if (currentNewsType.value !== type) return;
    if (append && isLast) showSnackbar.warn("已经是最后一页了");
    else showSnackbar.success(`获取${name}数据成功，共 ${list.length} 条`);
  } catch (e) {
    if (!isCurrent()) return;
    const detail = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取${name}异常：${detail}`);
    await TGLogger.Error(`[PostNews] 获取资讯异常：${detail}`);
  } finally {
    if (active) {
      await showLoading.end();
      loading.value = false;
      const refresh = pendingRefresh;
      pendingRefresh = undefined;
      if (active && refresh !== undefined) firstLoad(refresh);
    }
  }
}

async function searchPost(): Promise<void> {
  if (search.value === "") {
    showSnackbar.warn("请输入搜索内容");
    return;
  }
  const numCheck = Number(search.value);
  if (isNaN(numCheck) || numCheck % 1 !== 0) {
    if (showList.value === true) showList.value = false;
    showSearch.value = true;
    return;
  }
  await createPost(search.value);
  showSearch.value = false;
}
</script>
<style lang="scss" scoped>
.pn-nav {
  position: relative;
  display: flex;
  overflow: auto hidden;
  width: 100%;
  max-width: 100%;
  height: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding-right: 16px;
  padding-left: 16px;
  column-gap: 16px;
}

.pn-nav-tabs {
  position: relative;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.pn-nav-search {
  color: var(--box-text-1);
}

.pn-nav-btns {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.pn-nav-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.pn-grid {
  display: grid;
  font-family: var(--font-title);
  gap: 12px;
  grid-auto-rows: auto;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}
</style>
