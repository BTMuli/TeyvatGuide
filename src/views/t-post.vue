<template>
  <TSwitchTheme />
  <TPinWin />
  <VpBtnCollect :model-value="postId" :data="postData" />
  <TShareBtn selector=".tp-post-body" :title="`Post_${postId}`" />
  <VpBtnReply :gid="postData.post.game_id" :post-id="postData.post.post_id" v-if="postData" />
  <div class="tp-post-body" v-if="postData">
    <div class="tp-post-info">
      <div class="tp-post-version" @click="openJson()">
        PostID：{{ postId }} | Render by TeyvatGuide v{{ appVersion }}
      </div>
      <div class="tp-post-meta">
        <div class="mpm-forum" v-if="postData.forum" @click="toForum(postData.forum)">
          <TMiImg :src="getGameIcon(postData.forum.game_id)" alt="gameIcon" />
          <TMiImg :src="postData.forum.icon" alt="forumIcon" :ori="true" />
          <span>{{ postData.forum.name }}</span>
        </div>
        <div class="mpm-item" :title="`浏览数：${postData?.stat?.view_num}`">
          <v-icon>mdi-eye</v-icon>
          <span>{{ postData?.stat?.view_num }}</span>
        </div>
        <div class="mpm-item" :title="`收藏数：${postData?.stat?.bookmark_num}`">
          <v-icon>mdi-star</v-icon>
          <span>{{ postData?.stat?.bookmark_num }}</span>
        </div>
        <div class="mpm-item" :title="`回复数：${postData?.stat?.reply_num}`">
          <v-icon>mdi-comment</v-icon>
          <span>{{ postData?.stat?.reply_num }}</span>
        </div>
        <div
          class="mpm-item"
          :title="`点赞数：${postData?.stat?.like_num}`"
          @click="tryLike()"
          :class="{ like: isLike }"
        >
          <v-icon>mdi-thumb-up</v-icon>
          <span>{{ postData?.stat?.like_num }}</span>
        </div>
        <div class="mpm-item" :title="`转发数：${postData?.stat?.forward_num}`">
          <v-icon>mdi-share-variant</v-icon>
          <span>{{ postData?.stat?.forward_num }}</span>
        </div>
      </div>
      <TpAvatar
        :data="postData.user"
        position="right"
        style="cursor: pointer"
        v-if="postData.user"
        @click="handleUser(postData.user)"
      />
    </div>
    <div class="tp-post-divider" />
    <div class="tp-post-title" @click="toPost()">
      <span class="mpt-official" v-if="postData.post.post_status.is_official">官</span>
      <span>{{ postData.post.subject }}</span>
    </div>
    <!-- 一些附加信息，比如 topic、collection 等 -->
    <div class="tp-post-extra">
      <div
        class="tp-post-collection"
        :title="`合集ID：${postData.collection.collection_id}`"
        v-if="postData.collection"
        @click="showOverlayC()"
      >
        <v-icon size="10">mdi-widgets</v-icon>
        <span>{{ postData.collection.collection_title }}</span>
        <span>{{ postData.collection.cur }}/{{ postData.collection.total }}</span>
      </div>
      <div
        v-for="(tag, idx) in postData.recommend_reason?.tags"
        :key="idx"
        class="tp-post-reason"
        title="推荐理由"
      >
        <v-icon size="10">mdi-lightbulb-on</v-icon>
        <span>{{ tag.text }}</span>
      </div>
      <div
        v-for="topic in postData.topics"
        :key="topic.id"
        class="tp-post-topic"
        @click="toTopic(topic)"
      >
        <v-icon size="10">mdi-tag</v-icon>
        <span>{{ topic.name }}</span>
      </div>
    </div>
    <div class="tp-post-subtitle">
      <span :title="`更新于:${getDate(postData.post.updated_at)}`">
        创建于:{{ getDate(postData.post.created_at) }}
      </span>
      <span>分享于:{{ getDate(shareTime) }}</span>
      <span v-if="postData.post.republish_authorization !== 0" class="tp-post-copyright">
        <v-icon size="16">mdi-copyright</v-icon>
        <span>{{ getRepublishAuthorization(postData.post.republish_authorization) }}</span>
      </span>
    </div>
    <TpParser v-model:data="renderPost" />
  </div>
  <VpOverlayCollection
    v-model="showCollection"
    :collection="postData.collection"
    :gid="postData.post.game_id"
    v-if="postData?.collection && postData"
  />
  <VpOverlayUser v-if="postData" :gid="postData.post.game_id" :uid="curUid" v-model="showUser" />
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TPinWin from "@comp/app/t-pinWin.vue";
import TShareBtn from "@comp/app/t-shareBtn.vue";
import TSwitchTheme from "@comp/app/t-switchTheme.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import TpParser from "@comp/viewPost/tp-parser.vue";
import VpBtnCollect from "@comp/viewPost/vp-btn-collect.vue";
import VpBtnReply from "@comp/viewPost/vp-btn-reply.vue";
import VpOverlayCollection from "@comp/viewPost/vp-overlay-collection.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import apiHubReq from "@req/apiHubReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { app, webviewWindow } from "@tauri-apps/api";
import { emit, type Event, listen, type UnlistenFn } from "@tauri-apps/api/event";
import TGClient from "@utils/TGClient.js";
import TGLogger from "@utils/TGLogger.js";
import { createTGWindow } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { onBeforeMount, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { useRoute } from "vue-router";

const { incognito } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());
const { cookie } = storeToRefs(useUserStore());

