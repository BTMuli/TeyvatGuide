<template>
  <article
    :aria-label="postId ? `打开原帖：${postTitle}` : undefined"
    :class="{ 'is-clickable': postId }"
    class="cp-comment"
    :role="postId ? 'button' : undefined"
    :tabindex="postId ? 0 : undefined"
    :title="postId ? `打开原帖：${postTitle}` : undefined"
    @click="handleCardClick"
    @keydown.enter.space="handleCardKeydown"
  >
    <div aria-label="评论内容" class="cp-comment-content">
      <TpParser v-if="contentNodes.length" :data="contentNodes" />
      <span v-else class="cp-comment-empty">[无文字内容]</span>
    </div>

    <footer aria-label="评论信息" class="cp-comment-footer">
      <span class="cp-comment-meta">
        <time v-if="createdAtLabel" :datetime="createdAtIso">{{ createdAtLabel }}</time>
        <span title="点赞数">
          <v-icon size="14" aria-hidden="true">mdi-thumb-up-outline</v-icon>
          {{ likeCount }}
        </span>
      </span>
      <span :title="`原帖：${postTitle}`" class="cp-comment-source">
        <v-icon size="14" aria-hidden="true">mdi-post-outline</v-icon>
        <span class="cp-comment-source-title">
          <TpTitle :singleLine="true" :text="postTitle" />
        </span>
      </span>
    </footer>
  </article>
</template>

<script lang="ts" setup>
import TpParser from "@comp/viewPost/tp-parser.vue";
import TpTitle from "@comp/viewPost/tp-title.vue";
import { getCommunityCommentContent } from "@utils/communityComment.js";
import fmtUtil from "@utils/fmtUtil.js";
import { computed } from "vue";

type CpCommentProps = { comment: TGApp.BBS.Community.Comment };

const props = defineProps<CpCommentProps>();
const emit = defineEmits<{ openPost: [postId: string, title: string] }>();
const contentNodes = computed<Array<TGApp.BBS.SctPost.Base>>(() =>
  getCommunityCommentContent(props.comment),
);
const postId = computed<string>(() => {
  const postId = props.comment.r_post?.post_id || props.comment.reply.post_id;
  return typeof postId === "string" ? postId.trim() : "";
});
const postTitle = computed<string>(() => {
  const subject = props.comment.r_post?.subject;
  return typeof subject === "string" && subject.trim() !== "" ? subject : "查看原帖";
});
const createdAtLabel = computed<string>(() => {
  const createdAt = Number(props.comment.reply.created_at);
  return Number.isFinite(createdAt) && createdAt > 0 ? fmtUtil.dateTime(createdAt * 1000) : "";
});
const createdAtIso = computed<string>(() => {
  const createdAt = Number(props.comment.reply.created_at);
  return Number.isFinite(createdAt) && createdAt > 0
    ? new Date(createdAt * 1000).toISOString()
    : "";
});
const likeCount = computed<number>(() => props.comment.stat?.like_num ?? 0);

function handleCardClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  if (
    event.target.closest(
      ".cp-comment-content a, .cp-comment-content button, .cp-comment-content summary, .cp-comment-content [role='button'], .cp-comment-content [role='link'], .cp-comment-content .tp-text-link, .cp-comment-content .tp-mention-box, .cp-comment-content .tp-image-box, .cp-comment-content .tp-emo-box, .cp-comment-content .tp-lc-box, .cp-comment-content .tp-backup-lottery",
    ) !== null
  )
    return;
  handleOpenPost();
}

function handleCardKeydown(event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) return;
  event.preventDefault();
  handleOpenPost();
}

function handleOpenPost(): void {
  if (!postId.value) return;
  emit("openPost", postId.value, postTitle.value);
}
</script>

<style lang="scss" scoped>
.cp-comment {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--common-shadow-2);
      background: var(--box-bg-4);
    }

    &:focus-visible {
      outline: 2px solid var(--common-text-title);
      outline-offset: 2px;
    }
  }
}

.cp-comment-footer,
.cp-comment-source,
.cp-comment-meta,
.cp-comment-meta span {
  display: flex;
  align-items: center;
}

.cp-comment-footer {
  min-width: 0;
  justify-content: space-between;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 12px;
}

.cp-comment-source {
  overflow: hidden;
  min-width: 0;
  flex: 1 1 auto;
  justify-content: flex-end;
  gap: 4px;
  line-height: 16px;

  > .v-icon {
    flex: 0 0 auto;
  }
}

.cp-comment-source-title {
  overflow: hidden;
  min-width: 0;
  flex: 0 1 auto;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-comment-meta {
  flex: 0 0 auto;
  gap: 12px;

  span {
    gap: 4px;
    white-space: nowrap;
  }
}

.cp-comment-content {
  min-width: 0;
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;

  :deep(.tp-image-box) {
    width: fit-content;
    max-width: min(100%, 320px);
    justify-content: flex-start;
    margin: 8px 0;
  }

  :deep(.tp-image-box img) {
    width: auto;
    max-width: min(100%, 320px);
    max-height: 240px;
    margin: 0;
    object-fit: contain;
  }
}

.cp-comment-empty {
  color: var(--box-text-4);
  font-style: italic;
}

@media (prefers-reduced-motion: reduce) {
  .cp-comment {
    transition: none;
  }
}

@media (width <= 640px) {
  .cp-comment {
    padding: 12px;
  }
}
</style>
