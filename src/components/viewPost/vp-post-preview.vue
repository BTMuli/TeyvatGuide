<!-- 帖子窄屏预览卡片 -->
<template>
  <article
    aria-label="帖子预览"
    class="vp-post-preview"
    @click.capture="handlePostPreviewClick"
    @auxclick.capture="handlePostPreviewClick"
    @contextmenu.capture.stop
  >
    <header class="vp-post-preview-meta">
      <span v-if="forumName" class="vp-post-preview-forum">
        <TMiImg v-if="gameIcon" alt="游戏" :ori="true" :size="28" :src="gameIcon" />
        <TMiImg v-if="forumIcon" :alt="forumName" :ori="true" :size="28" :src="forumIcon" />
        <span class="vp-post-preview-forum-text">
          <span class="vp-post-preview-forum-name">{{ forumName }}</span>
          <span v-if="categoryName" class="vp-post-preview-category">{{ categoryName }}</span>
        </span>
      </span>
      <span v-else class="vp-post-preview-forum is-empty">未选择版块</span>
      <span class="vp-post-preview-author">
        <span class="vp-post-preview-author-text">
          <span class="vp-post-preview-nickname">{{ nickname || "当前账号" }}</span>
          <span v-if="authorDesc" class="vp-post-preview-author-desc">{{ authorDesc }}</span>
        </span>
        <span class="vp-post-preview-avatar">
          <TMiImg
            v-if="avatar"
            :alt="nickname || '账号头像'"
            :ori="true"
            :size="40"
            :src="avatar"
          />
          <v-icon v-else size="20">mdi-account-outline</v-icon>
          <span
            v-if="authorLevel !== undefined"
            :style="{ background: levelColor }"
            class="vp-post-preview-level"
          >
            {{ authorLevel }}
          </span>
        </span>
      </span>
    </header>
    <div class="vp-post-preview-divider" />
    <div :class="{ 'is-empty': !hasTitle }" class="vp-post-preview-title">
      <TpTitle v-if="hasTitle" :text="subject" />
      <template v-else>未填写标题</template>
    </div>
    <div v-if="topics.length > 0" class="vp-post-preview-topics">
      <TpcTag v-for="topic in topics" :key="topic" :tag="topic" class="vp-post-preview-topic" />
    </div>
    <div class="vp-post-preview-data">
      <span
        v-for="item in previewStats"
        :key="item.label"
        :title="item.label + '：' + item.value"
        class="vp-post-preview-data-item"
      >
        <v-icon size="16">{{ item.icon }}</v-icon>
        <span>{{ item.value }}</span>
      </span>
    </div>
    <div
      v-if="createdAt !== undefined || sharedAt !== undefined || declarations.length > 0"
      class="vp-post-preview-subtitle"
    >
      <span v-if="createdAt !== undefined" :title="updatedTitle">创建于:{{ createdDate }}</span>
      <span v-if="sharedAt !== undefined">分享于:{{ sharedDate }}</span>
      <span v-for="item in declarations" :key="item.label" class="vp-post-preview-declaration">
        <v-icon size="16">{{ item.icon }}</v-icon>
        <span>{{ item.label }}</span>
      </span>
    </div>
    <div v-if="nodes.length > 0" class="vp-post-preview-body">
      <TpParser :key="parserKey" :data="previewNodes" />
    </div>
  </article>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { providePostPreview } from "@hooks/usePostPreview.js";
import { createPostPreviewNodes, handlePostPreviewClick } from "@utils/bbs/postPreview.js";
import { getCommunityProfileLevelColor } from "@utils/community/profileLevel.js";
import { computed } from "vue";

import TpParser from "./tp-parser.vue";
import TpTitle from "./tp-title.vue";
import TpcTag from "./tpc-tag.vue";

/**
 * 帖子窄屏预览参数。
 * @since Beta v0.13.0
 */
type PostPreviewProps = {
  /** 帖子标题 */
  subject: string;
  /** 已校验的帖子节点 */
  nodes: Array<TGApp.BBS.PostEdit.Node>;
  /** 已选择话题名称 */
  topics: Array<string>;
  /** 发布版块名称 */
  forumName: string;
  /** 发布版块图标 */
  forumIcon: string;
  /** 游戏图标 */
  gameIcon: string;
  /** 版块分类 */
  categoryName: string;
  /** 当前账号昵称 */
  nickname: string;
  /** 当前账号头像 */
  avatar: string;
  /** 当前账号简介 */
  authorDesc: string;
  /** 当前账号社区等级 */
  authorLevel?: number;
  /** 帖子创建时间，秒级时间戳 */
  createdAt?: number;
  /** 帖子更新时间，秒级时间戳 */
  updatedAt?: number;
  /** 预览分享时间，秒级时间戳 */
  sharedAt?: number;
  /** 是否原创 */
  isOriginal: number;
  /** 转载授权 */
  republishAuthorization: number;
  /** AI 内容声明 */
  aiContentChoice: string;
};

/** 预览中的声明项。 @since Beta v0.13.0 */
type PreviewDeclaration = {
  label: string;
  icon: string;
};

