<template>
  <div class="tuca-box">
    <TItembox v-for="(item, idx) in props.modelValue" :key="idx" :model-value="getItemBox(item)" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import { getZhElement } from "../../utils/toolFunc.js";
import TItembox, { TItemBoxData } from "../app/t-item-box.vue";

interface TucAvatarsProps {
  modelValue: TGApp.Game.Combat.Avatar[];
}

const props = defineProps<TucAvatarsProps>();
const columnCnt = computed<number>(() => {
  if (props.modelValue.length % 2 === 1) return (props.modelValue.length + 1) / 2;
  return props.modelValue.length / 2;
});

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
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(v-bind(columnCnt), 1fr);
}
</style>
