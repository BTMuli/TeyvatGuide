<!-- 背包圣遗物物品项 -->
<template>
  <div class="pb-ri-box" @click="toRelic()">
    <div class="pb-ri-left">
      <img :src="`/icon/bg/${props.info.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/WIKI/relic/${props.info.icon}.webp`" alt="icon" class="icon" />
    </div>
    <div class="pb-ri-right">
      <div class="pb-ri-name">{{ props.info.name }}</div>
      <div class="pb-ri-level">Lv.{{ props.tb.info.level - 1 }}</div>
    </div>
    <div class="pb-ri-extra">{{ setInfo?.name ?? "未知套装" }}·{{ posLabel }}</div>
    <div v-if="props.tb.info.is_locked" class="pb-ri-locked">🔒</div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { computed, onMounted, shallowRef } from "vue";

import type { RelicInfo } from "@/pages/common/PageBagRelic.vue";
import { wrSet } from "@/data/index.js";

type PbRelicItemProps = {
  tb: TGApp.Sqlite.UserBag.RelicTable;
  info: TGApp.App.Relic.RelicMini;
};

type PbRelicItemEmits = (e: "select", v: RelicInfo) => void;

const props = defineProps<PbRelicItemProps>();
const emits = defineEmits<PbRelicItemEmits>();

const setInfo = shallowRef<TGApp.App.Relic.SetItem>();
const posLabel = computed<string>(() => {
  const names: Record<number, string> = {
    1: "生之花",
    2: "死之羽",
    3: "时之沙",
    4: "空之杯",
    5: "理之冠",
  };
  return names[props.info.pos] || "未知";
});

onMounted(() => {
  const findSet = wrSet.find((i) => i.id === props.info.set);
  if (findSet) setInfo.value = findSet;
});

function getStar(): number {
  const id = props.tb.id;
  if (id >= 500000 && id < 600000) return 1;
  if (id >= 510000 && id < 520000) return 2;
  if (id >= 520000 && id < 530000) return 3;
  if (id >= 530000 && id < 540000) return 4;
  if (id >= 540000) return 5;
  return 3;
}

function toRelic(): void {
  emits("select", { tb: props.tb, info: props.info, guid: props.tb.guid });
}

const idColor = computed<string>(() => getOdStarColor(getStar()));
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

$pb-ri-base: v-bind(idColor); /* stylelint-disable-line value-keyword-case */

.pb-ri-box {
  position: relative;
  display: flex;
  overflow: hidden;
  height: 52px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  border: 1px solid color-mix(in srgb, $pb-ri-base 20%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, $pb-ri-base 15%, transparent);
  column-gap: 8px;
  cursor: pointer;
}

.pb-ri-left {
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

.pb-ri-right {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  flex-direction: column;
  justify-content: center;
  row-gap: 2px;
}

.pb-ri-name {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-ri-level {
  color: var(--tgc-od-green);
  font-family: var(--font-title);
  font-size: 12px;
}

.pb-ri-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  color: $pb-ri-base;
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}

.pb-ri-locked {
  @include github-styles.github-tag-dark-gen($pb-ri-base);

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
