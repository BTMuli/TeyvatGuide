<template>
  <TSwitchTheme />
  <TShareBtn
    v-show="!loadingEmpty"
    v-model="postRef"
    v-model:loading="loadShare"
    :title="shareTitle"
  />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="tp-post-body">
    <div class="tp-post-info">
      <div class="tp-post-version">
        PostID：{{ postId }} | Render by TeyvatGuide v{{ appVersion }}
      </div>
      <div class="tp-post-meta">
        <div class="mpm-forum" v-if="postRender.forum !== null">
          <img :src="postRender.forum.icon" alt="forumIcon" />
          <span>{{ postRender.forum?.name }}</span>
        </div>
        <div class="mpm-item" :title="`浏览数：${postRender.metadata.view_num}`">
          <v-icon>mdi-eye</v-icon>
          <span>{{ postRender.metadata.view_num }}</span>
        </div>
        <div class="mpm-item" :title="`收藏数：${postRender.metadata.bookmark_num}`">
          <v-icon>mdi-star</v-icon>
          <span>{{ postRender.metadata.bookmark_num }}</span>
        </div>
        <div class="mpm-item" :title="`回复数：${postRender.metadata.reply_num}`">
          <v-icon>mdi-comment</v-icon>
          <span>{{ postRender.metadata.reply_num }}</span>
        </div>
        <div class="mpm-item" :title="`点赞数：${postRender.metadata.like_num}`">
          <v-icon>mdi-thumb-up</v-icon>
          <span>{{ postRender.metadata.like_num }}</span>
        </div>
        <div class="mpm-item" :title="`转发数：${postRender.metadata.forward_num}`">
          <v-icon>mdi-share-variant</v-icon>
          <span>{{ postRender.metadata.forward_num }}</span>
        </div>
      </div>
      <div class="tp-post-author">
        <div class="mpa-left">
          <span>{{ postRender.author.nickname }}</span>
          <span :title="getMpaLeftDesc()">{{ getMpaLeftDesc() }}</span>
        </div>
        <div class="mpa-right">
          <div class="mpa-icon">
            <img :src="postRender.author.avatar_url" alt="userIcon" />
          </div>
          <div v-if="postRender.author.pendant !== ''" class="mpa-pendant">
            <img :src="postRender.author.pendant" alt="userPendant" />
          </div>
        </div>
      </div>
    </div>
    <div class="tp-post-title">
      <span class="mpt-official" v-if="postRender.isOfficial">官</span>
      <span>{{ postRender.title }}</span>
    </div>
    <div class="tp-post-subtitle">
      <span>创建时间：{{ postRender.created }}&emsp;</span>
      <span>更新时间：{{ postRender.updated }}</span>
    </div>
    <TpParser v-model:data="renderPost" />
  </div>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { appWindow } from "@tauri-apps/api/window";
import { nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import TShareBtn from "../components/main/t-shareBtn.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import TpParser from "../components/post/tp-parser.vue";
import Mys from "../plugins/Mys";
import { useAppStore } from "../store/modules/app";
import { createTGWindow } from "../utils/TGWindow";

interface PostRender {
  title: string;
  isOfficial: boolean;
  created: string;
  updated: string;
  author: Partial<TGApp.Plugins.Mys.User.Post>;
  forum: TGApp.Plugins.Mys.Post.Forum | null;
  metadata: TGApp.Plugins.Mys.Post.Stat;
}

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
const postRender = ref<PostRender>({
  title: "",
  isOfficial: false,
  created: "",
  updated: "",
  author: {
    nickname: "",
    certification: {
      type: 0,
      label: "",
    },
  },
  forum: null,
  metadata: {
    view_num: 0,
    bookmark_num: 0,
    reply_num: 0,
    like_num: 0,
    forward_num: 0,
    original_like_num: 0,
    post_upvote_stat: [],
  },
});

onMounted(async () => {
  await appWindow.show();
  appVersion.value = await app.getVersion();
  // 检查数据
  if (!postId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    await appWindow.setTitle("未找到数据");
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  try {
    const postData = await Mys.Post.get(postId);
    loadingTitle.value = "正在渲染数据...";
    renderPost.value = getRenderPost(postData);
    postRender.value = {
      title: postData.post.subject,
      isOfficial: postData.post.post_status.is_official,
      created: new Date(postData.post.created_at * 1000).toLocaleString().replace(/\//g, "-"),
      updated: new Date(postData.post.updated_at * 1000).toLocaleString().replace(/\//g, "-"),
      author: postData.user,
      forum: postData.forum,
      metadata: postData.stat,
    };
    shareTitle.value = `Post_${postId}`;
    postRef.value = <HTMLElement>document.querySelector(".tp-post-body");
    await appWindow.setTitle(`Post_${postId} ${postData.post.subject}`);
  } catch (error) {
    console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "帖子不存在或解析失败";
    loadingSub.value = error instanceof Error ? error.message : <string>error;
    await appWindow.setTitle(`Post_${postId} Parsing Error`);
    return;
  }
  // 打开 json
  const isDev = useAppStore().devMode ?? false;
  if (isDev) {
    createPostJson(postId.toString());
  }
  await nextTick(() => {
    loading.value = false;
  });
});

watch(loadShare, (value) => {
  if (value) {
    loadingTitle.value = "正在生成分享图片";
    loadingSub.value = `${shareTitle.value}.png`;
    loading.value = true;
  } else {
    loadingSub.value = "";
    loading.value = false;
  }
});

function getMpaLeftDesc(): string {
  return postRender.value.author.certification?.label === ""
    ? postRender.value.author.introduce ?? ""
    : postRender.value.author.certification?.label ?? "";
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
        console.warn(`[MysPostParser] Unknown key: ${key}`);
        result.push({
          insert: data[key],
        });
        break;
    }
  });
  return JSON.stringify(result);
}

function createPostJson(postId: string): void {
  const jsonPath = `/post_detail_json/${postId}`;
  const jsonTitle = `Post_${postId}_JSON`;
  createTGWindow(jsonPath, "Dev_JSON", jsonTitle, 960, 720, false, false);
}
</script>
<style lang="css" scoped>
.tp-post-body {
  width: 800px;
  margin: 0 auto;
  font-family: var(--font-text);
}

/* title */
.tp-post-title {
  margin: 10px auto;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.mpt-official {
  display: inline-block;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin-right: 2px;
  background: var(--common-shadow-1);
  color: var(--box-text-3);
  text-align: center;
}

/* subtitle */
.tp-post-subtitle {
  font-size: 16px;
  opacity: 0.6;
}

/* info */
.tp-post-info {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--common-shadow-2);
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

/* author */
.tp-post-author {
  display: flex;
}

.mpa-left {
  position: relative;
  display: flex;
  height: 50px;
  flex-direction: column;
  align-items: end;
  color: var(--box-text-4);
}

.mpa-left :nth-child(1) {
  font-size: 16px;
}

.mpa-left :nth-child(2) {
  overflow: hidden;
  height: 20px;
  align-items: center;
  border-top: 2px solid var(--common-shadow-2);
  font-size: 14px;
  opacity: 0.7;
  text-align: right;
  text-overflow: ellipsis;
}

.mpa-right {
  position: relative;
  width: 50px;
  height: 50px;
}

.mpa-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.mpa-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mpa-pendant {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 50px;
  height: 50px;
}

.mpa-pendant img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
</style>
