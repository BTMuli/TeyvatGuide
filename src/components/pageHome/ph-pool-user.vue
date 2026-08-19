<!-- 限时祈愿卡片组件（用户模式） -->
<template>
  <div ref="poolRef" class="ph-pool-user-card">
    <div class="ph-pool-header">
      <div class="ph-pool-title">
        <div class="ph-pool-type" title="查看卡池详情" @click="openPoolOverlay()">
          {{ props.pool.pool_name }}
        </div>
        <v-icon
          class="ph-pool-share"
          data-html2canvas-ignore
          size="12"
          title="分享卡池"
          @click.stop="sharePool()"
        >
          mdi-share-variant
        </v-icon>
      </div>
    </div>
    <div class="ph-pool-duration">
      <template v-if="restTs > durationTs">
        <span>未开始</span>
      </template>
      <template v-else>
        <span v-if="restTs > 0" data-html2canvas-ignore title="剩余时间">
          {{ stamp2LastTime(restTs) }}
        </span>
        <span v-else>已结束</span>
        <span title="卡池时间">{{ startTime }} ~ {{ endTime }}</span>
      </template>
    </div>
    <v-progress-linear :color="typeBg" :model-value="percent" :reverse="true" :rounded="true" />
    <div class="ph-pool-rewards">
      <template v-for="item in avatarItems" :key="`av-${item.avatar.id}`">
        <div
          :title="item.info?.name ?? item.avatar.name"
          class="ph-pool-reward"
          @click="toAvatar(item.avatar)"
        >
          <TItemBox v-if="item.info" :model-value="getBox(item.info)" :title="item.info.name" />
          <img v-else :src="item.avatar.icon" alt="icon" class="icon" />
        </div>
      </template>
      <template v-for="item in weaponItems" :key="`wp-${item.weapon.id}`">
        <div
          :title="item.info?.name ?? item.weapon.name"
          class="ph-pool-reward"
          @click="toWeapon(item.weapon)"
        >
          <TItemBox v-if="item.info" :model-value="getBox(item.info)" :title="item.info.name" />
          <img v-else :src="item.weapon.icon" alt="icon" class="icon" />
        </div>
      </template>
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
import TItemBox, { TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import TGShare from "@utils/TGShare.js";
import { getWikiBrief, stamp2LastTime, timestampToDate } from "@utils/toolFunc.js";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef } from "vue";

import PhPoolItemOverlay, {
  type PhPoolItemOverlayItem,
  type PhPoolItemOverlayPool,
} from "./ph-pool-item-overlay.vue";

type PhPoolUserProps = { pool: TGApp.Game.ActCalendar.ActPool };
type AvatarItem = {
  avatar: TGApp.Game.ActCalendar.ActPoolAvatar;
  info?: TGApp.App.Character.WikiBriefInfo;
};
type WeaponItem = {
  weapon: TGApp.Game.ActCalendar.ActPoolWeapon;
  info?: TGApp.App.Weapon.WikiBriefInfo;
};
type PhPoolDetail = {
  item?: PhPoolItemOverlayItem;
  pool: PhPoolItemOverlayPool;
  poolItemIds: Array<number>;
};

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;

const props = defineProps<PhPoolUserProps>();
const poolEl = useTemplateRef<HTMLDivElement>("poolRef");

