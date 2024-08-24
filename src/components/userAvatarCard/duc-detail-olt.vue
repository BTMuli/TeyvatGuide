<template>
  <div class="ddo-lt-box">
    <div class="ddo-ltb-icon" :title="props.data.name">
      <TItemBox :model-value="boxData" />
    </div>
    <div class="ddo-ltb-info">
      <span>{{ props.data.name }}</span>
      <span>Lv.{{ props.data.level }}</span>
      <span>{{ info }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import { getZhElement } from "../../utils/toolFunc.js";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

type DucDetailOltProps =
  | {
      data: TGApp.Game.Avatar.Avatar;
      mode: "avatar";
    }
  | {
      data: TGApp.Game.Avatar.WeaponDetail;
      mode: "weapon";
    };

const props = defineProps<DucDetailOltProps>();
const boxData = computed<TItemBoxData>(() => {
  if (props.mode === "avatar") {
    const avatar = <TGApp.Game.Avatar.Avatar>props.data;
    return {
      bg: `/icon/bg/${avatar.rarity}-Star.webp`,
      icon: `/WIKI/character/${avatar.id}.webp`,
      size: "100px",
      height: "100px",
      display: "inner",
      innerHeight: 0,
      innerText: "",
      clickable: false,
      lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
      ltSize: "30px",
    };
  } else {
    const weapon = <TGApp.Game.Avatar.WeaponDetail>props.data;
    return {
      bg: `/icon/bg/${weapon.rarity}-Star.webp`,
      icon: `/WIKI/weapon/${weapon.id}.webp`,
      size: "100px",
      height: "100px",
      display: "inner",
      innerHeight: 0,
      innerText: "",
      clickable: false,
      lt: `/icon/weapon/${weapon.type_name}.webp`,
      ltSize: "30px",
    };
  }
});
const info = computed(() => {
  if (props.mode === "avatar") {
    const avatar = <TGApp.Game.Avatar.Avatar>props.data;
    return `好感 ${avatar.fetter}`;
  } else {
    const weapon = <TGApp.Game.Avatar.WeaponDetail>props.data;
    return `精炼 ${weapon.affix_level}`;
  }
});
</script>
<style lang="css" scoped>
.ddo-lt-box {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 10px;
}

.ddo-ltb-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  color: var(--tgc-white-1);
  text-align: left;
}

.ddo-ltb-info :nth-child(1) {
  margin-bottom: 10px;
  font-family: var(--font-title);
  font-size: 20px;
}

.ddo-ltb-info :not(:nth-child(1)) {
  font-family: var(--font-text);
  font-size: 16px;
  opacity: 0.8;
}
</style>
