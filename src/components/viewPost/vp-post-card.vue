<!-- 帖子瀑布流卡片 -->
<template>
  <article ref="cardEl" class="post-card">
    <div class="post-card-media">
      <button
        :aria-label="'打开帖子：' + title"
        :style="coverStyle"
        class="post-card-cover"
        type="button"
        @click="openPost"
      >
        <img
          ref="coverImg"
          v-if="showCoverImage"
          :src="coverUrl"
          alt=""
          class="post-card-cover-image"
          decoding="async"
          loading="lazy"
          @error="handleCoverError"
          @load="handleCoverLoad"
        />
        <img
          ref="coverImg"
          v-else
          alt=""
          class="post-card-cover-image"
          decoding="async"
          loading="lazy"
          :src="defaultCoverUrl"
        />
      </button>
      <span v-if="coverTruncated" class="post-card-long-image">
        <span aria-hidden="true" class="post-card-long-image-fade" />
        <span class="post-card-long-image-label">长图</span>
      </span>
      <span class="post-card-id" title="帖子 ID">{{ post.post.post_id }}</span>
      <button
        v-if="forum"
        :title="'频道：' + forum.name"
        class="post-card-forum"
        type="button"
        @click="openForum"
      >
        <img v-if="forum.icon" alt="" :src="forum.icon" />
        <span>{{ forum.name }}</span>
      </button>
      <button
        v-if="coverSource"
        aria-label="预览封面"
        class="post-card-preview"
        data-html2canvas-ignore
        title="预览封面"
        type="button"
        @click="previewCover"
      >
        <v-icon
          aria-hidden="true"
          color="var(--box-bg-1)"
          icon="mdi-magnify-plus-outline"
          size="16"
        />
      </button>
      <span v-if="sharing && shareDate" aria-hidden="true" class="post-card-share-stamp">
        <v-icon aria-hidden="true" icon="mdi-clock-outline" size="14" />
        <span>分享于 {{ shareDate }}</span>
      </span>
      <span v-if="imageCount > 1" :title="'图片数：' + imageCount" class="post-card-image-count">
        <v-icon aria-hidden="true" icon="mdi-folder-multiple-image" size="12" />
        <span>{{ imageCount }}</span>
      </span>
    </div>
    <div class="post-card-body">
      <h2>
        <button
          :aria-label="'生成分享图：' + title"
          :class="{ 'post-card-title-empty': isUntitled }"
          :disabled="sharing"
          :title
          class="post-card-title"
          type="button"
          @click="shareCard"
        >
          {{ title }}
        </button>
      </h2>
      <TpAvatar
        v-if="post.user"
        :data="post.user"
        class="post-card-author"
        position="left"
        @click="openAuthor"
      />
      <div v-if="tags.length" class="post-card-tags">
        <template v-for="tag in tags" :key="tag.key">
          <TpcTag
            v-if="tag.kind === 'topic'"
            :interactive="true"
            :tag="tag.text"
            @click="openTopic(tag)"
          />
          <span v-else class="post-card-reason" title="推荐理由">
            <v-icon aria-hidden="true" icon="mdi-lightbulb-on" size="10" />
            <span>{{ tag.text }}</span>
          </span>
        </template>
      </div>
      <div v-if="metrics.length || dates.length" class="post-card-footer">
        <ul v-if="metrics.length" aria-label="帖子数据" class="post-card-metrics" role="list">
          <li
            v-for="metric in metrics"
            :key="metric.label"
            :title="metric.label + ' ' + metric.value"
          >
            <v-icon :icon="metric.icon" aria-hidden="true" size="14" />
            <span :aria-label="metric.label + ' ' + metric.value">{{
              fmtUtil.num(metric.value)
            }}</span>
          </li>
        </ul>
        <div v-if="dates.length" class="post-card-times">
          <span v-for="date in dates" :key="date.label" :title="date.label + ' ' + date.full">
            <v-icon :icon="date.icon" aria-hidden="true" size="14" />
            <span :aria-label="date.label + ' ' + date.full">{{ date.short }}</span>
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import { emit } from "@tauri-apps/api/event";
import { createPost } from "@utils/app/TGWindow.js";
import {
  POST_COVER_MAX_HEIGHT,
  getPostCover,
  getPostCoverRatio,
  getPostCoverUrl,
} from "@utils/bbs/postCover.js";
import { getPostImageOriginalUrl } from "@utils/bbs/postImage.js";
import { str2Color } from "@utils/display/colorFunc.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGShare from "@utils/share/TGShare.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";

