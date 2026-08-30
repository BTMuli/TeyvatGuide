<!-- 剧诗角色列表 -->
<template>
  <div class="tuca-box">
    <div class="tuca-title">
      <span class="main">出战角色</span>
      <span class="sub">{{ props.modelValue.length }}名</span>
    </div>
    <div class="tuca-content">
      <div class="tuca-row">
        <TItemBox v-for="item in firstRow" :key="item.avatar_id" :model-value="getItemBox(item)" />
      </div>
      <div class="tuca-row">
        <TItemBox v-for="item in secondRow" :key="item.avatar_id" :model-value="getItemBox(item)" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import gameEnum from "@enum/game.js";
import { getRcStar, getWikiBrief, getZhElement } from "@utils/toolFunc.js";
import { computed } from "vue";

type TucAvatarsProps = { modelValue: Array<TGApp.Game.Combat.Avatar> };

const props = defineProps<TucAvatarsProps>();
const firstRow = computed<Array<TGApp.Game.Combat.Avatar>>(() => {
  const splitIndex = Math.floor(props.modelValue.length / 2);
  return props.modelValue.slice(0, splitIndex);
});
const secondRow = computed<Array<TGApp.Game.Combat.Avatar>>(() => {
  const splitIndex = Math.floor(props.modelValue.length / 2);
  return props.modelValue.slice(splitIndex);
});

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
<style lang="scss" scoped>
.tuca-box {
  position: relative;
  display: flex;
  width: 100%;
  height: fit-content;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 2px 6px var(--common-shadow-1);
  row-gap: 12px;
}

.tuca-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  column-gap: 8px;

  .main {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }

  .sub {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
  }
}

.tuca-content {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 8px;
}

.tuca-row {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
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
</style>
