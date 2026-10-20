<template>
  <article class="cp-comment">
    <header class="cp-comment-header">
      <button
        v-if="postId"
        :aria-label="`打开原帖：${postTitle}`"
        :title="`打开原帖：${postTitle}`"
        class="cp-comment-source"
        type="button"
        @click="handleOpenPost"
      >
        <v-icon size="16" aria-hidden="true">mdi-link-variant</v-icon>
        <span class="cp-comment-source-title">
          <TpTitle :singleLine="true" :text="postTitle" />
        </span>
      </button>
      <span v-else class="cp-comment-source-title">{{ postTitle }}</span>
      <time v-if="createdAtLabel" :datetime="createdAtIso" class="cp-comment-date">
        {{ createdAtLabel }}
      </time>
    </header>

    <div aria-label="评论内容" class="cp-comment-content">
      <TpParser v-if="contentNodes.length" :data="contentNodes" />
      <span v-else class="cp-comment-empty">[无文字内容]</span>
    </div>

    <footer aria-label="评论统计" class="cp-comment-meta">
      <span title="点赞数">
        <v-icon size="14" aria-hidden="true">mdi-thumb-up-outline</v-icon>
        {{ likeCount }}
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
const likeCount = computed<number>(() => props.comment.stat.like_num ?? 0);

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
}

.cp-comment-header,
.cp-comment-source,
.cp-comment-meta,
.cp-comment-meta span {
  display: flex;
  align-items: center;
}

.cp-comment-header {
  justify-content: space-between;
  gap: 12px;
}

.cp-comment-source {
  min-width: 0;
  color: var(--common-text-title);
  cursor: pointer;
  font: inherit;
  gap: 8px;
  text-align: left;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
}

.cp-comment-source-title {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-comment-date,
.cp-comment-meta {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 12px;
}

.cp-comment-content {
  min-width: 0;
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.cp-comment-empty {
  color: var(--box-text-4);
  font-style: italic;
}

.cp-comment-meta {
  gap: 12px;

  span {
    gap: 4px;
  }
}

.cp-comment button:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--common-text-title);
  outline-offset: 4px;
}

@media (width <= 640px) {
  .cp-comment {
    padding: 12px;
  }

  .cp-comment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
