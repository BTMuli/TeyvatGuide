<template>
  <v-card rounded v-if="card">
    <div class="tpc-cover">
      <img :src="card.cover" alt="cover" @click="createPost(card)" />
      <div v-if="isAct" class="tpc-act">
        <div class="tpc-status" :style="{ background: card.status?.colorCss }">
          {{ card.status?.status }}
        </div>
        <div class="tpc-time">
          <v-icon>mdi-clock-time-four-outline</v-icon>
          <span>{{ card.subtitle }}</span>
        </div>
      </div>
    </div>
    <div class="tpc-content">
      <div class="tpc-title" :title="card.title">{{ card.title }}</div>
      <TpAvatar v-if="card.user" :data="card.user" position="left" />
      <div class="tpc-data">
        <div class="tpc-info-item" :title="`浏览数：${card.data.view}`">
          <v-icon>mdi-eye</v-icon>
          <span>{{ card.data.view }}</span>
        </div>
        <div class="tpc-info-item" :title="`收藏数：${card.data.mark}`">
          <v-icon>mdi-star</v-icon>
          <span>{{ card.data.mark }}</span>
        </div>
        <div class="tpc-info-item" :title="`回复数：${card.data.reply}`">
          <v-icon>mdi-comment</v-icon>
          <span>{{ card.data.reply }}</span>
        </div>
        <div class="tpc-info-item" :title="`点赞数：${card.data.like}`">
          <v-icon>mdi-thumb-up</v-icon>
          <span>{{ card.data.like }}</span>
        </div>
        <div class="tpc-info-item" :title="`转发数：${card.data.forward}`">
          <v-icon>mdi-share-variant</v-icon>
          <span>{{ card.data.forward }}</span>
        </div>
      </div>
    </div>
    <div class="tpc-forum" v-if="card.forum" :title="`频道: ${card.forum.name}`">
      <img :src="card.forum.icon" :alt="card.forum.name" />
      <span>{{ card.forum.name }}</span>
    </div>
    <div v-if="props.selectMode" class="tpc-select">
      <v-checkbox-btn v-model="selectedList" :value="props.modelValue.post.post_id" />
    </div>
  </v-card>
</template>
<script lang="ts" setup>
import { computed, onBeforeMount, ref } from "vue";

import { createPost } from "../../utils/TGWindow.js";
import TpAvatar from "../post/tp-avatar.vue";

interface TPostCardProps {
  modelValue: TGApp.Plugins.Mys.Post.FullData;
  selectMode?: boolean;
  selected?: string[];
}

interface TPostCardEmits {
  (e: "update:selected", value: string[]): void;
}

const props = withDefaults(defineProps<TPostCardProps>(), {
  selectMode: false,
});
const emits = defineEmits<TPostCardEmits>();
const isAct = ref<boolean>(false);
const card = ref<TGApp.Plugins.Mys.News.RenderCard>();
const selectedList = computed({
  get: () => props.selected,
  set: (v) => {
    if (v === undefined) return;
    emits("update:selected", v);
  },
});

onBeforeMount(() => {
  card.value = getPostCard(props.modelValue);
});

/**
 * @description 活动状态
 * @since Alpha v0.2.1
 * @enum {TGApp.Plugins.Mys.News.RenderStatus}
 * @property {TGApp.Plugins.Mys.News.RenderStatus} STARTED 进行中
 * @property {TGApp.Plugins.Mys.News.RenderStatus} FINISHED 已结束
 * @property {TGApp.Plugins.Mys.News.RenderStatus} SELECTION 评选中
 * @return EnumStatus
 */
const EnumStatus = {
  STARTED: {
    status: "进行中",
    colorCss: "#1EE2BA",
  },
  FINISHED: {
    status: "已结束",
    colorCss: "#C0C5C8",
  },
  SELECTION: {
    status: "评选中",
    colorCss: "#FF983B",
  },
  UNKNOWN: {
    status: "未知",
    colorCss: "#F03F24", // 胭脂红
  },
};

