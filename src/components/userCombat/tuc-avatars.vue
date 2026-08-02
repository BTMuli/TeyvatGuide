<!-- 剧诗角色列表 -->
<template>
  <div :class="{ grid: props.detail }" class="tuca-box">
    <TItemBox v-for="(item, idx) in props.modelValue" :key="idx" :model-value="getItemBox(item)" />
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import gameEnum from "@enum/game.js";
import { getRcStar, getWikiBrief, getZhElement } from "@utils/toolFunc.js";

type TucAvatarsProps = { modelValue: Array<TGApp.Game.Combat.Avatar>; detail: boolean };

const props = defineProps<TucAvatarsProps>();

function getItemBox(item: TGApp.Game.Combat.Avatar): TItemBoxData {
  const findAvatar = getWikiBrief(item.avatar_id);
  let findWeapon;
  if (findAvatar) {
    findWeapon = findAvatar.weapon;
  } else if (item.name === "旅行者") {
    findWeapon = "单手剑";
  }
  const avatarType = gameEnum.combat.avatarTypeDesc(item.avatar_type).replace("角色", "");
  return {
    bg: `/icon/bg/${getRcStar(item.avatar_id, item.rarity)}-BGC.webp`,
    clickable: false,
    display: "inner",
    height: "80px",
    icon: `/WIKI/character/${item.avatar_id}.webp`,
    innerHeight: 20,
    innerText: findAvatar ? findAvatar.name : item.name,
    lt:
      item.element === "None"
        ? findWeapon
          ? `/icon/weapon/${findWeapon}.webp`
          : ""
        : `/icon/element/${getZhElement(item.element)}元素.webp`,
    ltSize: "20px",
    innerBlur: "5px",
    rt: avatarType,
    rtSize: avatarType === "" ? "" : "20px",
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
  gap: 8px;

  &.grid {
    display: grid;
    width: 100%;
    gap: 8px;
    grid-template-columns: repeat(2, 1fr);
  }

  :deep(.tib-box) {
    filter: drop-shadow(0 2px 3px var(--common-shadow-1));
  }

  :deep(.tib-rt) {
    width: auto;
    min-width: 32px;
    padding: 0 5px;
    background: var(--tgc-od-red);
    font-size: 12px;
  }
}
</style>
