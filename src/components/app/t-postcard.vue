<!-- 帖子卡片组件 -->
<template>
  <div
    v-if="card"
    :id="`post-card-${card.postId}`"
    :class="{ 'select-mode': props.selectMode }"
    class="tpc-card"
    @click="trySelect()"
  >
    <div class="tpc-top">
      <div class="tpc-cover" @click="toPost()">
        <TMiImg v-if="card.cover !== ''" :ori="true" :src="card.cover" alt="cover" />
        <img v-else alt="cover" src="/source/UI/defaultCover.webp" />
        <div v-if="card.status" class="tpc-act">
          <div class="tpc-status">{{ card.status?.label }}</div>
          <div class="tpc-time">
            <v-icon>mdi-clock-time-four-outline</v-icon>
            <span>{{ card.subtitle }}</span>
          </div>
        </div>
        <div
          v-else-if="props.modelValue.post.images.length > 1"
          :title="`图片数：${props.modelValue.post.images.length}`"
          class="tpc-image-cnt"
        >
          <v-icon size="10">mdi-folder-multiple-image</v-icon>
          <span>{{ props.modelValue.post.images.length }}</span>
        </div>
      </div>
      <div :title="card.title" class="tpc-title" @click="shareCard()">{{ card.title }}</div>
    </div>
    <div v-if="card.user !== null" class="tpc-mid">
      <TpAvatar
        :data="card.user"
        :style="{ cursor: props.userClick ? 'pointer' : 'default' }"
        position="left"
        @click="onUserClick()"
      />
    </div>
    <div class="tpc-bottom">
      <div class="tpc-tags">
        <div v-for="(reason, idx) in card.reasons" :key="idx" class="tpc-reason" title="推荐理由">
          <v-icon size="10">mdi-lightbulb-on</v-icon>
          <span>{{ reason.text }}</span>
        </div>
        <TpcTag
          v-for="topic in card.topics"
          :key="topic.id"
          :tag="topic.name"
          @click="toTopic(topic)"
        />
      </div>
      <div v-if="card.data !== null" class="tpc-data">
        <div :title="`浏览数：${card.data.view}`" class="tpc-info-item">
          <v-icon size="12">mdi-eye</v-icon>
          <span>{{ card.data.view }}</span>
        </div>
        <div :title="`收藏数：${card.data.mark}`" class="tpc-info-item">
          <v-icon size="12">mdi-star</v-icon>
          <span>{{ card.data.mark }}</span>
        </div>
        <div :title="`回复数：${card.data.reply}`" class="tpc-info-item">
          <v-icon size="12">mdi-comment</v-icon>
          <span>{{ card.data.reply }}</span>
        </div>
        <div :title="`点赞数：${card.data.like}`" class="tpc-info-item">
          <v-icon size="12">mdi-thumb-up</v-icon>
          <span>{{ card.data.like }}</span>
        </div>
        <div :title="`转发数：${card.data.forward}`" class="tpc-info-item">
          <v-icon size="12">mdi-share-variant</v-icon>
          <span>{{ card.data.forward }}</span>
        </div>
      </div>
      <div class="tpc-data">
        <div :title="`创建时间: ${card.meta.create_time}`" class="tpc-info-item">
          <v-icon size="12">mdi-calendar-clock</v-icon>
          <span>{{ card.meta.create_time }}</span>
        </div>
        <div
          v-if="card.meta.update_time"
          :title="`更新时间: ${card.meta.update_time}`"
          class="tpc-info-item"
        >
          <v-icon size="12">mdi-calendar-edit</v-icon>
          <span>{{ card.meta.update_time }}</span>
        </div>
      </div>
    </div>
    <div
      v-if="card.forum !== null && card.forum.name !== ''"
      :title="`频道: ${card.forum.name}`"
      class="tpc-forum"
      @click="toForum(card.forum)"
    >
      <img v-if="card.forum.icon !== ''" :alt="card.forum.name" :src="card.forum.icon" />
      <span>{{ card.forum.name }}</span>
    </div>
    <v-checkbox-btn
      v-if="props.selectMode"
      v-model="isSelected"
      class="tpc-select"
      data-html2canvas-ignore
      @click.stop="trySelect()"
    />
    <div v-else class="tpc-info-id">
      <span>{{ props.modelValue.post.post_id }}</span>
      <template v-if="isDevEnv">
        <span data-html2canvas-ignore>[{{ props.modelValue.post.view_type }}]</span>
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import useBBSStore from "@store/bbs.js";
import { emit } from "@tauri-apps/api/event";
import { str2Color } from "@utils/colorFunc.js";
import { generateShareImg } from "@utils/TGShare.js";
import { createPost } from "@utils/TGWindow.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

type TPostCardProps = {
  modelValue: TGApp.BBS.Post.FullData;
  selectMode?: boolean;
  userClick?: boolean;
};
type TPostCardEmits = {
  (e: "onSelected", v: string): void;
  (e: "onUserClick", u: TGApp.BBS.Post.User, g: number): void;
};
type RenderForum = { name: string; icon: string; id: number };
type RenderStatus = { stat: number; label: string; color: string };
type RenderData = { mark: number; forward: number; like: number; reply: number; view: number };
type RenderMeta = { create_time: string; update_time?: string };
export type RenderCard = {
  title: string;
  cover: string;
  postId: number;
  subtitle: string;
  user: TGApp.BBS.Post.User | null;
  forum: RenderForum | null;
  data: RenderData | null;
  meta: RenderMeta;
  status?: RenderStatus;
  topics: Array<TGApp.BBS.Post.Topic>;
  reasons: Array<TGApp.BBS.Post.RecommendTags>;
};
// @ts-expect-error The import.meta meta-property is not allowed in files which will build into CommonJS output.
const isDevEnv = import.meta.env.MODE === "development";
const stats: Readonly<Array<RenderStatus>> = [
  { stat: 0, label: "未知", color: "var(--tgc-od-red)" },
  { stat: 1, label: "进行中", color: "var(--tgc-od-green)" },
  { stat: 2, label: "评选中", color: "var(--tgc-od-orange)" },
  { stat: 3, label: "已结束", color: "var(--tgc-od-white)" },
];

