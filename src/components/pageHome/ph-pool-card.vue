<template>
  <div class="ph-pool-card">
    <div class="ph-pool-title" :title="props.pool.title" @click="openPoolOverlay()">
      {{ props.pool.title }}
    </div>
    <div class="ph-pool-cover" @click="toPool()">
      <img v-if="cover" :src="cover" alt="cover" />
      <img v-else alt="empty" class="empty" src="/UI/app/empty.webp" />
    </div>
    <div class="ph-pool-bottom">
      <div v-if="avatars.length < 5" class="ph-pool-avatars">
        <div
          v-for="avatar in avatars"
          :key="avatar.url"
          class="ph-pool-icon"
          @click="toAvatar(avatar)"
        >
          <TItemBox
            v-if="avatar.info"
            :model-value="getBox(avatar.info)"
            :title="avatar.info.name"
          />
          <img v-else :src="avatar.icon" alt="icon" />
        </div>
      </div>
      <Swiper
        v-else
        :autoplay="{ delay: 1000, disableOnInteraction: false, stopOnLastSlide: false }"
        :centered-slides="false"
        :loop="true"
        :modules="swiperModules"
        :navigation="true"
        :slides-per-view="4"
        :space-between="8"
        class="ph-pool-avatars swiper"
      >
        <SwiperSlide
          v-for="avatar in avatars"
          :key="avatar.url"
          class="ph-pool-icon"
          @click="toAvatar(avatar)"
        >
          <TItemBox
            v-if="avatar.info"
            :model-value="getBox(avatar.info)"
            :title="avatar.info.name"
          />
          <img v-else :src="avatar.icon" alt="icon" />
        </SwiperSlide>
      </Swiper>
      <div class="ph-pool-info">
        <div class="ph-pool-time">
          <v-icon>mdi-calendar-clock</v-icon>
          <span>{{ props.pool.start_time }} ~ {{ props.pool.end_time }}</span>
        </div>
        <v-progress-linear
          :reverse="true"
          :model-value="percent"
          :rounded="true"
          color="var(--tgc-od-green)"
        />
        <div v-if="restTs > durationTs" class="ph-pool-stat">未开始</div>
        <div v-else-if="restTs > 0" class="ph-pool-stat">
          剩余时间：{{ fmtUtil.remainingTime(restTs) }}
        </div>
        <div v-else class="ph-pool-stat">已结束</div>
      </div>
    </div>
  </div>
  <PhPoolItemOverlay
    v-if="detail"
    v-model="detailShow"
    :item="detail.item"
    :items="poolItems"
    :pool="detail.pool"
    :pool-item-ids="detail.poolItemIds"
    @switch-item="handleSwitchItem"
  />
