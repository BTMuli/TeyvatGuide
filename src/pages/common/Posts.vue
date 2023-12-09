<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="posts-grid">
    <v-card v-for="post in posts" :key="post.postId" class="post-card">
      <div class="post-cover" @click="createPost(post)">
        <img :src="post.cover" alt="cover" />
      </div>
      <div class="post-content">
        <div class="post-card-title" :title="post.title">{{ post.title }}</div>
        <div class="post-card-user">
          <div class="pcu-left">
            <div class="pcu-icon">
              <img :src="post.user.icon" alt="userIcon" />
            </div>
            <div v-if="post.user.pendant !== ''" class="pcu-pendent">
              <img :src="post.user.pendant" alt="userPendant" />
            </div>
          </div>
          <div class="pcu-right">
            <span>{{ post.user.nickname }}</span>
            <span>{{ post.user.label }}</span>
          </div>
        </div>
        <div class="post-card-data">
          <div class="pcd-item" :title="`浏览数：${post.data.view}`">
            <v-icon>mdi-eye</v-icon>
            <span>{{ post.data.view }}</span>
          </div>
          <div class="pcd-item" :title="`收藏数：${post.data.mark}`">
            <v-icon>mdi-star</v-icon>
            <span>{{ post.data.mark }}</span>
          </div>
          <div class="pcd-item" :title="`回复数：${post.data.reply}`">
            <v-icon>mdi-comment</v-icon>
            <span>{{ post.data.reply }}</span>
          </div>
          <div class="pcd-item" :title="`点赞数：${post.data.like}`">
            <v-icon>mdi-thumb-up</v-icon>
            <span>{{ post.data.like }}</span>
          </div>
          <div class="pcd-item" :title="`转发数：${post.data.forward}`">
            <v-icon>mdi-share-variant</v-icon>
            <span>{{ post.data.forward }}</span>
          </div>
        </div>
      </div>
      <div class="post-card-forum" :title="`频道: ${post.forum.name}`">
        <img :src="post.forum.icon" :alt="post.forum.name" />
        <span>{{ post.forum.name }}</span>
      </div>
    </v-card>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";

import ToLoading from "../../components/overlay/to-loading.vue";
import Mys from "../../plugins/Mys";
import { createPost } from "../../utils/TGWindow";

const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载中...");

const posts = ref<TGApp.Plugins.Mys.Forum.RenderCard[]>([]);

onMounted(async () => {
  loading.value = true;
  const getData = await Mys.Posts.get(26, 2, 1);
  posts.value = Mys.Posts.card(getData);
  loading.value = false;
});
</script>
<style lang="css" scoped>
.posts-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.post-card {
  border-radius: 5px;
  background: var(--app-page-bg);
  color: var(--box-text-1);
}

.dark .post-card {
  border: 1px solid var(--common-shadow-2);
}

.post-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 36 / 13;
}

.post-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.post-content {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}

.post-card-title {
  overflow: hidden;
  width: 100%;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-card-user {
  display: flex;
}

.pcu-left {
  position: relative;
  width: 50px;
  height: 50px;
}

.pcu-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.pcu-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pcu-pendent {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.pcu-pendent img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pcu-right {
  position: relative;
  display: flex;
  height: 50px;
  flex-direction: column;
  align-items: start;
  color: var(--box-text-4);
}

.pcu-right :nth-child(1) {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: start;
  font-size: 16px;
}

.pcu-right :nth-child(2) {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: start;
  border-top: 2px solid var(--common-shadow-2);
  font-size: 14px;
  opacity: 0.7;
}

.post-card-forum {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/20%);
  border-bottom-left-radius: 5px;
  border-top-right-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
}

.post-card-forum img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.post-cover img:hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.post-card-data {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
  column-gap: 10px;
}

.pcd-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-7);
  font-size: 12px;
  gap: 5px;
  opacity: 0.6;
}
</style>