type VpPostCardProps = {
  coverWidth: number;
  post: TGApp.BBS.Post.FullData;
};

type VpPostCardEmits = {
  userClick: [user: TGApp.BBS.Post.User, gid: number];
  imageClick: [cover: TGApp.BBS.Post.CoverImage];
};

type PostCardForum = { gid: number; id: number; name: string; icon: string };
type PostCardTag = { key: string; kind: "reason" | "topic"; text: string; topicId?: number };

const defaultCoverUrl = "/UI/post/defaultCover.webp";
const { coverWidth, post } = defineProps<VpPostCardProps>();
const emits = defineEmits<VpPostCardEmits>();
const appStore = useAppStore();
const { forumList } = storeToRefs(useBBSStore());
const cardEl = useTemplateRef<HTMLElement>("cardEl");
const coverImg = useTemplateRef<HTMLImageElement>("coverImg");
const coverUsesOriginal = ref<boolean>(false);
const imageFailed = ref<boolean>(false);
const sharing = ref<boolean>(false);
const naturalRatio = ref<number>(0);
const shareDate = ref<string>("");
const isUntitled = computed<boolean>(() => post.post.subject.trim() === "");
const title = computed<string>(() => (isUntitled.value ? "无标题帖子" : post.post.subject));
const canOpenAuthor = computed<boolean>(() => /^[1-9]\d*$/.test(post.user?.uid ?? ""));
const cover = computed(() => getPostCover(post));
const coverSource = computed<string>(() => cover.value?.url ?? "");

const coverRatio = computed<number>(() => {
  if (!coverSource.value || imageFailed.value) return 69 / 32;
  return naturalRatio.value > 0 ? naturalRatio.value : getPostCoverRatio(post);
});
const coverUrl = computed<string>(() =>
  getPostCoverUrl(
    coverSource.value,
    coverWidth,
    appStore.imageQualityPercent,
    coverUsesOriginal.value,
  ),
);
const showCoverImage = computed<boolean>(() => coverUrl.value !== "" && !imageFailed.value);
const coverHeight = computed<number>(() => {
  if (coverRatio.value <= 0) return 0;
  return coverWidth / coverRatio.value;
});
const coverTruncated = computed<boolean>(
  () => showCoverImage.value && coverHeight.value > POST_COVER_MAX_HEIGHT,
);
const coverStyle = computed<{ aspectRatio: number; maxHeight: string | undefined }>(() => ({
  aspectRatio: coverRatio.value,
  maxHeight: showCoverImage.value ? `${POST_COVER_MAX_HEIGHT}px` : undefined,
}));
const imageCount = computed<number>(() => post.post.images.length || post.image_list.length);
const idBg = computed<string>(() => frostColor(post.post.post_id, 0));
const forum = computed<PostCardForum | undefined>(() => {
  const current = post.forum;
  if (!current || current.name === "") return undefined;
  const game = forumList.value.find((item) => item.game_id === post.post.game_id);
  const pureIcon = game?.forums.find((item) => item.id === current.id)?.icon_pure;
  return {
    gid: post.post.game_id,
    id: current.id,
    name: current.name,
    icon: pureIcon || current.icon,
  };
});
const forumBg = computed<string>(() => {
  const current = forum.value;
  if (!current) return "transparent";
  return frostColor(`${current.id}${current.icon}${current.name}`, -60);
});
const tags = computed<Array<PostCardTag>>(() => {
  const reasons: Array<PostCardTag> = (post.recommend_reason?.tags ?? [])
    .filter((reason) => reason.text.trim() !== "")
    .map((reason, index) => ({
      key: `reason-${index}`,
      kind: "reason",
      text: reason.text,
    }));
  const topics: Array<PostCardTag> = post.topics
    .filter((topic) => topic.name.trim() !== "")
    .map((topic) => ({
      key: `topic-${topic.id}`,
      kind: "topic",
      text: topic.name,
      topicId: topic.id,
    }));
  return [...reasons, ...topics];
});
const metrics = computed<Array<{ label: string; icon: string; value: number }>>(() => {
  const stat = post.stat;
  if (!stat) return [];
  return [
    { label: "浏览", icon: "mdi-eye-outline", value: stat.view_num },
    { label: "收藏", icon: "mdi-star-outline", value: stat.bookmark_num },
    { label: "回复", icon: "mdi-comment-outline", value: stat.reply_num },
    { label: "点赞", icon: "mdi-thumb-up-outline", value: stat.like_num },
    { label: "转发", icon: "mdi-share-variant-outline", value: stat.forward_num },
  ];
});
const dates = computed<Array<{ label: string; icon: string; full: string; short: string }>>(() => {
  const { created_at, updated_at } = post.post;
  const entries = [
    { label: "发布于", icon: "mdi-calendar-clock", timestamp: created_at },
    {
      label: "更新于",
      icon: "mdi-calendar-edit",
      timestamp: updated_at > created_at ? updated_at : 0,
    },
  ];
  return entries
    .filter(({ timestamp }) => timestamp > 0)
    .map(({ label, icon, timestamp }) => {
      const full = fmtUtil.dateTime(timestamp * 1000);
      return { label, icon, full, short: full.slice(5, 16) };
    });
});
watch(coverSource, () => {
  naturalRatio.value = 0;
});
watch(coverUrl, () => {
  imageFailed.value = false;
});

