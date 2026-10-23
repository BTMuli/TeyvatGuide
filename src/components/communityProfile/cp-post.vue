<template>
  <article
    :class="['cp-post', { 'cp-post--selectable': selectable, 'cp-post--selected': selected }]"
    @click.capture="handleCardClick"
  >
    <header class="cp-post-meta">
      <div class="cp-post-meta-top">
        <div class="cp-post-channels">
          <span
            v-if="selectable"
            :class="['cp-post-select-indicator', { 'is-selected': selected }]"
            aria-hidden="true"
          >
            <v-icon size="20">{{ selected ? "mdi-check-circle" : "mdi-circle-outline" }}</v-icon>
          </span>
          <CpTypeBadge v-if="typeLabel" :icon="typeIcon" :label="typeLabel" />
          <CpChannelTag
            v-if="game"
            :aria-label="`进入分区：${game.name}`"
            :icon="game.icon"
            kind="game"
            :name="game.name"
            :to="`/posts/forum/${post.post.game_id}`"
          />
          <CpChannelTag
            v-if="post.forum"
            :aria-label="`进入版块：${post.forum.name}`"
            :icon="forumIcon"
            kind="forum"
            :name="post.forum.name"
            :to="`/posts/forum/${post.post.game_id}/${post.forum.id}`"
          />
        </div>
        <time
          class="cp-post-time"
          :title="`发布于 ${fmtUtil.dateTime(post.post.created_at * 1000)}`"
        >
          <v-icon size="16" aria-hidden="true">mdi-clock-outline</v-icon>
          {{ timeText }}
        </time>
      </div>
      <button
        v-if="post.user"
        :title="`查看 ${post.user.nickname} 的米游社主页`"
        class="cp-post-author"
        type="button"
        @click="emit('openProfile', post.user.uid, post.post.game_id)"
      >
        <CpAvatar :user="post.user" :size="24" />
        <span class="cp-post-author-name">{{ post.user.nickname }}</span>
      </button>
    </header>
    <h3 class="cp-post-title">
      <button
        :aria-label="
          selectable
            ? `${selected ? '取消选择' : '选择'}帖子：${post.post.subject || '无标题帖子'}`
            : undefined
        "
        :aria-pressed="selectable ? selected : undefined"
        type="button"
        @click="openPost"
      >
        <TpTitle :text="post.post.subject || '无标题帖子'" />
      </button>
    </h3>
    <div v-if="images.length" class="cp-post-images">
      <span v-for="(image, index) in images" :key="`${index}:${image}`" class="cp-post-image">
        <TMiImg :src="image" :alt="`第 ${index + 1} 张帖子图片`" />
        <span v-if="index === images.length - 1 && remainingImages > 0" class="cp-post-image-more">
          <v-icon aria-hidden="true" size="10">mdi-folder-multiple-image</v-icon>
          +{{ fmtUtil.num(remainingImages) }}
        </span>
      </span>
    </div>
    <div v-if="post.topics.length" class="cp-post-topics">
      <RouterLink
        v-for="topic in post.topics"
        :key="topic.id"
        class="cp-post-topic"
        :to="`/posts/topic/${post.post.game_id}/${topic.id}`"
      >
        <TpcTag :tag="topic.name" />
      </RouterLink>
    </div>
    <footer v-if="post.stat || $slots.actions" class="cp-post-footer">
      <div v-if="post.stat" aria-label="帖子统计" class="cp-post-stats">
        <span :title="`浏览 ${fmtUtil.num(post.stat.view_num)}`">
          <v-icon size="16" aria-hidden="true">mdi-eye-outline</v-icon>
          {{ fmtUtil.num(post.stat.view_num) }}
        </span>
        <span :title="`回复 ${fmtUtil.num(post.stat.reply_num)}`">
          <v-icon size="16" aria-hidden="true">mdi-comment-outline</v-icon>
          {{ fmtUtil.num(post.stat.reply_num) }}
        </span>
        <span :title="`点赞 ${fmtUtil.num(post.stat.like_num)}`">
          <v-icon size="16" aria-hidden="true">mdi-thumb-up-outline</v-icon>
          {{ fmtUtil.num(post.stat.like_num) }}
        </span>
        <span
          v-if="post.stat.bookmark_num > 0"
          :title="`收藏 ${fmtUtil.num(post.stat.bookmark_num)}`"
        >
          <v-icon size="16" aria-hidden="true">mdi-star-outline</v-icon>
          {{ fmtUtil.num(post.stat.bookmark_num) }}
        </span>
        <span
          v-if="post.stat.forward_num > 0"
          :title="`转发 ${fmtUtil.num(post.stat.forward_num)}`"
        >
          <v-icon size="16" aria-hidden="true">mdi-share-variant-outline</v-icon>
          {{ fmtUtil.num(post.stat.forward_num) }}
        </span>
      </div>
      <div v-if="$slots.actions" class="cp-post-actions">
        <slot name="actions" />
      </div>
    </footer>
  </article>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpTitle from "@comp/viewPost/tp-title.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import useBBSStore from "@store/bbs.js";