</template>
<script lang="ts" setup>
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import TItemBox, { TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import postReq from "@req/postReq.js";
import useHomeStore from "@store/home.js";
import { str2Color } from "@utils/colorFunc.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost, createTGWindow } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { A11y, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";

import PhPoolItemOverlay, {
  type PhPoolItemOverlayItem,
  type PhPoolItemOverlayPool,
} from "./ph-pool-item-overlay.vue";

import { AppCharacterData } from "@/data/index.js";

type PhPoolCardProps = { pool: TGApp.BBS.Obc.GachaItem };
type PhPoolAvatar = TGApp.BBS.Obc.GachaPool & { info?: TGApp.App.Character.WikiBriefInfo };
type PhPoolDetail = {
  item?: PhPoolItemOverlayItem;
  pool: PhPoolItemOverlayPool;
  poolItemIds?: Array<number>;
};

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;

const swiperModules = [Autoplay, A11y];
const { poolCover } = storeToRefs(useHomeStore());

const props = defineProps<PhPoolCardProps>();

const cover = ref<string>();
const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const avatars = shallowRef<Array<PhPoolAvatar>>([]);
const detail = shallowRef<PhPoolDetail>();
const detailShow = ref<boolean>(false);
const poolTitleBg = computed<string>(() =>
  str2Color(`${props.pool.title}${props.pool.activity_url}`, 0),
);
const percent = computed<number>(() => {
  if (restTs.value > durationTs.value) return 100;
  return (restTs.value * 100) / durationTs.value;
});
const poolItems = computed<Array<PhPoolItemOverlayItem>>(() => {
  const list: Array<PhPoolItemOverlayItem> = [];
  for (const avatar of avatars.value) {
    if (avatar.info !== undefined) {
      list.push({
        id: avatar.info.id,
        name: avatar.info.name,
        star: avatar.info.star,
        isCharacter: true,
        icon: `/WIKI/character/${avatar.info.id}.webp`,
      });
    }
  }
  return list;
});

onMounted(async () => {
  await loadCover();
  const avTmp: Array<PhPoolAvatar> = [];
  for (const av of props.pool.pool) {
    const contentId = av.url.match(/(?<=content\/)\d+/)?.[0];
    const infoFind = contentId
      ? AppCharacterData.find((a) => a.contentId.toString() === contentId)
      : undefined;
    avTmp.push({ ...av, info: infoFind });
  }
  avatars.value = avTmp;
  endTs.value = new Date(props.pool.end_time).getTime();
  restTs.value = endTs.value - Date.now();
  durationTs.value = endTs.value - new Date(props.pool.start_time).getTime();
  if (restTs.value > 0) {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(handlePosition, 1000);
  }
});

async function loadCover(): Promise<void> {
  const postId: number | undefined = Number(props.pool.activity_url.split("/").pop()) || undefined;
  if (postId === undefined || isNaN(postId)) return;
  if (poolCover.value && postId in poolCover.value && poolCover.value[postId] !== "") {
    cover.value = poolCover.value[postId];
    return;
  }
  let resp: TGApp.BBS.Post.FullResp | undefined;
  try {
    resp = await postReq.post(postId, {});
    if (resp.retcode !== 0) {
      showSnackbar.error(`[PhPoolCard][${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[PhPoolCard][${resp.retcode}] ${resp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取帖子封面失败：${errMsg}`);
    await TGLogger.Error(`[PhPoolCard] 获取帖子封面异常`);
    await TGLogger.Error(`[PhPoolCard] ${e}`);
    return;
  }
  let coverGet;
  if (resp.data.post.cover) coverGet = resp.data.post.cover.url;
  else if (resp.data.post.post.cover && resp.data.post.post.cover !== "") {
    coverGet = resp.data.post.post.cover;
  } else if (resp.data.post.post.images.length > 0) coverGet = resp.data.post.post.images[0];
  else coverGet = "";
  cover.value = coverGet;
  if (!poolCover.value) poolCover.value = { [postId]: resp.data.post.post.cover };
  else poolCover.value[postId] = resp.data.post.post.cover;
}

function handlePosition(): void {
  if (restTs.value < 1) {
    if (timer !== null) clearInterval(timer);
    timer = null;
    restTs.value = 0;
    return;
  }
  restTs.value = endTs.value - Date.now();
}

async function toAvatar(avatar: PhPoolAvatar): Promise<void> {
  if (avatar.info !== undefined) {
    await openDetailOverlay(avatar.info);
    return;
  }
  const url = avatar.url;
  if (url === "") {
    showSnackbar.warn("链接为空!");
    return;
  }
  await createTGWindow(url, "Sub_window", `Pool_${props.pool.title}`, 1200, 800, true, true);
}

async function openDetailOverlay(info: TGApp.App.Character.WikiBriefInfo): Promise<void> {
  detail.value = {
    item: {
      id: info.id,
      name: info.name,
      star: info.star,
      isCharacter: true,
      icon: `/WIKI/character/${info.id}.webp`,
    },
    pool: {
      name: props.pool.title,
      from: props.pool.start_time,
      to: props.pool.end_time,
      postId: getPostId(props.pool.activity_url),
    },
    poolItemIds: getPoolItemIds(),
  };
  await nextTick();
  detailShow.value = true;
}

/**
 * 打开卡池详情浮窗
 * @since Beta v0.11.2
 */
async function openPoolOverlay(): Promise<void> {
  detail.value = {
    pool: {
      name: props.pool.title,
      from: props.pool.start_time,
      to: props.pool.end_time,
      postId: getPostId(props.pool.activity_url),
    },
    poolItemIds: getPoolItemIds(),
  };
  await nextTick();
  detailShow.value = true;
}

/**
 * 切换当前UP物品
 * @since Beta v0.11.2
 * @param item - 目标物品
 */
function handleSwitchItem(item: PhPoolItemOverlayItem): void {
  const current = detail.value;
  if (current === undefined) return;
  detail.value = { ...current, item };
}

function getPoolItemIds(): Array<number> {
  const ids: Array<number> = [];
  for (const avatar of avatars.value) {
    if (avatar.info !== undefined) ids.push(avatar.info.id);
  }
  return ids;
}

function getPostId(url: string): string | undefined {
  const postId = Number(url.split("/").pop());
  if (isNaN(postId)) return undefined;
  return postId.toString();
}

function getBox(info: TGApp.App.Character.WikiBriefInfo): TItemBoxData {
  return {
    bg: `/icon/bg/${info.star}-Star.webp`,
    icon: `/WIKI/character/${info.id}.webp`,
    size: "60px",
    height: "60px",
    display: "inner",
    clickable: true,
    lt: `/icon/element/${info.element}元素.webp`,
    ltSize: "14px",
    innerHeight: 0,
    innerText: "",
  };
}

async function toPool(): Promise<void> {
  const postId = Number(props.pool.activity_url.split("/").pop());
  if (isNaN(postId)) {
    showSnackbar.error(`未知的活动链接:${props.pool.activity_url}`);
    return;
  }
  await createPost(postId, props.pool.title);
}
</script>
<style lang="scss" scoped>
.ph-pool-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: 4px;
  aspect-ratio: 69 / 32;
  box-shadow: 0 2px 4px var(--common-shadow-2);
}

.ph-pool-title {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  max-width: 60%;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: v-bind(poolTitleBg); /* stylelint-disable-line value-keyword-case */
  border-bottom-right-radius: 4px;
  border-top-left-radius: 4px;
  box-shadow: -2px -2px 8px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 14px;
  text-overflow: ellipsis;
  text-shadow: 0 0 4px var(--tgc-dark-1);
  white-space: nowrap;
}

.ph-pool-icon {
  width: 60px;
  height: 60px;

  img {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 4px;
    cursor: pointer;
  }
}

.ph-pool-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;

  img {
    width: 100%;
    border-radius: 4px;
    transition: all 0.5s;
  }

  .empty {
    width: 64px;
    height: 64px;

    img {
      width: 100%;
      height: 100%;
    }
  }

  &:hover {
    img {
      transform: scale(1.1);
      transition: all 0.5s;
    }
  }
}

.ph-pool-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 -2px 10px var(--common-shadow-2);
}

.ph-pool-avatars {
  position: relative;
  display: flex;
  width: auto;
  max-width: 280px;
  height: 60px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  margin: 8px;
  gap: 8px;

  &.swiper {
    width: 280px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--common-shadow-t-4);
  }
}

.ph-pool-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-right: 10px;
  color: var(--tgc-white-1);
  font-size: 12px;
  gap: 8px;
  text-align: left;
}

.ph-pool-time {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;

  :first-child {
    color: var(--tgc-od-orange);
  }
}

.ph-pool-stat {
  margin-left: auto;
}
</style>
