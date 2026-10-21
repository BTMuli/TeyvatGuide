<template>
  <article class="cp-post">
    <header class="cp-post-meta">
      <button
        v-if="post.user"
        :title="`查看 ${post.user.nickname} 的米游社主页`"
        class="cp-post-author"
        type="button"
        @click="emit('openProfile', post.user.uid)"
      >
        <CpAvatar :user="post.user" :size="24" />
        <span class="cp-post-author-name">{{ post.user.nickname }}</span>
      </button>
      <v-icon size="16" aria-hidden="true">mdi-clock-outline</v-icon>
      <time v-if="viewedAt" :title="`发布于 ${fmtUtil.dateTime(post.post.created_at * 1000)}`">
        浏览于 {{ fmtUtil.dateTime(viewedAt * 1000) }}
      </time>
      <time v-else>{{ fmtUtil.dateTime(post.post.created_at * 1000) }}</time>
      <RouterLink
        v-if="post.forum"
        :aria-label="`进入版块：${post.forum.name}`"
        class="cp-post-forum"
        :to="`/posts/forum/${post.post.game_id}/${post.forum.id}`"
      >
        <TMiImg v-if="post.forum.icon" :alt="post.forum.name" :ori="true" :src="post.forum.icon" />
        {{ post.forum.name }}
      </RouterLink>
    </header>
    <h3 class="cp-post-title">
      <button type="button" @click="openPost">
        <TpTitle :text="post.post.subject || '无标题帖子'" />
      </button>
    </h3>
    <div v-if="images.length" class="cp-post-images">
      <span v-for="(image, index) in images" :key="`${index}:${image}`" class="cp-post-image">
        <TMiImg :src="image" :alt="`第 ${index + 1} 张帖子图片`" />
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
    <footer v-if="post.stat" aria-label="帖子统计" class="cp-post-stats">
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
    </footer>
  </article>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpTitle from "@comp/viewPost/tp-title.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import fmtUtil from "@utils/fmtUtil.js";
import { computed } from "vue";

import CpAvatar from "./cp-avatar.vue";

const { post, viewedAt } = defineProps<{ post: TGApp.BBS.Post.FullData; viewedAt?: number }>();
const emit = defineEmits<{
  openPost: [postId: string, title: string];
  openProfile: [uid: string];
}>();
const images = computed<Array<string>>(() => {
  if (post.post.images.length) return post.post.images.slice(0, 3);
  const cover = post.cover?.url || post.post.cover;
  return cover ? [cover] : [];
});

function openPost(): void {
  emit("openPost", post.post.post_id, post.post.subject);
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
}

.cp-post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
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

.cp-post-forum {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-5);
  gap: 4px;
  text-decoration: none;

  :deep(img) {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  &:hover {
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
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
  width: 100%;
  max-width: 520px;
  gap: 8px;
}

.cp-post-image {
  display: grid;
  overflow: hidden;
  width: min(30%, 160px);
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

.cp-post-topics {
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 8px 16px;
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
</style>
