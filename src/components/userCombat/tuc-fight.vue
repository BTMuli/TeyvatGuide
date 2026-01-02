<template>
  <div class="tucfi-box">
    <div class="tucfi-label">
      <slot name="label">{{ props.label }}</slot>
    </div>
    <div v-if="!props.data">
      <span class="tucfi-data">暂无数据</span>
    </div>
    <div v-else-if="!Array.isArray(props.data)" class="tucfi-data">
      <TItemBox :model-value="getBox(props.data)" />
    </div>
    <div v-else class="tucfi-icons">
      <div v-for="(item, idx) in props.data" :key="idx" class="tucfi-icon">
        <TItemBox :model-value="getBox2(item)" />
      </div>
      <div v-if="props.data.length === 0" class="tucfi-data">暂无数据</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";

type TucFightProps = {
  label: string;
  data: TGApp.Game.Combat.AvatarMini | Array<TGApp.Game.Combat.AvatarMini> | null;
};

const props = defineProps<TucFightProps>();

function getBox(role: TGApp.Game.Combat.AvatarMini): TItemBoxData {
  return {
    bg: `/icon/bg/${role.rarity}-BGC.webp`,
    clickable: false,
    display: "inner",
    height: "60px",
    icon: `/WIKI/character/${role.avatar_id}.webp`,
    innerText: role.value,
    innerHeight: 20,
    innerBlur: "5px",
    lt: "",
    ltSize: "0",
    size: "60px",
  };
}

function getBox2(item: TGApp.Game.Combat.AvatarMini): TItemBoxData {
  return {
    bg: `/icon/bg/${item.rarity}-BGC.webp`,
    clickable: false,
    display: "inner",
    height: "60px",
    icon: `/WIKI/character/${item.avatar_id}.webp`,
    innerText: "",
    lt: "",
    ltSize: "0",
    size: "60px",
  };
}
</script>
<style lang="css" scoped>
.tucfi-box {
  display: flex;
  width: 100%;
  height: auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
  font-family: var(--font-title);
}

.tucfi-label {
  color: var(--box-text-4);
  font-size: 20px;
}

.tucfi-data {
  color: var(--box-text-8);
  font-size: 20px;
}

.tucfi-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}
</style>