function frostColor(value: string, adjustment: number): string {
  return str2Color(value, adjustment).replace(/^rgb\((.+)\)$/, "rgba($1, 0.62)");
}

async function openPost(): Promise<void> {
  await createPost({ postId: post.post.post_id, title: title.value });
}

function handleCoverLoad(event: Event): void {
  const image = event.currentTarget;
  if (!(image instanceof HTMLImageElement)) return;
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
  naturalRatio.value = image.naturalWidth / image.naturalHeight;
}

function handleCoverError(): void {
  if (coverUsesOriginal.value) {
    coverUsesOriginal.value = false;
    return;
  }
  imageFailed.value = true;
}

function previewCover(): void {
  if (!coverSource.value) return;
  coverUsesOriginal.value = true;
  emits("imageClick", {
    url: getPostImageOriginalUrl(coverSource.value)?.href ?? coverSource.value,
    width: cover.value?.width ?? 0,
    height: cover.value?.height ?? 0,
  });
}

function openAuthor(): void {
  if (post.user && canOpenAuthor.value) emits("userClick", post.user, post.post.game_id);
}

async function openForum(): Promise<void> {
  const current = forum.value;
  if (!current) return;
  await emit("active_deep_link", `router?path=/posts/forum/${current.gid}/${current.id}`);
}

async function openTopic(tag: PostCardTag): Promise<void> {
  if (tag.kind !== "topic" || tag.topicId === undefined) return;
  await emit("active_deep_link", `router?path=/posts/topic/${post.post.game_id}/${tag.topicId}`);
}

/**
 * 等待封面切换到原图并完成加载，避免分享图仍截到缩略图或空白。
 * @since Beta v0.14.1
 * @returns 无返回值
 */
function waitCoverImage(): Promise<void> {
  const image = coverImg.value;
  if (!image || image.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let timeout = 0;
    const finish = (): void => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      window.clearTimeout(timeout);
      resolve();
    };
    timeout = window.setTimeout(finish, 8000);
    image.addEventListener("load", finish);
    image.addEventListener("error", finish);
  });
}

