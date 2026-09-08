<!-- 背包武器物品项 -->
<template>
  <div
    :aria-label="`${props.info.name}，Lv.${props.tb.info.level}`"
    :aria-selected="props.selected"
    :class="{ selected: props.selected, detail: props.detail }"
    :title="props.info.name"
    class="pb-wi-box"
    role="option"
    tabindex="0"
    @click="toWeapon"
    @keydown="handleKeydown"
  >
    <div class="pb-wi-left">
      <img :src="`/icon/bg/${props.info.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/WIKI/weapon/${props.info.id}.webp`" alt="icon" class="icon" />
      <img :src="`/icon/weapon/${props.info.weapon}.webp`" alt="weapon" class="weapon" />
      <div v-if="props.avatarId !== undefined" class="pb-wi-avatar">
        <img
          v-if="avatarStar !== undefined"
          :src="`/icon/bg/${avatarStar}-Star.webp`"
          alt="star"
          class="pb-wi-avatar-bg"
        />
        <img
          :src="`/WIKI/character/${props.avatarId}.webp`"
          alt="avatar"
          class="pb-wi-avatar-icon"
        />
      </div>
    </div>
    <div class="pb-wi-right">
      <div class="pb-wi-name">{{ props.info.name }}</div>
      <div class="pb-wi-sub">
        <span class="pb-wi-level">Lv.{{ props.tb.info.level }}</span>
        <span v-if="props.tb.info.is_locked" class="pb-wi-lock">🔒</span>
      </div>
    </div>
    <div class="pb-wi-extra">{{ props.info.weapon }}·{{ props.info.id }}</div>
    <div v-if="props.tb.info.affix_map" class="pb-wi-refine">精炼{{ getAffixLevel() }}</div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { getWeaponRefineLevel } from "@utils/userBagGroup.js";
import { computed } from "vue";

import { AppCharacterData } from "@/data/index.js";

type PbWeaponItemProps = {
  tb: TGApp.Sqlite.UserBag.WeaponTable;
  info: TGApp.App.Weapon.WikiItem;
  /** 兼容单件视图的旧入参，实例内容始终以 tb/info 为准。 */
  cur?: TGApp.App.UserBag.WeaponItem;
  selected: boolean;
  detail: boolean;
  avatarId?: number;
};

type PbWeaponItemEmits = { select: [v: TGApp.App.UserBag.WeaponItem] };

const props = defineProps<PbWeaponItemProps>();
const emits = defineEmits<PbWeaponItemEmits>();

const characterStarMap = new Map<number, number>(
  AppCharacterData.map((character) => [character.id, character.star]),
);
const avatarStar = computed<number | undefined>(() =>
  props.avatarId === undefined ? undefined : characterStarMap.get(props.avatarId),
);
const weaponItem = computed<TGApp.App.UserBag.WeaponItem>(() => ({
  guid: props.tb.guid,
  tb: props.tb,
  info: props.info,
}));

function toWeapon(): void {
  emits("select", weaponItem.value);
}

function getAffixLevel(): number {
  return getWeaponRefineLevel(weaponItem.value);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toWeapon();
}

const idColor = computed<string>(() => getOdStarColor(props.info.star));
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

$pb-wi-base: v-bind(idColor); /* stylelint-disable-line value-keyword-case */

.pb-wi-box {
  position: relative;
  display: flex;
  overflow: hidden;
  height: 56px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  border: 1px solid color-mix(in srgb, $pb-wi-base 20%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, $pb-wi-base 15%, transparent);
  column-gap: 8px;
  cursor: pointer;

  &.detail {
    filter: grayscale(0.75);

    &.selected {
      border: 2px solid var(--tgc-od-blue);
      background: var(--box-bg-4);
      filter: unset;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: 2px;
  }
}

.pb-wi-left {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  aspect-ratio: 1;

  .bg,
  .icon {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    vertical-align: center;
  }

  .bg {
    z-index: 0;
  }

  .icon {
    z-index: 1;
  }

  .weapon {
    position: absolute;
    z-index: 2;
    top: 0;
    left: 0;
    width: 16px;
    height: 16px;
  }
}

.pb-wi-right {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  flex-direction: column;
  justify-content: center;
}

.pb-wi-name {
  overflow: hidden;
  color: var(--box-text-2);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wi-sub {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
}

.pb-wi-level {
  color: var(--tgc-od-green);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
}

.pb-wi-lock {
  font-size: 10px;
}

.pb-wi-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  color: $pb-wi-base;
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}

.pb-wi-avatar {
  position: absolute;
  z-index: 3;
  right: 0;
  bottom: 0;
  overflow: hidden;
  width: 24px;
  height: 24px;
  border-radius: 4px 0 0;
  box-shadow: -1px -1px 4px var(--common-shadow-2);

  &-bg,
  &-icon {
    position: absolute;
    width: 100%;
    height: 100%;
  }
}

.pb-wi-refine {
  @include github-styles.github-tag-dark-gen($pb-wi-base);

  position: absolute;
  top: 0;
  right: 0;
  box-sizing: border-box;
  padding-right: 4px;
  padding-left: 12px;
  border-top: unset;
  border-right: unset;
  border-bottom-left-radius: 12px;
  font-family: var(--font-title);
  font-size: 10px;
  font-weight: normal;
  line-height: 12px;
  text-align: center;
}
</style>