const props = defineProps<PostPreviewProps>();
providePostPreview();
const previewStats = [
  { label: "浏览数", value: "1284", icon: "mdi-eye" },
  { label: "收藏数", value: "96", icon: "mdi-star" },
  { label: "回复数", value: "32", icon: "mdi-comment" },
  { label: "点赞数", value: "218", icon: "mdi-thumb-up" },
  { label: "转发数", value: "12", icon: "mdi-share-variant" },
];
const hasTitle = computed<boolean>(() => props.subject.trim().length > 0);
const levelColor = computed<string>(() => getCommunityProfileLevelColor(props.authorLevel));
const createdDate = computed<string>(() =>
  props.createdAt === undefined ? "" : formatDate(props.createdAt),
);
const sharedDate = computed<string>(() =>
  props.sharedAt === undefined ? "" : formatDate(props.sharedAt),
);
const updatedTitle = computed<string | undefined>(() =>
  props.updatedAt === undefined ? undefined : `更新于:${formatDate(props.updatedAt)}`,
);
const previewNodes = computed<Array<TGApp.BBS.SctPost.Base>>(() =>
  createPostPreviewNodes(props.nodes),
);
const parserKey = computed<string>(() =>
  JSON.stringify(
    previewNodes.value.map((node) => {
      if (typeof node.insert !== "string") return node;
      return {
        insert: node.insert.includes("_(") ? node.insert : "text",
        attributes: node.attributes ?? null,
      };
    }),
  ),
);
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString().replace(/\//g, "-");
}

const declarations = computed<Array<PreviewDeclaration>>(() => {
  const items: Array<PreviewDeclaration> = [];
  if (props.isOriginal === 1) items.push({ label: "原创", icon: "mdi-check-circle-outline" });
  if (props.republishAuthorization === 1)
    items.push({ label: "禁止转载或摘编", icon: "mdi-copyright" });
  if (props.republishAuthorization === 2)
    items.push({ label: "允许规范转载", icon: "mdi-copyright" });
  if (props.aiContentChoice === "USER_AI_CONTENT_CHOICE_IS_AI")
    items.push({ label: "含 AI 生成内容", icon: "mdi-robot" });
  if (props.aiContentChoice === "USER_AI_CONTENT_CHOICE_NOT_AI")
    items.push({ label: "不含 AI 生成内容", icon: "mdi-robot-off-outline" });
  return items;
});
</script>
<style lang="scss" scoped>
.vp-post-preview {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 400px;
  flex-direction: column;
  margin: 0 auto;
  color: var(--app-page-content);
  font-family: var(--font-text);
  font-size: 16px;
  line-height: 1.5;
}

.vp-post-preview-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-4);
  font-size: 14px;
  gap: 8px;
}

.vp-post-preview-forum {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  gap: 4px;

  &.is-empty {
    opacity: 0.7;
  }

  :deep(img) {
    width: 28px;
    height: 28px;
    flex: none;
    border-radius: 4px;
    object-fit: cover;
  }
}

.vp-post-preview-forum-text {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-direction: column;
}

.vp-post-preview-forum-name {
  overflow: hidden;
  min-width: 0;
  color: var(--box-text-4);
  font-size: 14px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-post-preview-category {
  overflow: hidden;
  min-width: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-post-preview-author {
  display: flex;
  overflow: hidden;
  min-width: 0;
  max-width: 55%;
  flex: none;
  align-items: center;
}

.vp-post-preview-author-text {
  display: flex;
  overflow: hidden;
  max-width: calc(100% - 50px);
  height: 50px;
  flex-direction: column;
  align-items: flex-end;
  color: var(--box-text-4);
}

.vp-post-preview-nickname {
  overflow: hidden;
  max-width: 100%;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-post-preview-author-desc {
  overflow: hidden;
  width: 100%;
  height: 26px;
  border-top: 1px dotted var(--common-shadow-4);
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.7;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-post-preview-avatar {
  position: relative;
  display: inline-flex;
  width: 50px;
  height: 50px;
  box-sizing: border-box;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  background: var(--common-shadow-1);
  color: var(--box-text-4);
}

.vp-post-preview-avatar :deep(img) {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: contain;
}

.vp-post-preview-level {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--tgc-white-1);
  font-size: 10px;
  line-height: 18px;
  text-align: center;
}

.vp-post-preview-divider {
  width: 100%;
  height: 1px;
  box-sizing: border-box;
  border-radius: 1px;
  border-top: 1px dashed var(--common-shadow-2);
  margin-top: 8px;
}

.vp-post-preview-title {
  position: relative;
  width: fit-content;
  max-width: 100%;
  margin: 0 0 4px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: inherit;
  line-height: 1.5;

  &.is-empty {
    color: var(--box-text-4);
  }
}

.vp-post-preview-topics {
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  gap: 8px 4px;
}

.vp-post-preview-topic {
  max-width: 100%;
  font-size: 12px;
  pointer-events: none;
}

.vp-post-preview-data {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: 4px;
  color: var(--box-text-4);
  column-gap: 8px;
  font-size: 12px;
}

.vp-post-preview-data-item {
  display: inline-flex;
  align-items: center;
  column-gap: 2px;
  opacity: 0.8;
}

.vp-post-preview-subtitle {
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  margin: 4px 0;
  column-gap: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.vp-post-preview-declaration {
  display: inline-flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 2px;
}

.vp-post-preview-body {
  width: 100%;
  margin-top: 4px;
}
</style>