async function shareCard(): Promise<void> {
  const card = cardEl.value;
  if (!card || sharing.value) return;
  shareDate.value = fmtUtil.dateTime(Date.now());
  coverUsesOriginal.value = true;
  sharing.value = true;
  try {
    await nextTick();
    await waitCoverImage();
    await nextTick();
    await TGShare.modern("PostCard_" + post.post.post_id, card, 2.5, false, {
      backdropBlurScale: 0.7,
      onCloneNode: (cloned) => {
        if (!(cloned instanceof HTMLElement)) return;
        const stamp = cloned.querySelector<HTMLElement>(".post-card-share-stamp");
        if (stamp !== null) stamp.style.opacity = "1";
      },
    });
  } finally {
    sharing.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.post-card {
  @include github-styles.github-card;

  overflow: hidden;
  border-radius: 8px;
}

.dark .post-card {
  @include github-styles.github-card("dark");
}

.post-card-media {
  position: relative;
}

.post-card-cover {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 100%;
  max-height: 480px;
  padding: 0;
  border: 0;
  appearance: none;
  background: var(--app-side-bg);
  color: var(--box-text-4);
  cursor: pointer;
  place-items: center;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: -3px;
  }
}

.post-card-cover-image {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 260ms ease-out;

  .post-card-cover:hover & {
    transform: scale(1.08);
  }
}

.post-card-long-image {
  position: absolute;
  bottom: 0;
  left: 50%;
  display: flex;
  width: 64%;
  justify-content: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.post-card-long-image-fade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(to top, #0000008c, transparent);
}

.post-card-long-image-label {
  position: relative;
  z-index: 1;
  padding: 0 6px;
  border-radius: 4px;
  background: #000000a6;
  color: var(--tgc-white-1);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.post-card-id,
.post-card-forum {
  position: absolute;
  top: 0;
  display: flex;
  align-items: center;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 6px var(--tgc-dark-2);
  color: var(--tgc-white-1);
  text-shadow: 0 0 4px var(--tgc-dark-1);
  white-space: nowrap;
}

.post-card-id {
  left: 0;
  padding: 0 4px;
  background: v-bind(idBg); /* stylelint-disable-line value-keyword-case */
  border-bottom-right-radius: 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  pointer-events: none;
}

.post-card-forum {
  right: 0;
  overflow: hidden;
  max-width: calc(100% - 72px);
  padding: 4px;
  border: 0;
  appearance: none;
  background: v-bind(forumBg); /* stylelint-disable-line value-keyword-case */
  border-bottom-left-radius: 4px;
  cursor: pointer;
  font: inherit;
  gap: 4px;

  img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-white-1);
    outline-offset: -2px;
  }
}

.post-card-preview {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--common-shadow-t-2);
  border-radius: 50%;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--box-bg-t-1) 76%, transparent);
  color: var(--box-bg-1);
  cursor: pointer;
  place-items: center;

  &:hover {
    background: color-mix(in srgb, var(--box-bg-t-1) 88%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--box-bg-1);
    outline-offset: 2px;
  }
}

.post-card-share-stamp {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  border-radius: 4px;
  background: #000000a6;
  box-shadow: 0 1px 4px #0000003d;
  color: var(--tgc-white-1);
  column-gap: 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;

  > .v-icon {
    flex-shrink: 0;
  }
}

.post-card-image-count {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding-right: 4px;
  padding-left: 8px;
  background: var(--tgc-od-blue);
  border-top-left-radius: 12px;
  box-shadow: -1px -1px 6px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  column-gap: 2px;
  font-size: 12px;
  line-height: 18px;
  pointer-events: none;
  white-space: nowrap;
}

.post-card-body {
  display: grid;
  padding: 12px;
  gap: 8px;

  h2 {
    margin: 0;
  }
}

.post-card-title {
  display: -webkit-box;
  overflow: hidden;
  width: 100%;
  padding: 0;
  border: 0;
  appearance: none;
  background: transparent;
  -webkit-box-orient: vertical;
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  -webkit-line-clamp: 2;
  line-height: 24px;
  overflow-wrap: anywhere;
  text-align: left;

  &:focus-visible {
    text-decoration: underline;
  }
}

.post-card-title-empty {
  color: var(--box-text-4);
  opacity: 0.72;
}

.post-card-author {
  cursor: pointer;
}

.post-card-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  gap: 4px;
  line-height: 18px;
  white-space: nowrap;

  :deep(.tag-label) {
    overflow: hidden;
    max-width: 100%;
    flex-shrink: 0;
    text-overflow: ellipsis;
  }
}

.post-card-reason {
  @include github-styles.github-tag-dark-gen(#d19a66);

  display: inline-flex;
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 1;
  align-items: center;
  padding: 0 6px;
  border-radius: 12px;
  gap: 2px;
  user-select: none;

  > .v-icon {
    flex-shrink: 0;
  }

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.post-card-footer {
  display: grid;
  gap: 4px;
}

.post-card-metrics,
.post-card-times {
  display: flex;
  justify-content: flex-end;
  padding: 0;
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 2px;
  line-height: 16px;
  list-style: none;

  > li,
  > span {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }
}

.post-card-metrics {
  flex-wrap: wrap;
}

.post-card-times {
  overflow: hidden;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  > span {
    overflow: hidden;
    min-width: 0;

    > span {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-card-cover-image {
    transition: none;
  }
}
</style>
