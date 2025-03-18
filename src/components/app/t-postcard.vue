<template>
  <div v-if="card" :id="`post-card-${card.postId}`" class="tpc-card">
    <div class="tpc-top">
      <div class="tpc-cover" @click="toPost()">
        <TMiImg :src="card.cover" alt="cover" :ori="true" v-if="card.cover !== ''" />
        <img src="/source/UI/defaultCover.webp" alt="cover" v-else />
        <div v-if="card.status" class="tpc-act">
          <div class="tpc-status">{{ card.status?.label }}</div>
          <div class="tpc-time">
            <v-icon>mdi-clock-time-four-outline</v-icon>
            <span>{{ card.subtitle }}</span>
          </div>
        </div>
      </div>
      <div class="tpc-title" :title="card.title" @click="shareCard">{{ card.title }}</div>
    </div>
    <div class="tpc-mid" v-if="card.user !== null">
      <TpAvatar
        :data="card.user"
        position="left"
        :style="{ cursor: props.userClick ? 'pointer' : 'default' }"
        @click="onUserClick()"
      />
    </div>
    <div class="tpc-bottom" v-if="card.data !== null">
      <div class="tpc-tags">
        <div v-for="(reason, idx) in card.reasons" :key="idx" class="tpc-reason" title="推荐理由">
          <v-icon size="10">mdi-lightbulb-on</v-icon>
          <span>{{ reason.text }}</span>
        </div>
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
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import { emit } from "@tauri-apps/api/event";
import { computed, onMounted, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { generateShareImg } from "@/utils/TGShare.js";
import { createPost } from "@/utils/TGWindow.js";

type TPostCardProps = {
  modelValue: TGApp.BBS.Post.FullData;
  selectMode?: boolean;
  userClick?: boolean;
};
type TPostCardEmits = {
  (e: "onSelected", v: string): void;
  (e: "onUserClick", v: TGApp.BBS.Post.User): void;
};
type RenderForum = { name: string; icon: string; id: number };
type RenderStatus = { stat: number; label: string; color: string };
type RenderData = { mark: number; forward: number; like: number; reply: number; view: number };
export type RenderCard = {
  title: string;
  cover: string;
  postId: number;
  subtitle: string;
  user: TGApp.BBS.Post.User | null;
  forum: RenderForum | null;
  data: RenderData | null;
  status?: RenderStatus;
  topics: Array<TGApp.BBS.Post.Topic>;
  reasons: Array<TGApp.BBS.Post.RecommendTags>;
};

const stats: Readonly<Array<RenderStatus>> = [
  { stat: 0, label: "未知", color: "var(--tgc-od-red)" },
  { stat: 1, label: "进行中", color: "var(--tgc-od-green)" },
  { stat: 2, label: "已结束", color: "var(--tgc-od-white)" },
  { stat: 3, label: "评选中", color: "var(--tgc-od-orange)" },
];
const route = useRoute();
const router = useRouter();
const props = withDefaults(defineProps<TPostCardProps>(), { selectMode: false });
const emits = defineEmits<TPostCardEmits>();
const card = shallowRef<RenderCard>();

const cardBg = computed<string>(() => {
  if (card.value && card.value.status) return card.value.status.color;
  return "none";
});

onMounted(async () => (card.value = getPostCard(props.modelValue)));

watch(
  () => props.modelValue,
  async () => (card.value = getPostCard(props.modelValue)),
);

async function toPost(): Promise<void> {
  if (!card.value) return;
  if (route.name !== "帖子详情") {
    await createPost(card.value);
    return;
  }
  if (route.params.post_id.toString() === card.value.postId.toString()) {
    showSnackbar.warn("当前已在该帖子详情页", 3000);
    return;
  }
  await router.push({ name: "帖子详情", params: { post_id: card.value.postId.toString() } });
}

function getActivityStatus(status: number): RenderStatus {
  let idx = stats.findIndex((v) => v.stat === status);
  if (idx === -1) idx = 0;
  return stats[idx];
}

function getPostCover(item: TGApp.BBS.Post.FullData): string {
  let cover;
  if (item.cover) cover = item.cover.url;
  else if (item.post.cover) cover = item.post.cover;
  else if (item.post.images.length > 0) cover = item.post.images[0];
  if (cover === undefined) return "";
  if (cover.endsWith(".gif")) return cover;
  return `${cover}?x-oss-process=image/resize,m_fill,w_360,h_130,limit_0/format,png`;
}

function getCommonCard(item: TGApp.BBS.Post.FullData): RenderCard {
  let forumData: RenderForum | null = null;
  let statData: RenderData | null = null;
  if (item.forum !== null) {
    forumData = { name: item.forum.name, icon: item.forum.icon, id: item.forum.id };
  }
  if (item.stat !== null) {
    statData = {
      mark: item.stat.bookmark_num,
      forward: item.stat.forward_num,
      like: item.stat.like_num,
      reply: item.stat.reply_num,
      view: item.stat.view_num,
    };
  }
  return {
    title: item.post.subject,
    cover: getPostCover(item),
    postId: Number(item.post.post_id),
    subtitle: item.post.post_id,
    user: item.user,
    forum: forumData,
    data: statData,
    topics: item.topics,
    reasons: item.recommend_reason?.tags ?? [],
  };
}

function getPostCard(item: TGApp.BBS.Post.FullData): RenderCard {
  const commonCard = getCommonCard(item);
  if (
    item.news_meta !== undefined &&
    item.news_meta !== null &&
    item.news_meta.start_at_sec !== "0"
  ) {
    const startTime = new Date(Number(item.news_meta.start_at_sec) * 1000).toLocaleDateString();
    const endTime = new Date(Number(item.news_meta.end_at_sec) * 1000).toLocaleDateString();
    const statusInfo = getActivityStatus(item.news_meta.activity_status);
    commonCard.subtitle = `${startTime} - ${endTime}`;
    commonCard.status = statusInfo;
  }
  return commonCard;
}

async function shareCard(): Promise<void> {
  console.log(props.modelValue);
  if (!card.value) return;
  const shareDom = document.querySelector<HTMLDivElement>(`#post-card-${card.value.postId}`);
  if (shareDom === null) {
    showSnackbar.error("分享内容不存在", 3000);
    return;
  }
  const fileName = `PostCard_${card.value.postId}`;
  await generateShareImg(fileName, shareDom, 2.5);
}

async function toTopic(topic: TGApp.BBS.Post.Topic): Promise<void> {
  const gid = props.modelValue.post.game_id;
  await emit("active_deep_link", `router?path=/posts/topic/${gid}/${topic.id}`);
}

async function toForum(forum: RenderForum): Promise<void> {
  const gid = props.modelValue.post.game_id;
  await emit("active_deep_link", `router?path=/posts/forum/${gid}/${forum.id}`);
}

function onUserClick(): void {
  if (!card.value || card.value.user === null) return;
  emits("onUserClick", card.value.user);
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tpc-card {
  @include github-styles.github-card();
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-radius: 4px;
  row-gap: 8px;
}

.dark .tpc-card {
  @include github-styles.github-card("dark");
}

.tpc-top {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;
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
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0 10px;
  margin-right: auto;
}

.tpc-bottom {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 4px 8px;
  row-gap: 4px;
}

.tpc-title {
  position: relative;
  width: fit-content;
  max-width: 100%;
  padding: 4px 8px;
  margin-right: auto;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 18px;
}

.tpc-tags {
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  font-size: 12px;
  gap: 4px;
}

.tpc-tag {
  @include github-styles.github-tag-dark-gen(#e06c63);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  cursor: pointer;
  gap: 4px;

  &:hover {
    @include github-styles.github-tag-dark-gen(#00aeec);
  }
}

.tpc-reason {
  @include github-styles.github-tag-dark-gen(#d19a66);

  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  gap: 4px;
}

.tpc-forum {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 4px;
  background: var(--tgc-od-white);
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  cursor: pointer;
  opacity: 0.8;
  text-shadow: 0 0 4px var(--tgc-dark-1);
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
  width: fit-content;
  max-width: 100%;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin-left: auto;
  column-gap: 8px;
}

.tpc-info-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-7);
  font-size: 12px;
  gap: 4px;
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
  padding: 4px 30px 4px 4px;
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
  margin: 4px;
  color: var(--tgc-white-1);
  gap: 4px;
  opacity: 0.8;
}

.tpc-info-id {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--tgc-od-orange);
  border-bottom-right-radius: 4px;
  border-top-left-radius: 4px;
  box-shadow: 2px 2px 4px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  opacity: 0.8;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}
</style>
