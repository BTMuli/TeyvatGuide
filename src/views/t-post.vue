<template>
  <TSwitchTheme />
  <TbCollect :model-value="postId" :data="postData" />
  <TShareBtn
    v-show="!loadingEmpty"
    v-model="postRef"
    v-model:loading="loadShare"
    :title="shareTitle"
  />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="tp-post-body" v-if="postData">
    <div class="tp-post-info">
      <div class="tp-post-version">
        PostID：{{ postId }} | Render by TeyvatGuide v{{ appVersion }}
      </div>
      <div class="tp-post-meta">
        <div class="mpm-forum" v-if="postData.forum">
          <img :src="getGameIcon(postData.forum.game_id)" alt="gameIcon" />
          <img :src="postData.forum.icon" alt="forumIcon" />
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
        <div class="mpm-item" :title="`点赞数：${postData?.stat?.like_num}`">
          <v-icon>mdi-thumb-up</v-icon>
          <span>{{ postData?.stat?.like_num }}</span>
        </div>
        <div class="mpm-item" :title="`转发数：${postData?.stat?.forward_num}`">
          <v-icon>mdi-share-variant</v-icon>
          <span>{{ postData?.stat?.forward_num }}</span>
        </div>
      </div>
      <TpAvatar :data="postData.user" position="right" v-if="postData.user" />
    </div>
    <div class="tp-post-title" @click="toPost()" title="点击查看评论">
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
        <v-icon size="12">mdi-widgets</v-icon>
        <span>{{ postData.collection.collection_title }}</span>
        <span>{{ postData.collection.cur }}/{{ postData.collection.total }}</span>
      </div>
      <div v-for="topic in postData.topics" :key="topic.id" class="tp-post-topic">
        <v-icon size="12">mdi-tag</v-icon>
        <span>{{ topic.name }}</span>
      </div>
    </div>
    <div class="tp-post-subtitle">
      <span :title="`更新时间: ${getDate(postData.post.updated_at)}`">
        创建时间：{{ getDate(postData.post.created_at) }}
      </span>
      <span>分享时间：{{ getDate(shareTime) }}</span>
      <span v-if="postData.post.republish_authorization !== 0" class="tp-post-copyright">
        <v-icon size="20">mdi-copyright</v-icon>
        <span>{{ getRepublishAuthorization(postData.post.republish_authorization) }}</span>
      </span>
    </div>
    <TpParser v-model:data="renderPost" />
  </div>
  <TpoCollection
    v-model="showCollection"
    :collection="postData.collection"
    v-if="postData?.collection"
  />
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { webviewWindow } from "@tauri-apps/api";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import TShareBtn from "../components/main/t-shareBtn.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import TbCollect from "../components/post/tb-collect.vue";
import TpAvatar from "../components/post/tp-avatar.vue";
import TpParser from "../components/post/tp-parser.vue";
import TpoCollection from "../components/post/tpo-collection.vue";
import Mys from "../plugins/Mys/index.js";
import { useAppStore } from "../store/modules/app.js";
import TGClient from "../utils/TGClient.js";
import TGLogger from "../utils/TGLogger.js";
import { createTGWindow } from "../utils/TGWindow.js";
import TGConstant from "../web/constant/TGConstant.js";

// loading
const loading = ref<boolean>(true);
const loadShare = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();
const loadingEmpty = ref<boolean>(false);

// share
const postRef = ref<HTMLElement>(<HTMLElement>{});
const shareTitle = ref<string>("");

// 数据
const appVersion = ref<string>();
const postId = Number(useRoute().params.post_id);
const renderPost = ref<TGApp.Plugins.Mys.SctPost.Base[]>([]);
const postData = ref<TGApp.Plugins.Mys.Post.FullData>();
// 当前时间，秒级时间戳
const shareTime = ref<number>(Math.floor(Date.now() / 1000));
// 时间更新定时器
const shareTimeTimer = ref<any>();
// 合集
const showCollection = ref<boolean>(false);

function getGameIcon(gameId: number): string {
  const find = TGConstant.BBS.CHANNELS.find((item) => item.gid === gameId.toString());
  if (find) return find.icon;
  return "/platforms/mhy/mys.webp";
}

