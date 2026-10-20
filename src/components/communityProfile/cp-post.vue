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
        <CpAvatar :user="post.user" :size="32" />
        <span>{{ post.user.nickname }}</span>
      </button>
      <span v-if="post.forum?.name" class="cp-post-forum">{{ post.forum.name }}</span>
      <time>{{ fmtUtil.dateTime(post.post.created_at * 1000) }}</time>
    </header>
    <h3 class="cp-post-title">
      <button type="button" @click="openPost">
        <TpTitle :text="post.post.subject || '无标题帖子'" />
      </button>
    </h3>
    <button
      v-if="images.length"
      :aria-label="`查看帖子：${post.post.subject || '无标题帖子'}`"
      class="cp-post-images"
      type="button"
      @click="openPost"
    >
      <span v-for="(image, index) in images" :key="`${index}:${image}`" class="cp-post-image">
        <TMiImg :src="image" :alt="`第 ${index + 1} 张帖子图片`" :ori="true" />
      </span>
    </button>
    <footer v-if="post.stat" aria-label="帖子统计" class="cp-post-stats">
      <span :title="`浏览 ${post.stat.view_num}`">
        <v-icon size="16" aria-hidden="true">mdi-eye-outline</v-icon>{{ post.stat.view_num }}
      </span>
      <span :title="`评论 ${post.stat.reply_num}`">
        <v-icon size="16" aria-hidden="true">mdi-comment-outline</v-icon>{{ post.stat.reply_num }}
      </span>
      <span :title="`点赞 ${post.stat.like_num}`">
        <v-icon size="16" aria-hidden="true">mdi-thumb-up-outline</v-icon>{{ post.stat.like_num }}
      </span>
      <span :title="`收藏 ${post.stat.bookmark_num}`">
        <v-icon size="16" aria-hidden="true">mdi-star-outline</v-icon>{{ post.stat.bookmark_num }}
      </span>
    </footer>
  </article>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpTitle from "@comp/viewPost/tp-title.vue";
import fmtUtil from "@utils/fmtUtil.js";
import { computed } from "vue";

import CpAvatar from "./cp-avatar.vue";

const { post } = defineProps<{ post: TGApp.BBS.Post.FullData }>();
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
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
}

.cp-post-meta,
.cp-post-author,
.cp-post-stats,
.cp-post-stats span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-post-meta {
  flex-wrap: wrap;
  color: var(--box-text-4);
  font-size: 12px;
}

.cp-post-author {
  min-width: 0;
  color: var(--app-page-content);
  cursor: pointer;
  font-size: 12px;

  span {
    overflow: hidden;
    max-width: 200px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cp-post-forum {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
}

.cp-post-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 24px;
  overflow-wrap: anywhere;

  button {
    color: inherit;
    cursor: pointer;
    font: inherit;
    text-align: left;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  }
}

.cp-post-images {
  display: flex;
  width: fit-content;
  max-width: 100%;
  cursor: pointer;
  gap: 8px;
}

.cp-post-image {
  display: grid;
  overflow: hidden;
  width: 120px;
  max-width: 30vw;
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

.cp-post-stats {
  flex-wrap: wrap;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 16px;

  span {
    gap: 4px;
  }
}

.cp-post button:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--common-text-title);
  outline-offset: 4px;
}
</style>
