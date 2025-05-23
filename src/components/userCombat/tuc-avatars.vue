<template>
  <div class="tuca-box" :class="{ grid: props.detail }">
    <TItemBox v-for="(item, idx) in props.modelValue" :key="idx" :model-value="getItemBox(item)" />
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { getWikiBrief, getZhElement } from "@utils/toolFunc.js";

type TucAvatarsProps = { modelValue: Array<TGApp.Game.Combat.Avatar>; detail: boolean };

const props = defineProps<TucAvatarsProps>();

function getItemBox(item: TGApp.Game.Combat.Avatar): TItemBoxData {
  const findAvatar = getWikiBrief(item.avatar_id);
  let innerText = item.avatar_type === 2 ? "试用角色" : item.avatar_type === 3 ? "助演角色" : "";
  let findWeapon;
  if (findAvatar) {
    findWeapon = findAvatar.weapon;
    if (innerText === "") innerText = findAvatar.name;
  }
  return {
    bg: `/icon/bg/${item.rarity === 105 ? 5 : item.rarity}-BGC.webp`,
    clickable: false,
    display: "inner",
    height: "80px",
    icon: `/WIKI/character/${item.avatar_id}.webp`,
    innerHeight: innerText === "" ? 0 : 20,
    innerText: innerText,
    lt:
      item.element === "None"
        ? findWeapon
          ? `/icon/weapon/${findWeapon}.webp`
          : ""
        : `/icon/element/${getZhElement(item.element)}元素.webp`,
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
  gap: 4px;

  &.grid {
    display: grid;
    width: 100%;
    grid-gap: 4px;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