onMounted(async () => {
  appVersion.value = await app.getVersion();
  // 检查数据
  if (!postId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    await webviewWindow.getCurrentWebviewWindow().setTitle("未找到数据");
    await TGLogger.Error("[t-post][onMounted] PostID 不存在");
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  try {
    postData.value = await Mys.Post.get(postId);
    loadingTitle.value = "正在渲染数据...";
    renderPost.value = getRenderPost(postData.value);
    shareTitle.value = `Post_${postId}`;
    await webviewWindow
      .getCurrentWebviewWindow()
      .setTitle(`Post_${postId} ${postData.value.post.subject}`);
  } catch (error) {
    if (error instanceof Error) {
      await TGLogger.Error(`[t-post][${postId}] ${error.name}: ${error.message}`);
      loadingTitle.value = error.name;
      loadingSub.value = error.message;
    } else {
      console.error(error);
      loadingTitle.value = "帖子不存在或解析失败";
      loadingSub.value = "请检查帖子是否存在或者是否为合法的帖子";
    }
    loadingEmpty.value = true;
    await webviewWindow.getCurrentWebviewWindow().setTitle(`Post_${postId} Parsing Error`);
    return;
  }
  await TGLogger.Info(`[t-post][${postId}][onMounted] ${postData.value.post.subject}`);
  // 打开 json
  const isDev = useAppStore().devMode ?? false;
  if (isDev) {
    await TGLogger.Info(`[t-post][${postId}][onMounted] 打开 JSON 窗口`);
    await createPostJson(postId);
  }
  await nextTick(() => {
    shareTimeTimer.value = setInterval(() => {
      shareTime.value = Math.floor(Date.now() / 1000);
    }, 1000);
    loading.value = false;
    postRef.value = <HTMLElement>document.querySelector(".tp-post-body");
  });
});

watch(loadShare, async (value) => {
  if (value) {
    shareTime.value = Math.floor(Date.now() / 1000);
    loadingTitle.value = "正在生成分享图片";
    loadingSub.value = `${shareTitle.value}.png`;
    loading.value = true;
    await TGLogger.Info(`[t-post.vue][${postId}][share] 生成分享图片：${shareTitle.value}.png`);
  } else {
    loadingSub.value = "";
    loading.value = false;
    await TGLogger.Info(`[t-post.vue][${postId}][share] 生成分享图片完成：${shareTitle.value}.png`);
  }
});

function showOverlayC() {
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

function getRenderPost(data: TGApp.Plugins.Mys.Post.FullData): TGApp.Plugins.Mys.SctPost.Base[] {
  const postContent = data.post.content;
  let jsonParse: string;
  if (postContent.startsWith("<")) {
    jsonParse = data.post.structured_content;
  } else {
    try {
      jsonParse = parseContent(data.post.content);
    } catch (e) {
      if (e instanceof SyntaxError) {
        TGLogger.Warn(`[t-post][${postId}] ${e.name}: ${e.message}`);
      }
      jsonParse = data.post.structured_content;
    }
  }
  return JSON.parse(jsonParse);
}

function parseContent(content: string): string {
  const data: TGApp.Plugins.Mys.SctPost.Other = JSON.parse(content);
  const result: TGApp.Plugins.Mys.SctPost.Base[] = [];
  const keys = Object.keys(data);
  keys.forEach((key) => {
    switch (key) {
      case "describe":
        result.push({
          insert: data.describe,
        });
        break;
      case "imgs":
        data.imgs.forEach((item) => {
          result.push({
            insert: {
              image: item,
            },
          });
        });
        break;
      default:
        TGLogger.Warn(`[t-post][${postId}][parseContent] Unknown key: ${key}`);
        result.push({
          insert: data[key],
        });
        break;
    }
  });
  return JSON.stringify(result);
}

async function createPostJson(postId: number): Promise<void> {
  const jsonPath = `/post_detail_json/${postId}`;
  const jsonTitle = `Post_${postId}_JSON`;
  await createTGWindow(jsonPath, "Dev_JSON", jsonTitle, 960, 720, false, false);
}

async function toPost(): Promise<void> {
  const url = `https://m.miyoushe.com/ys/#/article/${postId}`;
  await TGClient.open("web_thin", url);
}

onUnmounted(() => {
  clearInterval(shareTimeTimer.value);
});
</script>
<style lang="css" scoped>
.tp-post-body {
  width: 800px;
  margin: 0 auto;
  font-family: var(--font-text);
}

/* title */
.tp-post-title {
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: start;
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.mpt-official {
  display: inline-block;
  width: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin-right: 2px;
  background: var(--common-shadow-1);
  color: var(--box-text-5);
  font-size: 16px;
  text-align: center;
}

/* subtitle */
.tp-post-subtitle {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
  font-size: 16px;
  opacity: 0.6;
}

.tp-post-copyright {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

/* info */
.tp-post-info {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--common-shadow-2);
  margin-bottom: 10px;
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

/* meta */
.tp-post-meta {
  display: flex;
  align-items: center;
  justify-content: start;
  color: var(--box-text-4);
  column-gap: 10px;
  font-size: 14px;
}

.mpm-forum {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mpm-forum img {
  width: 30px;
  height: 30px;
  object-fit: cover;
}

.mpm-forum img:first-child {
  border-radius: 5px;
  margin-right: 5px;
}

.mpm-forum span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mpm-item {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  column-gap: 2px;
  opacity: 0.8;
}

/* extra */
.tp-post-extra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
  gap: 5px 10px;
}

/* collection */
.tp-post-collection {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  color: var(--box-text-3);
  column-gap: 5px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 12px;
}

/* topic */
.tp-post-topic {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-5);
  font-family: var(--font-title);
  font-size: 12px;
}
</style>
