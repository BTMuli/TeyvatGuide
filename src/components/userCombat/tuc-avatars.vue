<template>
  <div class="tuca-box" :class="{ grid: props.detail }">
    <TItemBox v-for="(item, idx) in props.modelValue" :key="idx" :model-value="getItemBox(item)" />
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";

import { getZhElement } from "@/utils/toolFunc.js";

type TucAvatarsProps = { modelValue: Array<TGApp.Game.Combat.Avatar>; detail: boolean };

const props = defineProps<TucAvatarsProps>();

function getItemBox(item: TGApp.Game.Combat.Avatar): TItemBoxData {
  return {
    bg: `/icon/bg/${item.rarity === 105 ? 5 : item.rarity}-BGC.webp`,
    clickable: false,
    display: "inner",
    height: "80px",
    icon: `/WIKI/character/${item.avatar_id}.webp`,
    innerHeight: item.avatar_type !== 1 ? 20 : 0,
    innerText: item.avatar_type === 2 ? "试用角色" : item.avatar_type === 3 ? "助演角色" : "",
    lt: `/icon/element/${getZhElement(item.element)}元素.webp`,
    ltSize: "20px",
    innerBlur: "5px",
    rt: "",
    rtSize: "",
    size: "80px",
  };
}
</script>
<style lang="css" scoped>
.tuca-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;

  &.grid {
    display: grid;
    width: 100%;
    grid-gap: 10px;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
