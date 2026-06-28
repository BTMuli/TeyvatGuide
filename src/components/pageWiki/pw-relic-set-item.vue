<!-- WIKI 圣遗物套装项 -->
<template>
  <div :class="{ selected: props.selected }" :title="props.set.name" class="pw-rsi-box">
    <div class="pw-rsi-left">
      <img :src="`/icon/bg/${maxStar}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/WIKI/relic/${props.set.icon}.webp`" alt="icon" class="icon" />
    </div>
    <div class="pw-rsi-right">{{ props.set.name }}</div>
    <div class="pw-rsi-extra">
      <img v-for="i in props.set.pos" :key="i" :src="`/icon/relic/${i}.webp`" alt="" />
      <span>·{{ props.set.id }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { getOdStarColor } from "@utils/colorFunc.js";

type PwRelicSetItemProps = {
  set: TGApp.App.Relic.SetItem;
  selected: boolean | undefined;
};
const props = defineProps<PwRelicSetItemProps>();

const maxStar = computed<number>(() => Math.max(...props.set.suits.map((i) => i.star)));
const idColor = computed<string>(() => getOdStarColor(maxStar.value));
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

$pw-rsi-base: v-bind(idColor); /* stylelint-disable value-keyword-case */

.pw-rsi-box {
  position: relative;
  display: flex;
  overflow: hidden;
  height: 48px;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  border: 1px solid color-mix(in srgb, $pw-rsi-base 20%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, $pw-rsi-base 15%, transparent);
  column-gap: 4px;
  cursor: pointer;

  &.selected {
    background: var(--box-bg-2);
  }
}

.pw-rsi-left {
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
  }
}

.pw-rsi-right {
  position: relative;
  overflow: hidden;
  max-width: 100%;
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.pw-rsi-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;

  img {
    width: 12px;
    height: 12px;
    filter: invert(0.25);

    .dark & {
      filter: unset;
    }
  }

  span {
    color: $pw-rsi-base;
    font-size: 8px;
    font-style: italic;
  }
}
</style>
