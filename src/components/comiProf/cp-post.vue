<template>
  <article
    ref="cardEl"
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
            data-html2canvas-ignore
          >
            <v-icon size="20">{{ selected ? "mdi-check-circle" : "mdi-circle-outline" }}</v-icon>
          </span>
          <CpTypeBadge v-if="typeLabel" :icon="typeIcon" :label="typeLabel" />
          <button
            :aria-label="`分享帖子 ${post.post.post_id} 的卡片`"
            :disabled="sharing"
            class="cp-post-share"
            data-post-card-action
            title="分享帖子卡片"
            type="button"
            @click.stop="shareCard"
          >
            <CpTypeBadge class="cp-post-id" :label="`PID:${post.post.post_id}`" />
          </button>
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
        v-if="showAuthor && post.user"
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
      <div
        ref="imageViewport"
        class="cp-post-image-viewport"
        @click="openPost"
        @scroll.passive="updateImageScroll"
      >
        <div ref="imageTrack" class="cp-post-image-track">
          <CpImageThumbnail
            v-for="(image, index) in images"
            :key="`${index}:${image.source}`"
            :alt="`第 ${index + 1} 张帖子图片`"
            :attributes="image.attributes"
            :source="image.source"
            class="cp-post-image"
          >
            <span
              v-if="index === images.length - 1 && remainingImages > 0"
              class="cp-post-image-more"
            >
              <v-icon aria-hidden="true" size="10">mdi-folder-multiple-image</v-icon>
              +{{ fmtUtil.num(remainingImages) }}
            </span>
          </CpImageThumbnail>
        </div>
      </div>
      <template v-if="canScrollImagesLeft || canScrollImagesRight">
        <button
          :disabled="!canScrollImagesLeft"
          aria-label="向左移动帖子图片"
          class="cp-post-image-arrow cp-post-image-arrow--left"
          data-html2canvas-ignore
          data-post-card-action
          title="向左移动"
          type="button"
          @click.stop="scrollImages(-1)"
        >
          <v-icon aria-hidden="true" icon="mdi-chevron-left" size="20" />
        </button>
        <button
          :disabled="!canScrollImagesRight"
          aria-label="向右移动帖子图片"
          class="cp-post-image-arrow cp-post-image-arrow--right"
          data-html2canvas-ignore
          data-post-card-action
          title="向右移动"
          type="button"
          @click.stop="scrollImages(1)"
        >
          <v-icon aria-hidden="true" icon="mdi-chevron-right" size="20" />
        </button>
      </template>
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
      <div v-if="$slots.actions" class="cp-post-actions" data-html2canvas-ignore>
        <slot name="actions" />
      </div>
    </footer>
  </article>
</template>

<script lang="ts" setup>
import type { TpImage } from "@comp/viewPost/tp-image.vue";
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
import { str2Color } from "@utils/display/colorFunc.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGShare from "@utils/share/TGShare.js";
import { storeToRefs } from "pinia";
import { computed, onWatcherCleanup, ref, useTemplateRef, watch } from "vue";

import CpAvatar from "./cp-avatar.vue";
import CpChannelTag from "./cp-channel-tag.vue";
import CpImageThumbnail from "./cp-image-thumbnail.vue";
import CpTypeBadge from "./cp-type-badge.vue";

type PostGame = { name: string; icon?: string };
type CpPostThumbnail = { source: string; attributes?: TpImage["attributes"] };

