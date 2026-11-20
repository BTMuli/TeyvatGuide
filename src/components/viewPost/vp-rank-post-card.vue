<!-- 榜单瀑布流帖子卡片 -->
<template>
  <article ref="cardEl" class="rank-post-card">
    <div class="rank-post-media">
      <button
        :aria-label="'打开帖子：' + title"
        :style="{ aspectRatio: coverRatio }"
        class="rank-post-cover"
        type="button"
        @click="openPost"
      >
        <img
          v-if="coverUrl && !imageFailed"
          :src="coverUrl"
          alt=""
          class="rank-post-cover-image"
          decoding="async"
          loading="lazy"
          @error="imageFailed = true"
        />
        <v-icon v-else aria-hidden="true" icon="mdi-image-outline" size="36" />
      </button>
      <span
        :aria-label="'第 ' + rank + ' 名'"
        :style="{ background: rankBg }"
        class="rank-post-position"
      >
        <v-icon aria-hidden="true" :icon="rank <= 3 ? 'mdi-trophy' : 'mdi-pound'" size="16" />
        <span>{{ rank }}</span>
      </span>
      <span :style="{ background: idBg }" class="rank-post-id" title="帖子 ID">
        {{ post.post.post_id }}
      </span>
      <button
        v-if="coverSource"
        aria-label="预览封面"
        class="rank-post-preview"
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
      <span v-if="imageCount > 1" :title="'图片数：' + imageCount" class="rank-post-image-count">
        <v-icon aria-hidden="true" icon="mdi-folder-multiple-image" size="12" />
        <span>{{ imageCount }}</span>
      </span>
    </div>
    <div class="rank-post-body">
      <h2>
        <button
          :aria-label="'生成分享图：' + title"
          :disabled="sharing"
          :title
          class="rank-post-title"
          type="button"
          @click="shareCard"
        >
          {{ title }}
        </button>
      </h2>
      <TpAvatar
        v-if="post.user"
        :aria-label="canOpenAuthor ? '查看用户：' + post.user.nickname : undefined"
        :data="post.user"
        :role="canOpenAuthor ? 'button' : undefined"
        :tabindex="canOpenAuthor ? 0 : undefined"
        class="rank-post-author"
        position="left"
        @click="openAuthor"
        @keydown.enter.prevent="openAuthor"
        @keydown.space.prevent="openAuthor"
      />
      <div v-if="metrics.length || dates.length" class="rank-post-footer">
        <ul v-if="metrics.length" aria-label="帖子数据" class="rank-post-metrics" role="list">
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
        <div v-if="dates.length" class="rank-post-times">
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
import useAppStore from "@store/app.js";
import { createPost } from "@utils/app/TGWindow.js";
import { getRankCover, getRankCoverRatio } from "@utils/bbs/forumRank.js";
import { getPostImageThumbnailUrl } from "@utils/bbs/postImage.js";
import { str2Color } from "@utils/display/colorFunc.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGShare from "@utils/share/TGShare.js";
import { computed, ref, useTemplateRef, watch } from "vue";

type VpRankPostCardProps = {
  coverWidth: number;
  post: TGApp.BBS.Forum.ImageRankPost;
  rank: number;
};

type VpRankPostCardEmits = {
  userClick: [uid: string];
  imageClick: [cover: TGApp.BBS.Forum.ImageRankCover];
};

const { coverWidth, post, rank } = defineProps<VpRankPostCardProps>();
const emits = defineEmits<VpRankPostCardEmits>();
const appStore = useAppStore();
const cardEl = useTemplateRef<HTMLElement>("cardEl");
const imageFailed = ref<boolean>(false);
const sharing = ref<boolean>(false);
const title = computed<string>(() => post.post.subject || "无标题帖子");
const canOpenAuthor = computed<boolean>(() => /^[1-9]\d*$/.test(post.user?.uid ?? ""));
const idBg = computed<string>(() => frostColor(post.post.post_id, 0));
const rankBg = computed<string>(() =>
  frostColor(rank <= 3 ? "rank-" + rank : "rank", rank <= 3 ? -44 : -60),
);
const cover = computed<TGApp.BBS.Forum.ImageRankCover | undefined>(() => getRankCover(post));
const coverSource = computed<string>(
  () => cover.value?.url || post.post.cover || post.post.images[0] || "",
);
const coverUrl = computed<string>(() =>
  getPostImageThumbnailUrl(coverSource.value, coverWidth, appStore.imageQualityPercent),
);
const imageCount = computed<number>(() => post.post.images.length || post.image_list.length);
const coverRatio = computed<number>(() => getRankCoverRatio(post));
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
watch(coverUrl, () => {
  imageFailed.value = false;
});

function frostColor(value: string, adjustment: number): string {
  return str2Color(value, adjustment).replace(/^rgb\((.+)\)$/, "rgba($1, 0.62)");
}

async function openPost(): Promise<void> {
  await createPost({ postId: post.post.post_id, title: title.value });
}

function previewCover(): void {
  if (!coverSource.value) return;
  emits("imageClick", {
    url: coverSource.value,
    width: cover.value?.width ?? 0,
    height: cover.value?.height ?? 0,
  });
}

function openAuthor(): void {
  if (post.user && canOpenAuthor.value) emits("userClick", post.user.uid);
}

async function shareCard(): Promise<void> {
  const card = cardEl.value;
  if (!card || sharing.value) return;
  sharing.value = true;
  try {
    await TGShare.modern("PostCard_" + post.post.post_id, card, 2.5, false, {
      backdropBlurScale: 0.7,
      onCloneNode: (cloned) => {
        if (!(cloned instanceof HTMLElement)) return;
        if (cloned.classList.contains("rank-post-cover-image")) cloned.style.transform = "none";
      },
    });
  } finally {
    sharing.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.rank-post-card {
  @include github-styles.github-card;

  overflow: hidden;
  border-radius: 8px;
}

.dark .rank-post-card {
  @include github-styles.github-card("dark");
}

.rank-post-media {
  position: relative;
}

.rank-post-cover {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 100%;
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

.rank-post-cover-image {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 260ms ease-out;

  .rank-post-cover:hover & {
    transform: scale(1.08);
  }
}

.rank-post-position,
.rank-post-id {
  position: absolute;
  top: 0;
  display: flex;
  align-items: center;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 6px var(--tgc-dark-2);
  color: var(--tgc-white-1);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  text-shadow: 0 0 4px var(--tgc-dark-1);
  white-space: nowrap;
}

.rank-post-preview {
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

.rank-post-image-count {
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

.rank-post-position {
  left: 0;
  padding: 3px 6px;
  border-bottom-right-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  gap: 4px;
  line-height: 20px;
}

.rank-post-id {
  right: 0;
  padding: 0 4px;
  border-bottom-left-radius: 4px;
  font-size: 12px;
  line-height: 20px;
}

.rank-post-body {
  display: grid;
  padding: 12px;
  gap: 8px;

  h2 {
    margin: 0;
  }
}

.rank-post-title {
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

  &:hover,
  &:focus-visible {
    text-decoration: underline;
  }
}

.rank-post-author {
  cursor: default;

  &[role="button"] {
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--common-text-title);
      outline-offset: 2px;
    }
  }
}

.rank-post-footer {
  display: grid;
  gap: 4px;
}

.rank-post-metrics,
.rank-post-times {
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

.rank-post-metrics {
  flex-wrap: wrap;
}

.rank-post-times {
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
  .rank-post-cover-image {
    transition: none;
  }
}
</style>
