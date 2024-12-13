<template>
  <div v-if="card" :id="`post-card-${card.postId}`" class="tpc-card">
    <div class="tpc-top">
      <div class="tpc-cover" @click="createPost(card)">
        <img :src="localCover" alt="cover" v-if="localCover" />
        <v-progress-circular color="primary" :indeterminate="true" v-else-if="card.cover !== ''" />
        <img src="/source/UI/defaultCover.webp" alt="cover" v-else />
        <div v-if="isAct" class="tpc-act">
          <div class="tpc-status">{{ card.status?.status }}</div>
          <div class="tpc-time">
            <v-icon>mdi-clock-time-four-outline</v-icon>
            <span>{{ card.subtitle }}</span>
          </div>
        </div>
      </div>
      <div class="tpc-title" :title="card.title" @click="shareCard">{{ card.title }}</div>
    </div>
    <div class="tpc-mid" v-if="card.user !== null">
      <TpAvatar :data="card.user" position="left" />
    </div>
    <div class="tpc-bottom" v-if="card.data !== null">
      <div class="tpc-tags">
        <div v-for="topic in card.topics" :key="topic.id" class="tpc-tag" @click="toTopic(topic)">
          <v-icon size="10">mdi-tag</v-icon>
          <span>{{ topic.name }}</span>
        </div>
      </div>
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
    <div
      class="tpc-forum"
      v-if="card.forum !== null && card.forum.name !== ''"
      :title="`频道: ${card.forum.name}`"
      @click="toForum(card.forum)"
    >
      <img :src="card.forum.icon" :alt="card.forum.name" />
      <span>{{ card.forum.name }}</span>
    </div>
    <v-checkbox-btn
      v-if="props.selectMode"
      class="tpc-select"
      @click="emits('onSelected', props.modelValue.post.post_id)"
      data-html2canvas-ignore
    />
    <div class="tpc-info-id" v-else>{{ props.modelValue.post.post_id }}</div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import { emit } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

import { generateShareImg, saveImgLocal } from "@/utils/TGShare.js";
import { createPost } from "@/utils/TGWindow.js";

type TPostCardProps = { modelValue: TGApp.Plugins.Mys.Post.FullData; selectMode?: boolean };
type TPostCardEmits = (e: "onSelected", v: string) => void;

const props = withDefaults(defineProps<TPostCardProps>(), { selectMode: false });
const emits = defineEmits<TPostCardEmits>();
const isAct = ref<boolean>(false);
const card = shallowRef<TGApp.Plugins.Mys.News.RenderCard>();
const localCover = ref<string>();

const cardBg = computed<string>(() => {
  if (card.value && card.value.status) return card.value.status.colorCss;
  return "none";
});

onMounted(async () => await reload(props.modelValue));

watch(
  () => props.modelValue,
  async () => await reload(props.modelValue),
);

async function reload(data: TGApp.Plugins.Mys.Post.FullData): Promise<void> {
  if (localCover.value) {
    URL.revokeObjectURL(localCover.value);
    localCover.value = undefined;
  }
  card.value = getPostCard(data);
  if (card.value && card.value.cover !== "") {
    localCover.value = await saveImgLocal(card.value.cover);
  }
}

onUnmounted(() => {
  if (localCover.value) {
    URL.revokeObjectURL(localCover.value);
    localCover.value = undefined;
  }
});

// todo 优化结构
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
    colorCss: "var(--tgc-od-green)",
  },
  FINISHED: {
    status: "已结束",
    colorCss: "var(--tgc-od-white)",
  },
  SELECTION: {
    status: "评选中",
    colorCss: "var(--tgc-od-orange)",
  },
  UNKNOWN: {
    status: "未知",
    colorCss: "var(--tgc-od-red)",
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

function getPostCover(item: TGApp.Plugins.Mys.Post.FullData): string {
  let cover;
  if (item.cover) cover = item.cover.url;
  else if (item.post.cover) cover = item.post.cover;
  else if (item.post.images.length > 0) cover = item.post.images[0];
  if (cover === undefined) return "";
  if (cover.endsWith(".gif")) return cover;
  return `${cover}?x-oss-process=image/format,png`;
}

/**
 * @description 获取公共属性
 * @since Beta v0.6.1
 * @param {TGApp.Plugins.Mys.Post.FullData} item 咨讯列表项
 * @returns {TGApp.Plugins.Mys.News.RenderCard} 渲染用咨讯列表项
 */
function getCommonCard(item: TGApp.Plugins.Mys.Post.FullData): TGApp.Plugins.Mys.News.RenderCard {
  return {
    title: item.post.subject,
    cover: getPostCover(item),
    postId: Number(item.post.post_id),
    subtitle: item.post.post_id,
    user: item.user,
    forum:
      item.forum === null
        ? null
        : { name: item.forum.name, icon: item.forum.icon, id: item.forum.id },
    data:
      item.stat === null
        ? null
        : {
            mark: item.stat.bookmark_num,
            forward: item.stat.forward_num,
            like: item.stat.like_num,
            reply: item.stat.reply_num,
            view: item.stat.view_num,
          },
    topics: item.topics,
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

async function shareCard(): Promise<void> {
  if (!card.value) return;
  const shareDom = document.querySelector<HTMLDivElement>(`#post-card-${card.value.postId}`);
  if (shareDom === null) {
    showSnackbar.error("分享内容不存在", 3000);
    return;
  }
  const fileName = `PostCard_${card.value.postId}`;
  await generateShareImg(fileName, shareDom, 2.5);
}

async function toTopic(topic: TGApp.Plugins.Mys.Topic.Info): Promise<void> {
  const gid = props.modelValue.post.game_id;
  await emit("active_deep_link", `router?path=/posts/topic/${gid}/${topic.id}`);
}

async function toForum(forum: TGApp.Plugins.Mys.News.RenderForum): Promise<void> {
  const gid = props.modelValue.post.game_id;
  await emit("active_deep_link", `router?path=/posts/forum/${gid}/${forum.id}`);
}
</script>
<style lang="css" scoped>
.tpc-card {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  box-shadow: 2px 2px 5px var(--common-shadow-2);
  row-gap: 10px;
}

.tpc-top {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 5px;
}

.tpc-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 36 / 13;
  background: var(--common-shadow-2);
  cursor: pointer;
}

.tpc-cover img {
  width: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.tpc-mid {
  position: relative;
  width: 100%;
  padding: 0 10px;
}

.tpc-bottom {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 5px 10px;
  row-gap: 5px;
}

.tpc-title {
  overflow: hidden;
  width: 100%;
  padding: 5px 10px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpc-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  color: var(--box-text-5);
  cursor: pointer;
  font-size: 12px;
  gap: 5px;

  :hover {
    color: var(--box-text-3);
  }
}

.tpc-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-2);
  gap: 3px;
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
  cursor: pointer;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}

.tpc-select {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--box-bg-2);
  border-bottom-right-radius: 4px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--box-text-5);
}

.tpc-forum img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.tpc-cover img:hover {
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
  background-color: v-bind(cardBg);
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

.tpc-info-id {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-1);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
  box-shadow: 2px 2px 5px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}
</style>
