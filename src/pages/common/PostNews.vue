<!-- 咨讯页面 -->
<template>
  <v-app-bar>
    <div class="pn-nav">
      <v-tabs v-model="recentNewsType" align-tabs="center" class="pn-nav-tabs">
        <v-tab
          v-for="(value, index) in bbsEnum.post.newsTypeList"
          :key="index"
          :disabled="loading"
          :value
          @click="firstLoad()"
        >
          {{ rawData[value].name }}
        </v-tab>
      </v-tabs>
      <v-text-field
        v-model="search"
        :hide-details="true"
        append-inner-icon="mdi-magnify"
        class="pn-nav-search"
        density="compact"
        label="请输入帖子 ID 或搜索词"
        variant="outlined"
        @keydown.enter="searchPost()"
        @click:append-inner="searchPost()"
      />
      <div class="pn-nav-btns">
        <v-btn
          :loading="loading"
          class="pn-nav-btn"
          size="small"
          variant="elevated"
          @click="firstLoad(true)"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn class="pn-nav-btn" size="small" variant="elevated" @click="handleList()">
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
      </div>
    </div>
  </v-app-bar>
  <v-window v-model="recentNewsType">
    <v-window-item v-for="(value, index) in bbsEnum.post.newsTypeList" :key="index" :value="value">
      <div class="pn-grid">
        <div v-for="item in postData[value]" :key="item.post.post_id">
          <TPostCard :model-value="item" />
        </div>
      </div>
    </v-window-item>
  </v-window>
  <ToChannel v-model="showList" :gid="gid" />
  <VpOverlaySearch v-model="showSearch" :gid="Number(gid)" :keyword="search" />
</template>
<script lang="ts" setup>
import TPostCard from "@comp/app/t-postcard.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToChannel from "@comp/pageNews/to-channel.vue";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import bbsEnum from "@enum/bbs.js";
import { usePageReachBottom } from "@hooks/reachBottom.js";
import painterReq from "@req/painterReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, type Ref, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

type PostData = Record<TGApp.BBS.Post.NewsTypeEnum, Ref<Array<TGApp.BBS.Post.FullData>>>;
type RawItem = { isLast: boolean; name: string; lastId: number };
type RawData = Record<TGApp.BBS.Post.NewsTypeEnum, Ref<RawItem>>;

const { recentNewsType } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());
const { gid } = <{ gid: string }>useRoute().params;

const { isReachBottom } = usePageReachBottom();

const label = computed<string>(() => {
  const game = gameList.value.find((v) => v.id.toString() === gid);
  return game?.name || "未知分区";
});

const loading = ref<boolean>(false);
const showList = ref<boolean>(false);
const showSearch = ref<boolean>(false);
const search = ref<string>("");

const postData = reactive<PostData>(
  <PostData>(
    Object.fromEntries(
      bbsEnum.post.newsTypeList.map((v) => [v, shallowRef<Array<TGApp.BBS.Post.FullData>>([])]),
    )
  ),
);
const rawData = reactive<RawData>(
  <RawData>Object.fromEntries(
    bbsEnum.post.newsTypeList.map((type) => [
      type,
      shallowRef<RawItem>({
        isLast: false,
        name: bbsEnum.post.newsTypeDesc(type),
        lastId: 0,
      }),
    ]),
  ),
);

onMounted(async () => await firstLoad());

watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value) return;
    await loadMore();
  },
);

async function firstLoad(refresh: boolean = false): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  let key: TGApp.BBS.Post.NewsTypeEnum = bbsEnum.post.newsType.NOTICE;
  if (bbsEnum.post.newsTypeList.includes(recentNewsType.value)) key = recentNewsType.value;
  if (rawData[key].lastId !== 0) {
    if (!refresh) {
      loading.value = false;
      document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    postData[key] = [];
    rawData[key].lastId = 0;
  }
  await showLoading.start(`正在获取${label.value}${rawData[key].name}数据`);
  const getData = await painterReq.news(gid, key);
  await showLoading.update(`数量：${getData.list.length}，是否最后一页：${getData.is_last}`);
  rawData[key] = { isLast: getData.is_last, name: rawData[key].name, lastId: getData.list.length };
  postData[key] = getData.list;
  await showLoading.end();
  await TGLogger.Info(`[News][${gid}][firstLoad] 获取${rawData[key].name}数据成功`);
  showSnackbar.success(
    `获取${label.value}${rawData[key].name}数据成功，共 ${getData.list.length} 条`,
  );
  loading.value = false;
}

function handleList(): void {
  if (showSearch.value === true) showSearch.value = false;
  showList.value = true;
}

// 加载更多
async function loadMore(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  let key: TGApp.BBS.Post.NewsTypeEnum = bbsEnum.post.newsType.NOTICE;
  if (bbsEnum.post.newsTypeList.includes(recentNewsType.value)) key = recentNewsType.value;
  if (rawData[key].isLast) {
    showSnackbar.warn("已经是最后一页了");
    loading.value = false;
    return;
  }
  await showLoading.start(`正在获取${label.value}${rawData[key].name}数据`);
  const mod = rawData[key].lastId % 20;
  const pageSize = mod === 0 ? 20 : 20 - mod;
  const getData = await painterReq.news(gid, key, pageSize, rawData[key].lastId);
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
  width: 100%;
  max-width: 100%;
  height: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding-right: 16px;
  padding-left: 16px;
  column-gap: 16px;
  overflow: auto hidden;
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
  gap: 8px;
  grid-auto-rows: auto;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}
</style>