const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const detail = shallowRef<PhPoolDetail>();
const detailShow = ref<boolean>(false);
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
const poolItemIds = computed<Array<number>>(() => [
  ...props.pool.avatars.map((avatar) => avatar.id),
  ...props.pool.weapon.map((weapon) => weapon.id),
]);
const poolItems = computed<Array<PhPoolItemOverlayItem>>(() => {
  const list: Array<PhPoolItemOverlayItem> = [];
  for (const item of avatarItems.value) {
    if (item.info !== undefined) {
      list.push({
        id: item.avatar.id,
        name: item.avatar.name,
        star: item.avatar.rarity,
        isCharacter: true,
        icon: item.avatar.icon,
      });
    }
  }
  for (const item of weaponItems.value) {
    if (item.info !== undefined) {
      list.push({
        id: item.weapon.id,
        name: item.weapon.name,
        star: item.weapon.rarity,
        isCharacter: false,
        icon: item.weapon.icon,
      });
    }
  }
  return list;
});
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
  if (info) {
    await openDetailOverlay({
      id: avatar.id,
      name: avatar.name,
      star: avatar.rarity,
      isCharacter: true,
      icon: avatar.icon,
    });
    return;
  }
  showSnackbar.warn(`${avatar.name} 角色图鉴暂未收录`);
}

async function toWeapon(weapon: TGApp.Game.ActCalendar.ActPoolWeapon): Promise<void> {
  const info = getWeaponInfo(weapon.id);
  if (info) {
    await openDetailOverlay({
      id: weapon.id,
      name: weapon.name,
      star: weapon.rarity,
      isCharacter: false,
      icon: weapon.icon,
    });
    return;
  }
  showSnackbar.warn(`${weapon.name} 武器图鉴暂未收录`);
}

/**
 * 分享当前卡池
 * @since Beta v0.11.4
 */
async function sharePool(): Promise<void> {
  if (!poolEl.value) return;
  await TGShare.modern(`限时祈愿_${props.pool.pool_name}`, poolEl.value, 2.5);
}

/**
 * 打开卡池详情浮窗
 * @since Beta v0.11.2
 */
async function openPoolOverlay(): Promise<void> {
  detail.value = {
    pool: {
      name: props.pool.pool_name,
      type: props.pool.pool_type,
      from: timestampToDate(Number(props.pool.start_timestamp) * 1000),
      to: timestampToDate(Number(props.pool.end_timestamp) * 1000),
    },
    poolItemIds: poolItemIds.value,
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

async function openDetailOverlay(item: PhPoolItemOverlayItem): Promise<void> {
  detail.value = {
    item,
    pool: {
      name: props.pool.pool_name,
      type: props.pool.pool_type,
      from: timestampToDate(Number(props.pool.start_timestamp) * 1000),
      to: timestampToDate(Number(props.pool.end_timestamp) * 1000),
    },
    poolItemIds: poolItemIds.value,
  };
  await nextTick();
  detailShow.value = true;
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

function getBox(
  info: TGApp.App.Character.WikiBriefInfo | TGApp.App.Weapon.WikiBriefInfo,
): TItemBoxData {
  const isCharacter = "element" in info;
  return {
    bg: `/icon/bg/${info.star}-Star.webp`,
    icon: `/WIKI/${isCharacter ? "character" : "weapon"}/${info.id}.webp`,
    size: "80px",
    height: "80px",
    display: "inner",
    clickable: true,
    lt: isCharacter ? `/icon/element/${info.element}元素.webp` : `/icon/weapon/${info.weapon}.webp`,
    ltSize: "20px",
    innerHeight: 24,
    innerBlur: "4px",
    innerIcon: isCharacter ? `/icon/weapon/${info.weapon}.webp` : undefined,
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

.ph-pool-title {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  column-gap: 4px;
}

.ph-pool-type {
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 14px;

  &:hover {
    color: var(--tgc-yellow-2);
  }
}

.ph-pool-share {
  flex-shrink: 0;
  color: var(--tgc-od-white);
  cursor: pointer;

  &:hover {
    color: var(--tgc-yellow-2);
  }
}

.ph-pool-duration {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  color: var(--box-text-2);
  column-gap: 4px;
  font-size: 12px;
  user-select: none;

  span:last-child {
    font-size: 10px;
    opacity: 0.6;
  }
}

.ph-pool-rewards {
  position: relative;
  display: flex;
  max-height: 168px;
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
  width: 80px;
  height: 80px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-2);
  cursor: pointer;

  .icon {
    width: 64px;
    height: 64px;
  }
}
</style>
