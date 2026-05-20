<!-- 限时祈愿卡片组件（用户模式） -->
<template>
  <div class="ph-pool-user-card">
    <div class="ph-pool-type">{{ props.pool.pool_name }}</div>
    <div class="ph-pool-cover" @click="toPool()">
      <img v-if="cover" :src="cover" alt="cover" />
      <img v-else alt="empty" class="empty" src="/UI/app/empty.webp" />
    </div>
    <div class="ph-pool-bottom">
      <div v-if="totalItems < 5" class="ph-pool-avatars">
        <template v-for="item in avatarItems" :key="`av-${item.avatar.id}`">
          <div class="ph-pool-icon" @click="toAvatar(item.avatar)">
            <TItemBox
              v-if="item.info"
              :model-value="getAvatarBox(item.info)"
              :title="item.info.name"
            />
            <img v-else :src="item.avatar.icon" alt="icon" />
          </div>
        </template>
        <template v-for="item in weaponItems" :key="`wp-${item.weapon.id}`">
          <div class="ph-pool-icon" @click="toWeapon(item.weapon)">
            <TItemBox
              v-if="item.info"
              :model-value="getWeaponBox(item.info)"
              :title="item.info.name"
            />
            <img v-else :src="item.weapon.icon" alt="icon" />
          </div>
        </template>
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
          v-for="item in avatarItems"
          :key="`av-${item.avatar.id}`"
          class="ph-pool-icon"
          @click="toAvatar(item.avatar)"
        >
          <TItemBox
            v-if="item.info"
            :model-value="getAvatarBox(item.info)"
            :title="item.info.name"
          />
          <img v-else :src="item.avatar.icon" alt="icon" />
        </SwiperSlide>
        <SwiperSlide
          v-for="item in weaponItems"
          :key="`wp-${item.weapon.id}`"
          class="ph-pool-icon"
          @click="toWeapon(item.weapon)"
        >
          <TItemBox
            v-if="item.info"
            :model-value="getWeaponBox(item.info)"
            :title="item.info.name"
          />
          <img v-else :src="item.weapon.icon" alt="icon" />
        </SwiperSlide>
      </Swiper>
      <div class="ph-pool-info">
        <div class="ph-pool-time">
          <v-icon>mdi-calendar-clock</v-icon>
          <span>{{ startTime }} ~ {{ endTime }}</span>
        </div>
        <v-progress-linear :model-value="percent" :rounded="true" color="var(--tgc-od-green)" />
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
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import TItemBox, { TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import postReq from "@req/postReq.js";
import useHomeStore from "@store/home.js";
import { parsePost } from "@utils/linkParser.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost } from "@utils/TGWindow.js";
import { getWikiBrief, stamp2LastTime, timestampToDate } from "@utils/toolFunc.js";
import { str2Color } from "@utils/colorFunc.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { storeToRefs } from "pinia";
import { A11y, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import gameEnum from "@enum/game.js";

type PhPoolUserProps = { pool: TGApp.Game.ActCalendar.ActPool };
type AvatarItem = {
  avatar: TGApp.Game.ActCalendar.ActPoolAvatar;
  info?: TGApp.App.Character.WikiBriefInfo;
};
type WeaponItem = {
  weapon: TGApp.Game.ActCalendar.ActPoolWeapon;
  info?: TGApp.App.Weapon.WikiBriefInfo;
};

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;

const swiperModules = [Autoplay, A11y];
const { poolCover } = storeToRefs(useHomeStore());
const router = useRouter();

const props = defineProps<PhPoolUserProps>();

const cover = ref<string>();
const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const totalItems = computed<number>(() => props.pool.avatars.length + props.pool.weapon.length);
const avatarItems = computed<Array<AvatarItem>>(() =>
  props.pool.avatars.map((av) => {
    const info = getAvatarInfo(av.id);
    return { avatar: av, info };
  }),
);
const weaponItems = computed<Array<WeaponItem>>(() =>
  props.pool.weapon.map((wp) => {
    const info = getWeaponInfo(wp.id);
    return { weapon: wp, info };
  }),
);
const percent = computed<number>(() => {
  if (restTs.value > durationTs.value) return 100;
  if (durationTs.value === 0) return 0;
  return (restTs.value * 100) / durationTs.value;
});
const startTime = computed<string>(() =>
  timestampToDate(Number(props.pool.start_timestamp) * 1000),
);
const endTime = computed<string>(() => timestampToDate(Number(props.pool.end_timestamp) * 1000));
const poolTypeLabel = computed<string>(() => {
  const poolTypeMap: Record<TGApp.Game.ActCalendar.PoolTypeEnum, string> = {
    [gameEnum.actCalendar.poolType.Avatar]: "角色活动祈愿",
    [gameEnum.actCalendar.poolType.Weapon]: "武器活动祈愿",
    [gameEnum.actCalendar.poolType.Mixed]: "集录祈愿",
  };
  return poolTypeMap[props.pool.pool_type] ?? "未知类型祈愿";
});
const typeBg = computed<string>(() =>
  str2Color(`${props.pool.pool_name}${poolTypeLabel.value}`, -60),
);

onMounted(async () => {
  await loadCover();
  endTs.value = Number(props.pool.end_timestamp) * 1000;
  restTs.value = endTs.value - Date.now();
  durationTs.value = endTs.value - Number(props.pool.start_timestamp) * 1000;
  if (restTs.value > 0) {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(handlePosition, 1000);
  }
});

async function loadCover(): Promise<void> {
  const jumpUrl = props.pool.jump_url;
  if (!jumpUrl || jumpUrl === "") return;
  const postIdStr = await parsePost(jumpUrl);
  if (postIdStr === false) return;
  const postId = Number(postIdStr);
  if (isNaN(postId)) return;
  if (poolCover.value && postId in poolCover.value && poolCover.value[postId] !== "") {
    cover.value = poolCover.value[postId];
    return;
  }
  let resp: TGApp.BBS.Post.FullResp | undefined;
  try {
    resp = await postReq.post(postId, {});
    if (resp.retcode !== 0) {
      showSnackbar.error(`[PhPoolUser][${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[PhPoolUser][${resp.retcode}] ${resp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取帖子封面失败：${errMsg}`);
    await TGLogger.Error("[PhPoolUser] 获取帖子封面异常");
    await TGLogger.Error(`[PhPoolUser] ${typeof e === "object" ? JSON.stringify(e) : e}`);
    return;
  }
  let coverGet: string | undefined;
  if (resp.data.post.cover) coverGet = resp.data.post.cover.url;
  else if (resp.data.post.post.cover && resp.data.post.post.cover !== "") {
    coverGet = resp.data.post.post.cover;
  } else if (resp.data.post.post.images.length > 0) {
    coverGet = resp.data.post.post.images[0];
  } else {
    coverGet = "";
  }
  cover.value = coverGet;
  if (!poolCover.value) poolCover.value = { [postId]: coverGet };
  else poolCover.value[postId] = coverGet;
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

async function toAvatar(avatar: TGApp.Game.ActCalendar.ActPoolAvatar): Promise<void> {
  const info = getAvatarInfo(avatar.id);
  if (!info) {
    showSnackbar.warn(`${avatar.name} 角色图鉴暂未收录`);
    return;
  }
  await router.push({ name: "角色图鉴", params: { id: avatar.id } });
}

async function toWeapon(weapon: TGApp.Game.ActCalendar.ActPoolWeapon): Promise<void> {
  const info = getWeaponInfo(weapon.id);
  if (!info) {
    showSnackbar.warn(`${weapon.name} 武器图鉴暂未收录`);
    return;
  }
  await router.push({ name: "武器图鉴", params: { id: weapon.id } });
}

function getAvatarInfo(id: number): TGApp.App.Character.WikiBriefInfo | undefined {
  const info = getWikiBrief(id);
  if (info === false) return undefined;
  if ("element" in info) return <TGApp.App.Character.WikiBriefInfo>info;
  return undefined;
}

function getWeaponInfo(id: number): TGApp.App.Weapon.WikiBriefInfo | undefined {
  const info = getWikiBrief(id);
  if (info === false) return undefined;
  if ("weapon" in info) return <TGApp.App.Weapon.WikiBriefInfo>info;
  return undefined;
}

function getAvatarBox(info: TGApp.App.Character.WikiBriefInfo): TItemBoxData {
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

function getWeaponBox(info: TGApp.App.Weapon.WikiBriefInfo): TItemBoxData {
  return {
    bg: `/icon/bg/${info.star}-Star.webp`,
    icon: `/WIKI/weapon/${info.id}.webp`,
    size: "60px",
    height: "60px",
    display: "inner",
    clickable: true,
    lt: `/icon/weapon/${info.weapon}.webp`,
    ltSize: "15px",
    innerHeight: 20,
    innerText: info.name,
  };
}

async function toPool(): Promise<void> {
  const jumpUrl = props.pool.jump_url;
  if (!jumpUrl || jumpUrl === "") {
    showSnackbar.warn("暂无跳转链接");
    return;
  }
  const postIdStr = await parsePost(jumpUrl);
  if (postIdStr !== false) {
    const postId = Number(postIdStr);
    if (!isNaN(postId)) {
      await createPost(postId, props.pool.pool_name);
      return;
    }
  }
  await openUrl(jumpUrl);
}
</script>
<style lang="scss" scoped>
.ph-pool-user-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: 4px;
  aspect-ratio: 69 / 32;
  box-shadow: 0 2px 4px var(--common-shadow-2);
}

.ph-pool-type {
  position: absolute;
  z-index: 10;
  top: 0;
  right: 0;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: v-bind(typeBg); /* stylelint-disable-line value-keyword-case */
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  box-shadow: 1px 1px 6px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  cursor: pointer;
  font-size: 13px;
  text-shadow: 0 0 4px var(--tgc-dark-1);
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
  background: var(--box-bg-1); /* stylelint-disable-line value-keyword-case */
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

    &:hover {
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
  text-shadow: 0 0 4px var(--tgc-dark-1);
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
