<!-- 限时祈愿卡片组件（用户模式） -->
<template>
  <div class="ph-pool-user-card">
    <div class="ph-pool-header">
      <div class="ph-pool-type">{{ props.pool.pool_name }}</div>
      <div class="ph-pool-stat">
        <span v-if="restTs > durationTs">未开始</span>
        <span v-else-if="restTs > 0">{{ stamp2LastTime(restTs) }}</span>
        <span v-else>已结束</span>
      </div>
    </div>
    <div class="ph-pool-duration">
      <v-icon color="var(--tgc-od-orange)" size="12">mdi-calendar-clock</v-icon>
      <span>{{ startTime }} ~ {{ endTime }}</span>
    </div>
    <v-progress-linear :reverse="true" :color="typeBg" :model-value="percent" :rounded="true" />
    <div class="ph-pool-rewards">
      <template v-for="item in avatarItems" :key="`av-${item.avatar.id}`">
        <div
          :title="item.info?.name ?? item.avatar.name"
          class="ph-pool-reward"
          @click="toAvatar(item.avatar)"
        >
          <TItemBox
            v-if="item.info"
            :model-value="getAvatarBox(item.info)"
            :title="item.info.name"
          />
          <img v-else :src="item.avatar.icon" alt="icon" class="icon" />
        </div>
      </template>
      <template v-for="item in weaponItems" :key="`wp-${item.weapon.id}`">
        <div
          :title="item.info?.name ?? item.weapon.name"
          class="ph-pool-reward"
          @click="toWeapon(item.weapon)"
        >
          <TItemBox
            v-if="item.info"
            :model-value="getWeaponBox(item.info)"
            :title="item.info.name"
          />
          <img v-else :src="item.weapon.icon" alt="icon" class="icon" />
        </div>
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { getWikiBrief, stamp2LastTime, timestampToDate } from "@utils/toolFunc.js";
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

const router = useRouter();

const props = defineProps<PhPoolUserProps>();

const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
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
const typeBg = computed<string>(() => {
  const poolTypeMap: Record<TGApp.Game.ActCalendar.PoolTypeEnum, string> = {
    [gameEnum.actCalendar.poolType.Avatar]: "var(--tgc-od-red)",
    [gameEnum.actCalendar.poolType.Weapon]: "var(--tgc-od-green)",
    [gameEnum.actCalendar.poolType.Mixed]: "var(--tgc-od-purple)",
  };
  return poolTypeMap[props.pool.pool_type] ?? "未知类型祈愿";
});

onMounted(() => {
  endTs.value = Number(props.pool.end_timestamp) * 1000;
  restTs.value = endTs.value - Date.now();
  durationTs.value = endTs.value - Number(props.pool.start_timestamp) * 1000;
  if (restTs.value > 0) {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(handlePosition, 1000);
  }
});

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
    size: "64px",
    height: "64px",
    display: "inner",
    clickable: true,
    lt: `/icon/element/${info.element}元素.webp`,
    ltSize: "12px",
    innerHeight: 14,
    innerIcon: `/icon/weapon/${info.weapon}.webp`,
    innerText: info.name,
  };
}

function getWeaponBox(info: TGApp.App.Weapon.WikiBriefInfo): TItemBoxData {
  return {
    bg: `/icon/bg/${info.star}-Star.webp`,
    icon: `/WIKI/weapon/${info.id}.webp`,
    size: "64px",
    height: "64px",
    display: "inner",
    clickable: true,
    lt: `/icon/weapon/${info.weapon}.webp`,
    ltSize: "12px",
    innerHeight: 14,
    innerText: info.name,
  };
}
</script>
<style lang="scss" scoped>
.ph-pool-user-card {
  position: relative;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  row-gap: 4px;
}

.ph-pool-header {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  column-gap: 8px;
}

.ph-pool-type {
  font-family: var(--font-title);
  font-size: 14px;
}

.ph-pool-stat {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--tgc-white-1);
  font-size: 11px;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}

.ph-pool-duration {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-2);
  column-gap: 4px;
  font-size: 12px;

  span:last-child {
    font-size: 10px;
    opacity: 0.7;
  }
}

.ph-pool-rewards {
  position: relative;
  display: flex;
  max-height: 140px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-y: auto;
}

.ph-pool-reward {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 64px;
  height: 64px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: var(--box-bg-2);
  cursor: pointer;
}
</style>