const route = useRoute();
const router = useRouter();
const { forumList } = storeToRefs(useBBSStore());

const props = withDefaults(defineProps<TPostCardProps>(), { selectMode: false });
const emits = defineEmits<TPostCardEmits>();

const isSelected = ref<boolean>(false);
const card = shallowRef<RenderCard>();

const cardBg = computed<string>(() => {
  if (card.value && card.value.status) return card.value.status.color;
  return "none";
});
const forumBg = computed<string>(() =>
  str2Color(`${card.value?.forum?.id}${card.value?.forum?.icon}${card.value?.forum?.name}`, -60),
);
const idBg = computed<string>(() => str2Color(`${props.modelValue.post.post_id}`, 0));

onMounted(async () => (card.value = getPostCard(props.modelValue)));

watch(
  () => props.modelValue,
  async () => (card.value = getPostCard(props.modelValue)),
);

function trySelect(): void {
  if (props.selectMode) emits("onSelected", props.modelValue.post.post_id);
  isSelected.value = !isSelected.value;
}

async function toPost(): Promise<void> {
  if (props.selectMode) return;
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
  return `${cover}?x-oss-process=image/resize,m_fill,w_690,h_320,limit_0/format,png`;
}

function getCommonCard(item: TGApp.BBS.Post.FullData): RenderCard {
  let forumData: RenderForum | null = null;
  let statData: RenderData | null = null;
  if (item.forum !== null) {
    let forumIcon = item.forum.icon;
    const findG = forumList.value.find((i) => i.game_id === item.post.game_id);
    if (findG) {
      console.log(findG, item);
      const findF = findG.forums.find((i) => i.id === item.forum.id);
      if (findF) forumIcon = findF.icon_pure;
    }
    forumData = { name: item.forum.name, icon: forumIcon, id: item.forum.id };
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
  const metaData: RenderMeta = {
    create_time: timestampToDate(Number(item.post.created_at) * 1000),
    update_time:
      item.post.updated_at === 0 ? undefined : timestampToDate(Number(item.post.updated_at) * 1000),
  };
  return {
    title: item.post.subject,
    cover: getPostCover(item),
    postId: Number(item.post.post_id),
    subtitle: item.post.post_id,
    user: item.user,
    forum: forumData,
    data: statData,
    meta: metaData,
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
  if (props.selectMode) return;
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
  if (props.selectMode) return;
  const gid = props.modelValue.post.game_id;
  await emit("active_deep_link", `router?path=/posts/topic/${gid}/${topic.id}`);
}

async function toForum(forum: RenderForum): Promise<void> {
  if (props.selectMode) return;
  const gid = props.modelValue.post.game_id;
  await emit("active_deep_link", `router?path=/posts/forum/${gid}/${forum.id}`);
}

function onUserClick(): void {
  if (props.selectMode) return;
  if (!card.value || card.value.user === null) return;
  emits("onUserClick", card.value.user, props.modelValue.post.game_id);
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tpc-card {
  @include github-styles.github-card;

  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-radius: 4px;
  row-gap: 8px;

  &.select-mode {
    cursor: pointer;
  }
}

.dark .tpc-card {
  @include github-styles.github-card("dark");
}

.tpc-top {
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  row-gap: 4px;
}

.tpc-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 69 / 32;
  background: var(--common-shadow-2);
  cursor: pointer;

  img {
    overflow: hidden;
    width: 100%;
    height: 100%;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    object-fit: cover;
    object-position: center;
    transition: all 0.3s linear;

    &:hover {
      transform: scale(1.2);
    }
  }
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

.tpc-reason {
  @include github-styles.github-tag-dark-gen(#d19a66);

  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 12px;
  gap: 2px;
  user-select: none;
}

.tpc-forum {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 4px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: v-bind(forumBg); /* stylelint-disable-line value-keyword-case */
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  cursor: pointer;
  text-shadow: 0 0 4px var(--tgc-dark-1);

  img {
    width: 20px;
    height: 20px;
    margin-right: 4px;
  }
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

.tpc-data {
  display: flex;
  width: fit-content;
  max-width: 100%;
  height: 20px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 8px;
}

.tpc-info-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-7);
  font-size: 12px;
  gap: 2px;
  opacity: 0.6;
  white-space: nowrap;
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
  background: #00000080;
  font-size: 12px;
}

.tpc-image-cnt {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 4px;
  padding-left: 8px;
  background: var(--tgc-od-blue);
  border-top-left-radius: 12px;
  box-shadow: -1px -1px 6px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  column-gap: 2px;
  font-size: 12px;
  line-height: 18px;
}

.tpc-status {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 4px 30px 4px 4px;
  background-color: v-bind(cardBg); /* stylelint-disable-line value-keyword-case */
  clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%);
  color: var(--tgc-white-1);

  &::after {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #ffffff66;
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
  overflow: hidden;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: v-bind(idBg); /* stylelint-disable-line value-keyword-case */
  border-bottom-right-radius: 4px;
  border-top-left-radius: 4px;
  box-shadow: 1px 1px 6px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}
</style>
