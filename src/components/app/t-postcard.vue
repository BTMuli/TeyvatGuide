<!-- 帖子卡片组件 -->
<template>
  <div
    v-if="card"
    :id="`post-card-${card.postId}`"
    :class="{ 'select-mode': props.selectMode, 'list-mode': props.listMode }"
    class="tpc-card"
    @click="trySelect()"
  >
    <div class="tpc-cover" @click="toPost()">
      <TMiImg v-if="card.cover !== ''" :ori="true" :src="card.cover" alt="cover" />
      <img v-else alt="cover" src="/UI/post/defaultCover.webp" />
      <div v-if="card.status" class="tpc-act">
        <div class="tpc-status">{{ card.status?.label }}</div>
        <div class="tpc-time">
          <v-icon>mdi-clock-time-four-outline</v-icon>
          <span>{{ card.subtitle }}</span>
        </div>
      </div>
      <div
        v-else-if="props.post.post.images.length > 1"
        :title="`图片数：${props.post.post.images.length}`"
        class="tpc-image-cnt"
      >
        <v-icon size="10">mdi-folder-multiple-image</v-icon>
        <span>{{ props.post.post.images.length }}</span>
      </div>
    </div>
    <div class="tpc-body">
      <div :title="card.title" class="tpc-title" @click="shareCard()">{{ card.title }}</div>
      <div v-if="card.user !== null" class="tpc-mid">
        <TpAvatar :data="card.user" position="left" @click="onUserClick()" />
      </div>
      <div class="tpc-bottom">
        <div
          ref="tagsContainerEl"
          :class="['tpc-tags', { 'is-ready': !props.listMode || tagsReady }]"
        >
          <div
            v-for="(reason, idx) in card.reasons"
            :key="`r-${idx}`"
            class="tpc-reason"
            title="推荐理由"
          >
            <v-icon size="10">mdi-lightbulb-on</v-icon>
            <span>{{ reason.text }}</span>
          </div>
          <TpcTag
            v-for="topic in visibleTopics"
            :key="topic.id"
            :tag="topic.name"
            @click="toTopic(topic)"
          />
          <span
            v-if="props.listMode"
            :class="['tpc-tags-more', { 'tpc-tags-more--hidden': hiddenTopics.length === 0 }]"
            @click.stop="toggleTagsMenu()"
          >
            <v-icon>mdi-dots-horizontal</v-icon>
          </span>
          <Teleport to="body">
            <div
              v-if="showTagsMenu && hiddenTopics.length > 0"
              :style="popupStyle"
              class="tpc-tags-popup"
            >
              <TpcTag
                v-for="topic in hiddenTopics"
                :key="topic.id"
                :tag="topic.name"
                @click="toTopic(topic)"
              />
            </div>
          </Teleport>
        </div>
        <div v-if="card.data !== null" class="tpc-data">
          <div :title="`浏览数：${card.data.view}`" class="tpc-info-item">
            <v-icon size="12">mdi-eye</v-icon>
            <span>{{ card.data.view }}</span>
          </div>
          <div
            :class="{ collected: props.post.self_operation?.is_collected }"
            :title="`收藏数：${card.data.mark}`"
            class="tpc-info-item"
          >
            <v-icon size="12">mdi-star</v-icon>
            <span>{{ card.data.mark }}</span>
          </div>
          <div :title="`回复数：${card.data.reply}`" class="tpc-info-item">
            <v-icon size="12">mdi-comment</v-icon>
            <span>{{ card.data.reply }}</span>
          </div>
          <div
            :class="{ love: props.post.self_operation?.upvote_type ?? 0 > 0 }"
            :title="`点赞数：${card.data.like}`"
            class="tpc-info-item"
          >
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
    <div v-else class="tpc-info-id" @click="shareCard()">
      <span>{{ props.post.post.post_id }}</span>
      <template v-if="isDevEnv">
        <span data-html2canvas-ignore>[{{ props.post.post.view_type }}]</span>
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TMiImg from "@comp/app/t-mi-img.vue";