import {
  getPostForumIcon,
  getPostImageCount,
  getPostPreviewImages,
  getPostTypeIcon,
  getPostTypeLabel,
} from "@utils/community/profile.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import CpAvatar from "./cp-avatar.vue";
import CpChannelTag from "./cp-channel-tag.vue";
import CpTypeBadge from "./cp-type-badge.vue";

type PostGame = { name: string; icon?: string };

const {
  post,
  viewedAt,
  selectable = false,
  selected = false,
} = defineProps<{
  post: TGApp.BBS.Post.FullData;
  viewedAt?: number;
  selectable?: boolean;
  selected?: boolean;
}>();
const emit = defineEmits<{
  openPost: [postId: string, title: string];
  openProfile: [uid: string, gid: number];
  toggleSelect: [];
}>();
const bbsStore = useBBSStore();
const { gameList, forumList } = storeToRefs(bbsStore);
const game = computed<PostGame | undefined>(() => {
  const find = gameList.value.find((item) => item.id === post.post.game_id);
  return find ? { name: find.name, icon: find.app_icon || find.icon } : undefined;
});
const forumIcon = computed<string | undefined>(() => getPostForumIcon(post, forumList.value));
const timeText = computed<string>(() =>
  viewedAt
    ? `浏览于 ${fmtUtil.dateTime(viewedAt * 1000)}`
    : fmtUtil.dateTime(post.post.created_at * 1000),
);
const typeLabel = computed<string | undefined>(() => getPostTypeLabel(post));
const typeIcon = computed<string | undefined>(() => getPostTypeIcon(post));
const images = computed<Array<string>>(() => getPostPreviewImages(post));
const remainingImages = computed<number>(() =>
  Math.max(getPostImageCount(post) - images.value.length, 0),
);

function openPost(): void {
  emit("openPost", post.post.post_id, post.post.subject);
}

function handleCardClick(event: MouseEvent): void {
  if (!selectable) return;
  event.preventDefault();
  event.stopPropagation();
  emit("toggleSelect");
}
</script>

<style lang="scss" scoped>
.cp-post {
  position: relative;
  z-index: 0;
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
  transition: background-color 120ms ease;

  &:hover {
    background: var(--box-bg-2);
  }

  &.cp-post--selectable {
    cursor: pointer;
    user-select: none;
  }

  &.cp-post--selected {
    border-color: var(--common-text-title);
    background: var(--box-bg-2);
  }
}

.cp-post-select-indicator {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-4);

  &.is-selected {
    color: var(--common-text-title);
  }
}

.cp-post-meta {
  display: flex;
  flex-direction: column;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.cp-post-meta-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.cp-post-channels {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cp-post-author {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
  gap: 4px;
  text-align: left;

  .cp-post-author-name {
    overflow: hidden;
    max-width: 200px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover .cp-post-author-name {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--common-text-title);
    outline-offset: 4px;
  }
}

.cp-post-time {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: auto;
  gap: 4px;
  white-space: nowrap;
}

.cp-post-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 28px;
  overflow-wrap: anywhere;

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    text-align: left;

    &::after {
      position: absolute;
      z-index: 1;
      content: "";
      inset: 0;
    }

    &:focus-visible {
      outline: none;

      &::after {
        border-radius: 8px;
        outline: 2px solid var(--common-text-title);
        outline-offset: 2px;
      }
    }
  }
}

.cp-post-images {
  display: flex;
  width: fit-content;
  max-width: 100%;
  gap: 8px;
}

.cp-post-image {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 160px;
  max-width: 100%;
  flex: 0 1 160px;
  border-radius: 4px;
  aspect-ratio: 1;
  background: var(--box-bg-2);
  place-items: center;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-post:hover .cp-post-image {
  background: var(--box-bg-1);
}

.cp-post-image-more {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 4px;
  padding-left: 8px;
  background: var(--tgc-od-blue);
  border-top-left-radius: 12px;
  box-shadow: -1px -1px 6px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  column-gap: 2px;
  font-size: 12px;
  line-height: 18px;
}

.cp-post-topics {
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 4px;
}

.cp-post-topic {
  position: relative;
  z-index: 2;
  display: inline-flex;
  border-radius: 12px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.cp-post-footer {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.cp-post-stats {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 16px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.cp-post-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: auto;
  gap: 8px;
}
</style>
