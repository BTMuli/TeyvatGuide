<template>
  <div class="ph-pool-card">
    <div class="ph-pool-cover" @click="toPool()">
      <TMiImg v-if="cover" :src="cover" alt="cover" :ori="true" />
      <img src="/source/UI/empty.webp" class="empty" v-else alt="empty" />
    </div>
    <div class="ph-pool-bottom">
      <div class="ph-pool-avatars">
        <div
          v-for="avatar in avatars"
          :key="avatar.url"
          class="ph-pool-icon"
          @click="toAvatar(avatar)"
        >
          <TItemBox
            v-if="avatar.info"
            :title="avatar.info.name"
            :model-value="getBox(avatar.info)"
          />
          <TMiImg v-else :src="avatar.icon" alt="icon" :ori="true" />
        </div>
      </div>
      <div class="ph-pool-info">
        <div class="ph-pool-time">
          <v-icon>mdi-calendar-clock</v-icon>
          <span>{{ props.pool.start_time }} ~ {{ props.pool.end_time }}</span>
        </div>
        <v-progress-linear color="var(--tgc-od-green)" :model-value="percent" :rounded="true" />
        <div v-if="restTs > durationTs" class="ph-pool-stat">未开始</div>
        <div v-else-if="restTs > 0" class="ph-pool-stat">
          剩余时间：{{ stamp2LastTime(restTs) }}
        </div>
        <div v-else class="ph-pool-stat">已结束</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { TItemBoxData } from "@comp/app/t-itemBox.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { AppCharacterData } from "@/data/index.js";
import { useHomeStore } from "@/store/modules/home.js";
import TGLogger from "@/utils/TGLogger.js";
import { createPost, createTGWindow } from "@/utils/TGWindow.js";
import { stamp2LastTime } from "@/utils/toolFunc.js";
import postReq from "@/web/request/postReq.js";

type PhPoolCardProps = { pool: TGApp.BBS.Obc.GachaItem };
type PhPoolAvatar = TGApp.BBS.Obc.GachaPool & { info?: TGApp.App.Character.WikiBriefInfo };

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;
const props = defineProps<PhPoolCardProps>();
const router = useRouter();
const { poolCover } = storeToRefs(useHomeStore());
const cover = ref<string>();
const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const avatars = shallowRef<Array<PhPoolAvatar>>([]);
const percent = computed<number>(() => {
  if (restTs.value > durationTs.value) return 100;
  return (restTs.value * 100) / durationTs.value;
});

onMounted(async () => {
  await loadCover();
  const avTmp: Array<PhPoolAvatar> = [];
  for (const av of props.pool.pool) {
    const contentId = av.url.match(/(?<=content\/)\d+/)?.[0];
    if (contentId) {
      const infoFind = AppCharacterData.find((a) => a.contentId.toString() === contentId);
      if (infoFind) {
        avTmp.push({ ...av, info: infoFind });
        continue;
      }
    }
    avTmp.push(av);
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
  const resp = await postReq.post(postId);
  if ("retcode" in resp) {
    showSnackbar.error(`[PhPoolCard][${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(`[PhPoolCard][${resp.retcode}] ${resp.message}`);
    return;
  }
  let coverGet;
  if (resp.cover) coverGet = resp.cover.url;
  else if (resp.post.cover && resp.post.cover !== "") coverGet = resp.post.cover;
  else if (resp.post.images.length > 0) coverGet = resp.post.images[0];
  else coverGet = "";
  cover.value = coverGet;
  if (!poolCover.value) poolCover.value = { [postId]: resp.post.cover };
  else poolCover.value[postId] = resp.post.cover;
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
    await router.push({ name: "角色图鉴", params: { id: avatar.info.id } });
    return;
  }
  const url = avatar.url;
  if (url === "") {
    showSnackbar.warn("链接为空!");
    return;
  }
  await createTGWindow(url, "Sub_window", `Pool_${props.pool.title}`, 1200, 800, true, true);
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
    ltSize: "15px",
    innerHeight: 20,
    innerIcon: `/icon/weapon/${info.weapon}.webp`,
    innerText: info.name,
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

  .empty {
    width: 64px;
    height: 64px;

    img {
      width: 100%;
      height: 100%;
    }
  }

  img {
    width: 100%;
    border-radius: 4px;
    transition: all 0.5s;
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
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.ph-pool-avatars {
  display: flex;
  overflow: hidden auto;
  width: auto;
  max-width: 280px;
  height: 60px;
  margin: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;

  &::-webkit-scrollbar-thumb {
    background: var(--common-shadow-t-4);
  }
}

.ph-pool-icon {
  width: 60px;
  height: 60px;
  transition: all ease-in-out 0.3s;

  &:hover {
    transform: scale(0.95);
    transition: all ease-in-out 0.3s;
  }

  img {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 4px;
    cursor: pointer;
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