/** 帖子卡片参数 */
type TPostCardProps = {
  /** 帖子数据 */
  post: TGApp.BBS.Post.FullData;
  /** 是否开启选择模式 */
  selectMode?: boolean;
  /** 是否是列表布局 */
  listMode?: boolean;
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

const props = withDefaults(defineProps<TPostCardProps>(), { selectMode: false, listMode: false });
const emits = defineEmits<TPostCardEmits>();

const isSelected = ref<boolean>(false);
const card = shallowRef<RenderCard>();
const tagsContainerEl = ref<HTMLElement | null>(null);
const showTagsMenu = ref<boolean>(false);
const visibleTopicCount = ref<number>(Infinity);
const tagsReady = ref<boolean>(false);
const tagWidthCache = ref<Array<number>>([]);
let tagsInited = false;
let resizeObserver: ResizeObserver | null = null;
let checkRafId: number | null = null;
let prefixWidth = 0;

const cardBg = computed<string>(() => {
  if (card.value && card.value.status) return card.value.status.color;
  return "none";
});
const forumBg = computed<string>(() =>
  str2Color(`${card.value?.forum?.id}${card.value?.forum?.icon}${card.value?.forum?.name}`, -60),
);
const idBg = computed<string>(() => str2Color(`${props.post.post.post_id}`, 0));

const visibleTopics = computed<Array<TGApp.BBS.Post.Topic>>(() => {
  if (!props.listMode || !card.value) return card.value?.topics ?? [];
  return card.value.topics.slice(0, visibleTopicCount.value);
});
const hiddenTopics = computed<Array<TGApp.BBS.Post.Topic>>(() => {
  if (!props.listMode || !card.value) return [];
  return card.value.topics.slice(visibleTopicCount.value);
});

const popupStyle = ref<Record<string, string>>({});

function updatePopupStyle(): void {
  const btn = <HTMLElement | null>tagsContainerEl.value?.querySelector(".tpc-tags-more");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  popupStyle.value = {
    position: "fixed",
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
  };
}

const TAGS_MENU_CLOSE_EVENT = "t-postcard-tags-close";

function toggleTagsMenu(): void {
  if (showTagsMenu.value) {
    showTagsMenu.value = false;
  } else {
    document.dispatchEvent(new CustomEvent(TAGS_MENU_CLOSE_EVENT));
    updatePopupStyle();
    showTagsMenu.value = true;
  }
}

function closeTagsMenuHandler(e: Event): void {
  if (e.type === "click") {
    const target = <HTMLElement>e.target;
    if (target.closest(".tpc-tags-more") || target.closest(".tpc-tags-popup")) return;
  }
  showTagsMenu.value = false;
}

function measureAndCheck(): void {
  const container = tagsContainerEl.value;
  if (!container || !card.value) return;
  const children = <Array<HTMLElement>>Array.from(container.children);
  const widths: Array<number> = [];
  let prefix = 0;
  let foundTag = false;
  for (const child of children) {
    if (child.classList.contains("tpc-tags-more")) break;
    if (child.classList.contains("tag-label")) {
      foundTag = true;
      widths.push(child.getBoundingClientRect().width);
    } else if (!foundTag) {
      prefix += child.getBoundingClientRect().width + 4;
    }
  }
  tagWidthCache.value = widths;
  prefixWidth = prefix;
  calcVisibleCount();
  tagsReady.value = true;
}

function calcVisibleCount(): void {
  const container = tagsContainerEl.value;
  if (!container || !card.value) return;
  const totalTopics = card.value.topics.length;
  const cw = container.clientWidth;
  const moreBtn = <HTMLElement | null>container.querySelector(".tpc-tags-more");
  const moreWidth = moreBtn ? moreBtn.getBoundingClientRect().width + 4 : 0;
  const limit = cw - prefixWidth - moreWidth;
  const widths = tagWidthCache.value;
  if (widths.length !== totalTopics || totalTopics === 0) {
    visibleTopicCount.value = Infinity;
    return;
  }
  let acc = 0;
  let count = 0;
  for (const w of widths) {
    acc += w + 4;
    if (acc > limit) break;
    count++;
  }
  visibleTopicCount.value = count < totalTopics ? count : Infinity;
}

function checkTagsOverflow(): void {
  if (!props.listMode || !card.value) return;
  if (checkRafId !== null) cancelAnimationFrame(checkRafId);
  checkRafId = requestAnimationFrame(() => {
    checkRafId = null;
    if (tagWidthCache.value.length === 0) {
      measureAndCheck();
    } else {
      calcVisibleCount();
    }
  });
}

onMounted(async () => {
  card.value = getPostCard(props.post);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (checkRafId !== null) {
    cancelAnimationFrame(checkRafId);
    checkRafId = null;
  }
  if (showTagsMenu.value) {
    document.removeEventListener("click", closeTagsMenuHandler);
    document.removeEventListener(TAGS_MENU_CLOSE_EVENT, onTagsMenuClose);
    window.removeEventListener("scroll", closeTagsMenuHandler, true);
    window.removeEventListener("resize", closeTagsMenuHandler);
  }
});

watch(
  () => props.post,
  async () => (card.value = getPostCard(props.post)),
);

watch(
  () => card.value,
  async () => {
    if (!props.listMode) return;
    if (!card.value) return;
    if (card.value.topics.length === 0) {
      tagsReady.value = true;
      return;
    }
    if (!tagsInited) {
      await nextTick();
      if (!tagsContainerEl.value) return;
      tagsInited = true;
      resizeObserver = new ResizeObserver(checkTagsOverflow);
      resizeObserver.observe(tagsContainerEl.value);
      checkTagsOverflow();
    } else {
      tagWidthCache.value = [];
      visibleTopicCount.value = Infinity;
      await nextTick();
      checkTagsOverflow();
    }
  },
);

function onTagsMenuClose(): void {
  showTagsMenu.value = false;
}

watch(showTagsMenu, (val) => {
  if (val) {
    document.addEventListener("click", closeTagsMenuHandler);
    document.addEventListener(TAGS_MENU_CLOSE_EVENT, onTagsMenuClose);
    window.addEventListener("scroll", closeTagsMenuHandler, true);
    window.addEventListener("resize", closeTagsMenuHandler);
  } else {
    document.removeEventListener("click", closeTagsMenuHandler);
    document.removeEventListener(TAGS_MENU_CLOSE_EVENT, onTagsMenuClose);
    window.removeEventListener("scroll", closeTagsMenuHandler, true);
    window.removeEventListener("resize", closeTagsMenuHandler);
  }
});

function trySelect(): void {
  if (props.selectMode) {
    emits("onSelected", props.post.post.post_id);
    isSelected.value = !isSelected.value;
  }
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
      const findF = findG.forums.find((i) => i.id === item.forum!.id);
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
  showTagsMenu.value = false;
  if (props.selectMode) return;
  const gid = props.post.post.game_id;
  await emit("active_deep_link", `router?path=/posts/topic/${gid}/${topic.id}`);
}

async function toForum(forum: RenderForum): Promise<void> {
  if (props.selectMode) return;
  const gid = props.post.post.game_id;
  await emit("active_deep_link", `router?path=/posts/forum/${gid}/${forum.id}`);
}

function onUserClick(): void {
  if (props.selectMode) return;
  if (!card.value || card.value.user === null) return;
  emits("onUserClick", card.value.user, props.post.post.game_id);
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

  &.list-mode {
    flex-direction: row;
    gap: 0 8px;
  }
}

.dark .tpc-card {
  @include github-styles.github-card("dark");
}

.tpc-body {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  transition: flex 0.3s ease;

  .list-mode & {
    overflow: hidden;
    height: 100%;
  }
}

.tpc-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  aspect-ratio: 69 / 32;
  background: var(--common-shadow-2);
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  cursor: pointer;

  img {
    position: relative;
    overflow: hidden;
    aspect-ratio: 69/32;
    object-fit: cover;
    object-position: center;
    transition: all 0.3s linear;

    &:hover {
      transform: scale(1.2);
    }
  }

  .list-mode & {
    width: fit-content;
    height: 160px;
    border-radius: 4px 0 0 4px;
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

  .list-mode & {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }
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
  white-space: nowrap;

  .list-mode & {
    position: relative;
    overflow: hidden;
    width: 100%;
    flex-wrap: nowrap;
    opacity: 0;
    transition: opacity 0.15s ease;

    &.is-ready {
      opacity: 1;
    }

    :deep(.tag-label) {
      flex-shrink: 0;
    }
  }
}

.tpc-tags-more {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--box-bg-3);
  color: var(--box-text-5);
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.15s ease;
  user-select: none;

  &:hover {
    background: var(--box-bg-4);
  }

  &--hidden {
    opacity: 0;
    pointer-events: none;
  }
}

.tpc-tags-popup {
  z-index: 10;
  display: flex;
  max-width: 240px;
  flex-wrap: wrap;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--app-page-bg);
  box-shadow: 2px 2px 4px var(--common-shadow-2);
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

  .list-mode & {
    top: unset;
    right: unset;
    bottom: 0;
    left: 0;
    border-radius: 0 4px;
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

  &.love {
    color: var(--tgc-od-red);
  }

  &.collect {
    color: var(--tgc-od-orange);
  }
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
  cursor: pointer;
  font-size: 12px;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}
</style>