const appVersion = ref<string>();
const postId = Number(useRoute().params.post_id);
const showCollection = ref<boolean>(false);
const isLike = ref<boolean>(false);
const shareTime = ref<number>(Math.floor(Date.now() / 1000));
const curUid = ref<string>("");
const showUser = ref<boolean>(false);
const renderPost = shallowRef<Array<TGApp.BBS.SctPost.Base>>([]);
const postData = shallowRef<TGApp.BBS.Post.FullData>();

// eslint-disable-next-line no-undef
let shareTimer: NodeJS.Timeout | null = null;
let incognitoListener: UnlistenFn | null = null;
let userListener: UnlistenFn | null = null;

function getGameIcon(gameId: number): string {
  const find = gameList.value.find((item) => item.id === gameId);
  if (find) return find.app_icon;
  return "/platforms/mhy/mys.webp";
}

onBeforeMount(async () => {
  incognitoListener = await listen<void>("switchIncognito", () => window.location.reload());
  userListener = await listen<string>("userMention", (e: Event<string>) => {
    if (e.payload !== curUid.value) curUid.value = e.payload;
    if (showCollection.value) showCollection.value = false;
    showUser.value = true;
  });
});

onMounted(async () => {
  await showLoading.start(`正在加载帖子数据`);
  appVersion.value = await app.getVersion();
  if (!postId) {
    await showLoading.empty("PostID 不存在");
    await webviewWindow.getCurrentWebviewWindow().setTitle("未找到数据");
    await TGLogger.Error("[t-post][onMounted] PostID 不存在");
    return;
  }
  await showLoading.update(`帖子ID: ${postId}`);
  let ck: undefined | Record<string, string> = undefined;
  if (cookie.value && incognito.value === false) {
    ck = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  }
  const resp = await postReq.post(postId, ck);
  if ("retcode" in resp) {
    await showLoading.empty("数据加载失败", `[${resp.retcode}]${resp.message}`);
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await webviewWindow.getCurrentWebviewWindow().setTitle(`Post_${postId} ${resp.message}`);
    await TGLogger.Error(`[t-post][${postId}][onMounted] ${resp.retcode}: ${resp.message}`);
    return;
  }
  postData.value = resp;
  isLike.value = postData.value.self_operation.upvote_type !== 0;
  await showLoading.update("正在渲染数据");
  renderPost.value = await getRenderPost(postData.value);
  await webviewWindow
    .getCurrentWebviewWindow()
    .setTitle(`Post_${postId} ${postData.value.post.subject}`);
  await TGLogger.Info(`[t-post][${postId}][onMounted] ${postData.value.post.subject}`);
  const isDev = useAppStore().devMode ?? false;
  if (isDev) await openJson();
  if (shareTimer !== null) {
    clearInterval(shareTimer);
    shareTimer = null;
  }
  shareTimer = setInterval(getShareTimer, 1000);
  await showLoading.end();
});

onUnmounted(() => {
  if (shareTimer !== null) {
    clearInterval(shareTimer);
    shareTimer = null;
  }
  if (incognitoListener !== null) {
    incognitoListener();
    incognitoListener = null;
  }
  if (userListener !== null) {
    userListener();
    userListener = null;
  }
});

async function openJson(): Promise<void> {
  // @ts-expect-error import.meta
  if (import.meta.env.MODE === "production") return;
  await createPostJson(postId);
}

function getShareTimer(): void {
  shareTime.value = Math.floor(Date.now() / 1000);
}

function showOverlayC() {
  if (showUser.value) showUser.value = false;
  showCollection.value = true;
}

