<template>
  <div class="hta-tl-box">
    <div class="hta-tl-item">
      <TItemBox
        v-for="item in props.modelValue.Item.split(',')"
        :key="item"
        :model-value="getBoxData(Number(item))"
      />
    </div>
    <div class="hta-tl-rate">上场{{ props.modelValue.Rate }}次</div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";

import { AppCharacterData } from "@/data/index.js";

type HtaTeamLineProps = { modelValue: { Item: string; Rate: number } };
const props = defineProps<HtaTeamLineProps>();

function getBoxData(id: number): TItemBoxData {
  if ([10000005, 10000007].includes(id)) {
    return {
      bg: `/icon/bg/5-Star.webp`,
      clickable: false,
      display: "inner",
      height: "80px",
      icon: `/WIKI/character/${id}.webp`,
      innerHeight: 20,
      innerText: id === 10000005 ? "空" : "荧",
      lt: `/icon/weapon/单手剑.webp`,
      ltSize: "20px",
      size: "80px",
      innerBlur: "5px",
    };
  }
  const avatar = AppCharacterData.find((i) => i.id === id);
  return {
    bg: `/icon/bg/${avatar?.star ?? 5}-Star.webp`,
    clickable: false,
    display: "inner",
    height: "80px",
    icon: `/WIKI/character/${id}.webp`,
    innerHeight: 20,
    innerText: avatar?.name ?? "旅行者",
    lt:
      avatar === undefined
        ? ""
        : avatar.element !== ""
          ? `/icon/element/${avatar.element}元素.webp`
          : `/icon/weapon/${avatar.weapon}.webp`,
    ltSize: "20px",
    size: "80px",
    innerIcon: `/icon/weapon/${avatar?.weapon ?? "单手剑"}.webp`,
    innerBlur: "5px",
  };
}
</script>
<style lang="css" scoped>
.hta-tl-box {
  position: relative;
  display: flex;
  width: calc(100% - 20px);
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  margin: 10px;
  background: var(--box-bg-2);
}

.hta-tl-item {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.hta-tl-rate {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
}
</style>