/**
 * @description 获取活动状态
 * @since Alpha
 * @param {number} status 活动状态码
 * @returns {string}
 */
function getActivityStatus(status: number): TGApp.Plugins.Mys.News.RenderStatus {
  switch (status) {
    case 1:
      return EnumStatus.STARTED;
    case 2:
      return EnumStatus.SELECTION;
    case 3:
      return EnumStatus.FINISHED;
    default:
      return EnumStatus.UNKNOWN;
  }
}

/**
 * @description 获取封面图
 * @since Beta v0.4.5
 * @param {TGApp.Plugins.Mys.Post.FullData} item 咨讯列表项
 * @returns {string} 封面图链接
 */
function getPostCover(item: TGApp.Plugins.Mys.Post.FullData): string {
  // 默认封面图
  const defaultCover = "/source/UI/defaultCover.webp";
  let cover;
  if (item.cover) {
    cover = item.cover.url;
  } else if (item.post.cover) {
    cover = item.post.cover;
  } else if (item.post.images.length > 0) {
    cover = item.post.images[0];
  }
  if (cover === undefined) return defaultCover;
  if (cover.endsWith(".gif")) return cover;
  return `${cover}?x-oss-process=image/format,png`;
}

/**
 * @description 获取公共属性
 * @since Beta v0.4.5
 * @param {TGApp.Plugins.Mys.Post.FullData} item 咨讯列表项
 * @returns {TGApp.Plugins.Mys.News.RenderCard} 渲染用咨讯列表项
 */
function getCommonCard(item: TGApp.Plugins.Mys.Post.FullData): TGApp.Plugins.Mys.News.RenderCard {
  let forum = null;
  if (item.forum !== null) {
    forum = {
      name: item.forum.name,
      icon: item.forum.icon,
    };
  }
  return {
    title: item.post.subject,
    cover: getPostCover(item),
    postId: Number(item.post.post_id),
    subtitle: item.post.post_id,
    user: item.user,
    forum: forum,
    data: {
      mark: item.stat.bookmark_num,
      forward: item.stat.forward_num,
      like: item.stat.like_num,
      reply: item.stat.reply_num,
      view: item.stat.view_num,
    },
  };
}

function getPostCard(item: TGApp.Plugins.Mys.Post.FullData): TGApp.Plugins.Mys.News.RenderCard {
  const commonCard = getCommonCard(item);
  if (
    item.news_meta !== undefined &&
    item.news_meta !== null &&
    item.news_meta.start_at_sec !== "0"
  ) {
    isAct.value = true;
    const startTime = new Date(Number(item.news_meta.start_at_sec) * 1000).toLocaleDateString();
    const endTime = new Date(Number(item.news_meta.end_at_sec) * 1000).toLocaleDateString();
    const statusInfo = getActivityStatus(item.news_meta.activity_status);
    commonCard.subtitle = `${startTime} - ${endTime}`;
    commonCard.status = statusInfo;
  }
  return commonCard;
}
</script>
<style lang="css" scoped>
.tpc-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 36 / 13;
  background: var(--common-shadow-2);
}

.tpc-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.tpc-content {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}

.tpc-title {
  overflow: hidden;
  width: 100%;
  font-family: var(--font-title);
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpc-forum {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-2);
  border-bottom-left-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
}

.tpc-select {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpc-forum img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.tpc-cover img:hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.tpc-data {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
  column-gap: 10px;
}

.tpc-info-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-7);
  font-size: 12px;
  gap: 5px;
  opacity: 0.6;
}

.tpc-act {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/50%);
  font-size: 12px;
}

.tpc-status {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px 30px 5px 5px;
  clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%);
  color: var(--tgc-white-1);

  &::after {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(255 255 255/40%);
    clip-path: polygon(
      calc(100% - 25px) 0,
      100% 0,
      100% 100%,
      calc(100% - 25px) 100%,
      calc(100% - 10px) 50%
    );
    content: "";
  }
}

.tpc-time {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 5px;
  color: var(--tgc-white-1);
  gap: 5px;
  opacity: 0.8;
}
</style>