function getDate(date: number): string {
  return new Date(date * 1000).toLocaleString().replace(/\//g, "-");
}

function getRepublishAuthorization(type: number): string {
  switch (type) {
    case 1:
      return "已开启创作声明，禁止转载或摘编";
    case 2:
      return "已开启创作声明，允许规范转载";
    default:
      return "未知";
  }
}

async function getRenderPost(
  data: TGApp.BBS.Post.FullData,
): Promise<Array<TGApp.BBS.SctPost.Base>> {
  const postContent = data.post.content;
  let jsonParse: string;
  if (postContent.startsWith("<")) {
    jsonParse = data.post.structured_content;
  } else {
    try {
      jsonParse = await parseContent(data.post.content);
    } catch (e) {
      if (e instanceof SyntaxError) {
        await TGLogger.Warn(`[t-post][${postId}] ${e.name}: ${e.message}`);
      }
      jsonParse = data.post.structured_content;
    }
  }
  return JSON.parse(jsonParse);
}

async function parseContent(content: string): Promise<string> {
  const data: TGApp.BBS.SctPost.Other = JSON.parse(content);
  const result: TGApp.BBS.SctPost.Base[] = [];
  for (const key of Object.keys(data)) {
    switch (key) {
      case "describe":
        result.push({ insert: data.describe });
        break;
      case "imgs":
        data.imgs.forEach((item) => result.push({ insert: { image: item } }));
        break;
      case "link_card_ids":
        if (!data.link_card_ids) break;
        for (const item of data.link_card_ids) {
          const dataFind = postData.value?.link_card_list.find((card) => card.card_id === item);
          if (dataFind) result.push({ insert: { link_card: dataFind } });
          else {
            await TGLogger.Warn(`[t-post][${postId}][parseContent] link_card_ids: ${item} 未找到`);
          }
        }
        break;
      default:
        await TGLogger.Warn(`[t-post][${postId}][parseContent] Unknown key: ${key}`);
        // @ts-expect-error unknown key
        result.push({ insert: data[key] });
        break;
    }
  }
  return JSON.stringify(result);
}

async function createPostJson(postId: number): Promise<void> {
  const jsonPath = `/post_detail_json/${postId}`;
  const jsonTitle = `Post_${postId}_JSON`;
  await createTGWindow(jsonPath, "Dev_JSON", jsonTitle, 960, 720, false, false);
}

async function tryLike(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.error("请先登录");
    return;
  }
  if (!postData.value) {
    showSnackbar.error("数据未加载");
    return;
  }
  if (incognito.value) {
    showSnackbar.error("无法在无痕浏览模式下操作");
    return;
  }
  const ck = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  const resp = await apiHubReq.post.like(postData.value.post.post_id, ck, isLike.value);
  if (resp.retcode !== 0) {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  isLike.value = !isLike.value;
  postData.value.stat!.like_num += isLike.value ? 1 : -1;
  showSnackbar.success(isLike.value ? "点赞成功" : "取消点赞成功");
}

async function toPost(): Promise<void> {
  const channel = gameList.value.find((item) => item.id === postData.value?.post.game_id);
  const link = channel
    ? `https://m.miyoushe.com/${channel.en_name}/#/article/${postId}`
    : `https://m.miyoushe.com/ys/#/article/${postId}`;
  await TGClient.open("web_thin", link);
}

async function toTopic(topic: TGApp.BBS.Post.Topic): Promise<void> {
  const gid = postData.value?.post.game_id ?? topic.game_id;
  await emit("active_deep_link", `router?path=/posts/topic/${gid}/${topic.id}`);
}

async function toForum(forum: TGApp.BBS.Post.Forum): Promise<void> {
  await emit("active_deep_link", `router?path=/posts/forum/${forum.game_id}/${forum.id}`);
}

function handleUser(user: TGApp.BBS.Post.User): void {
  curUid.value = user.uid;
  if (showCollection.value) showCollection.value = false;
  showUser.value = true;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tp-post-body {
  width: 800px;
  margin: 0 auto;
  font-family: var(--font-text);
}

.tp-post-title {
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: start;
  color: var(--common-text-title);
  column-gap: 4px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.mpt-official {
  position: relative;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--common-shadow-1);
  color: var(--box-text-5);
  font-size: 16px;
  text-align: center;
}

.tp-post-subtitle {
  position: relative;
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
  font-size: 16px;
  opacity: 0.6;
}

.tp-post-copyright {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
}

.tp-post-info {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: space-between;
}

.tp-post-divider {
  position: relative;
  width: 100%;
  height: 1px;
  box-sizing: border-box;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 1px;
  margin: 8px 0;
  background: transparent;
}

.tp-post-version {
  position: absolute;
  top: 0;
  left: 0;
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 14px;
  opacity: 0.6;
}

.tp-post-meta {
  display: flex;
  align-items: center;
  justify-content: start;
  color: var(--box-text-4);
  column-gap: 8px;
  font-size: 14px;
}

.mpm-forum {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  img {
    width: 28px;
    height: 28px;
    object-fit: cover;

    &:first-child {
      border-radius: 4px;
    }
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.mpm-item {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 2px;
  opacity: 0.8;

  &.like {
    color: var(--tgc-pink-1);
  }
}

.tp-post-extra {
  position: relative;
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
  gap: 8px 4px;
}

.tp-post-collection,
.tp-post-topic,
.tp-post-reason {
  display: flex;
  height: 20px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  column-gap: 2px;
  font-family: var(--font-title);
  font-size: 12px;
}

.tp-post-collection {
  @include github-styles.github-tag-dark-gen(#3572a5);

  cursor: pointer;

  &:hover {
    @include github-styles.github-tag-dark-gen(#98c379);
  }
}

.tp-post-topic {
  @include github-styles.github-tag-dark-gen(#e06c63);

  cursor: pointer;

  &:hover {
    @include github-styles.github-tag-dark-gen(#00aeec);
  }
}

.tp-post-reason {
  @include github-styles.github-tag-dark-gen(#d19a66);
}
</style>