const {
  post,
  game: gameOverride,
  showAuthor = true,
  viewedAt,
  selectable = false,
  selected = false,
} = defineProps<{
  post: TGApp.BBS.Post.FullData;
  game?: PostGame;
  showAuthor?: boolean;
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
const cardEl = useTemplateRef<HTMLElement>("cardEl");
const sharing = ref<boolean>(false);
const imageViewport = useTemplateRef<HTMLDivElement>("imageViewport");
const imageTrack = useTemplateRef<HTMLDivElement>("imageTrack");
const canScrollImagesLeft = ref<boolean>(false);
const canScrollImagesRight = ref<boolean>(false);
const game = computed<PostGame | undefined>(() => {
  if (gameOverride) return gameOverride;
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
const idBg = computed<string>(() =>
  str2Color(post.post.post_id, 0).replace(/^rgb\((.+)\)$/, "rgba($1, 0.45)"),
);
const images = computed<Array<CpPostThumbnail>>(() =>
  getPostPreviewImages(post).map((source) => {
    const metadata =
      post.image_list?.find(({ url }) => url === source) ??
      (post.cover?.url === source ? post.cover : undefined);
    const attributes =
      metadata && metadata.width > 0 && metadata.height > 0
        ? { width: metadata.width, height: metadata.height, size: Number(metadata.size) }
        : undefined;
    return { source, attributes };
  }),
);
const remainingImages = computed<number>(() =>
  Math.max(getPostImageCount(post) - images.value.length, 0),
);

watch(
  [imageViewport, imageTrack],
  ([viewport, track]) => {
    updateImageScroll();
    if (!viewport || !track) return;
    const observer = new ResizeObserver(updateImageScroll);
    observer.observe(viewport);
    observer.observe(track);
    onWatcherCleanup(() => observer.disconnect());
  },
  { flush: "post" },
);

function openPost(): void {
  emit("openPost", post.post.post_id, post.post.subject);
}

async function shareCard(): Promise<void> {
  const card = cardEl.value;
  if (!card || sharing.value) return;
  const imageOffset = imageViewport.value?.scrollLeft ?? 0;
  sharing.value = true;
  try {
    await TGShare.modern(`PostCard_${post.post.post_id}`, card, 2.5, false, {
      backdropBlurScale: 0.7,
      onCloneNode: (cloned) => {
        if (!(cloned instanceof HTMLElement)) return;
        const title = cloned.querySelector<HTMLButtonElement>(".cp-post-title > button");
        if (title) {
          title.style.width = "100%";
          title.style.boxSizing = "border-box";
        }
        const track = cloned.querySelector<HTMLElement>(".cp-post-image-track");
        if (track && imageOffset > 0) track.style.transform = `translateX(${-imageOffset}px)`;
      },
    });
  } finally {
    sharing.value = false;
  }
}

function updateImageScroll(): void {
  const viewport = imageViewport.value;
  const scrollLeft = viewport?.scrollLeft ?? 0;
  const maxScroll = viewport ? viewport.scrollWidth - viewport.clientWidth : 0;
  canScrollImagesLeft.value = scrollLeft > 1;
  canScrollImagesRight.value = scrollLeft < maxScroll - 1;
}

function scrollImages(direction: -1 | 1): void {
  const viewport = imageViewport.value;
  if (viewport) viewport.scrollBy({ left: direction * viewport.clientWidth });
}

function handleCardClick(event: MouseEvent): void {
  if (!selectable) return;
  const target = event.target;
  if (target instanceof Element && target.closest("[data-post-card-action]")) return;
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

.cp-post-share {
  position: relative;
  z-index: 2;
  display: inline-flex;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: progress;
  }
}

.cp-post-id {
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  background: v-bind(idBg); /* stylelint-disable-line value-keyword-case */
  text-shadow: 0 0 4px var(--tgc-dark-1);
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
  position: relative;
  z-index: 2;
  min-width: 0;
}

.cp-post-image-viewport {
  cursor: pointer;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
}

.cp-post-image-track {
  display: flex;
  width: max-content;
  gap: 8px;
}

.cp-post:hover .cp-post-image {
  background: var(--box-bg-1);
}

.cp-post-image-arrow {
  position: absolute;
  z-index: 1;
  top: 50%;
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--common-shadow-t-2);
  border-radius: 50%;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--box-bg-t-1) 76%, transparent);
  box-shadow: 0 2px 8px var(--tgc-dark-2);
  color: var(--box-bg-1);
  cursor: pointer;
  place-items: center;
  transform: translateY(-50%);

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }

  &:focus-visible {
    outline: 2px solid var(--box-bg-1);
    outline-offset: 2px;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--box-bg-t-1) 88%, transparent);
  }
}

.cp-post-image-arrow--left {
  left: 8px;
}

.cp-post-image-arrow--right {
  right: 8px;
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
  white-space: nowrap;
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
    white-space: nowrap;
  }
}

.cp-post-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: auto;
  gap: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .cp-post-image-viewport {
    scroll-behavior: auto;
  }
}

@media (width <= 640px) {
  .cp-post {
    padding: 12px;
  }

  .cp-post-footer,
  .cp-post-stats {
    gap: 8px;
  }
}
</style>
