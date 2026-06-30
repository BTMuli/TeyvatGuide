<!-- 背包武器物品项 -->
<template>
  <div
    :class="{ selected: props.selected, detail: props.detail }"
    :title="props.info.name"
    class="pb-wi-box"
    @click="toWeapon()"
  >
    <div class="pb-wi-left">
      <img :src="`/icon/bg/${props.info.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/WIKI/weapon/${props.info.id}.webp`" alt="icon" class="icon" />
    </div>
    <div class="pb-wi-right">
      <div class="pb-wi-name">{{ props.info.name }}</div>
      <div class="pb-wi-level">Lv.{{ props.tb.info.level }}</div>
    </div>
    <div class="pb-wi-extra">{{ props.info.weapon }}·{{ props.info.id }}</div>
    <div v-if="props.tb.info.affix_map" class="pb-wi-refine">精炼{{ getAffixLevel() }}</div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { computed, shallowRef, watch } from "vue";

import type { WeaponInfo } from "@/pages/common/PageBagWeapon.vue";

type PbWeaponItemProps = {
  tb: TGApp.Sqlite.UserBag.WeaponTable;
  info: TGApp.App.Weapon.WikiItem;
  cur?: WeaponInfo;
  selected: boolean;
  detail: boolean;
};

type PbWeaponItemEmits = (e: "select", v: WeaponInfo) => void;

const props = defineProps<PbWeaponItemProps>();
const emits = defineEmits<PbWeaponItemEmits>();

const item = shallowRef<TGApp.Sqlite.UserBag.WeaponTable>(props.tb);

function toWeapon(): void {
  emits("select", { guid: item.value.guid, tb: item.value, info: props.info });
  console.log(props.tb);
}

function getAffixLevel(): number {
  if (!props.tb.info.affix_map) return 1;
  const values = Object.values(props.tb.info.affix_map);
  return values.length > 0 ? values[0] + 1 : 1;
}

watch(
  () => props.cur,
  () => {
    if (props.cur && props.cur.tb.guid === props.tb.guid) {
      item.value = props.cur.tb;
    }
  },
);

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
      filter: unset;
    }
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
}

.pb-wi-right {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  flex-direction: column;
  justify-content: center;
  row-gap: 2px;
}

.pb-wi-name {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wi-level {
  color: var(--tgc-od-green);
  font-family: var(--font-title);
  font-size: 12px;
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
  line-height: 12px;
  text-align: center;
}
</style>
