<!-- 背包圣遗物物品项 -->
<template>
  <div
    :class="{ selected: props.selected, detail: props.detail }"
    :style="{
      backgroundImage: `url('/icon/bg/${props.info.star}-Star.webp')`,
      backgroundSize: 'cover',
    }"
    :title="props.info.name"
    class="pb-ri-box"
    @click="toRelic()"
  >
    <img :src="`/WIKI/relic/${props.info.icon}.webp`" alt="icon" class="pb-ri-icon" />
    <img :src="`/icon/relic/${props.info.pos}.webp`" alt="pos" class="pb-ri-pos" />
    <div v-if="props.tb.info.is_locked || props.tb.info.is_marked" class="pb-ri-sign">
      <span v-if="props.tb.info.is_locked">🔒</span>
      <span v-if="props.tb.info.is_marked">⭐</span>
    </div>
    <div class="pb-ri-level">Lv.{{ props.tb.info.level - 1 }}</div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { computed, onMounted, shallowRef } from "vue";

import type { RelicInfo } from "@/pages/common/PageBagRelic.vue";
import { wrSet } from "@/data/index.js";

type PbRelicItemProps = {
  selected: boolean;
  detail: boolean;
  tb: TGApp.Sqlite.UserBag.RelicTable;
  info: TGApp.App.Relic.RelicMini;
};

type PbRelicItemEmits = (e: "select", v: RelicInfo) => void;

const props = defineProps<PbRelicItemProps>();
const emits = defineEmits<PbRelicItemEmits>();

const setInfo = shallowRef<TGApp.App.Relic.SetItem>();

onMounted(() => {
  const findSet = wrSet.find((i) => i.id === props.info.set);
  if (findSet) setInfo.value = findSet;
});

function toRelic(): void {
  emits("select", { tb: props.tb, info: props.info, guid: props.tb.guid });
}

const idColor = computed<string>(() => getOdStarColor(props.info.star));
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

$pb-ri-base: v-bind(idColor); /* stylelint-disable-line value-keyword-case */

.pb-ri-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  aspect-ratio: 1;
  column-gap: 8px;
  cursor: pointer;

  &.detail {
    filter: grayscale(0.75);

    &.selected {
      filter: unset;
    }
  }
}

.pb-ri-icon {
  position: relative;
  width: 100%;
  height: 100%;
}

.pb-ri-pos {
  position: absolute;
  z-index: 1;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
}

.pb-ri-level {
  position: absolute;
  z-index: 2;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  background: var(--common-shadow-t-2);
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 12px;
  vertical-align: center;
}

.pb-ri-sign {
  @include github-styles.github-tag-dark-gen($pb-ri-base);

  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding-right: 4px;
  padding-left: 8px;
  border-top: unset;
  border-right: unset;
  backdrop-filter: blur(4px);
  border-bottom-left-radius: 12px;
  font-family: var(--font-title);
  font-size: 10px;
  line-height: 12px;
  text-align: center;
}
</style>
