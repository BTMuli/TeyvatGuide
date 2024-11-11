<template>
  <div class="tucfi-box">
    <div class="tucfi-label">
      <slot name="label">{{ props.label }}</slot>
    </div>
    <div v-if="!Array.isArray(props.data)" class="tucfi-data">
      <TItembox :model-value="getBox()" />
    </div>
    <div class="tucfi-icons" v-else>
      <div v-for="(item, idx) in props.data" :key="idx" class="tucfi-icon">
        <TItembox :model-value="getBox2(item)" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItembox, { TItemBoxData } from "../main/t-itembox.vue";

interface TucFightProps {
  label: string;
  data: TGApp.Game.Combat.AvatarMini | TGApp.Game.Combat.AvatarMini[];
}

const props = defineProps<TucFightProps>();

function getBox(): TItemBoxData {
  const role = <TGApp.Game.Combat.AvatarMini>props.data;
  return {
    bg: `/icon/bg/${role.rarity === 105 ? 5 : role.rarity}-BGC.webp`,
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
    bg: `/icon/bg/${item.rarity === 105 ? 5 : item.rarity}-BGC.webp`,
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
}

.tucfi-label {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 20px;
}

.tucfi-data {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 20px;
}

.tucfi-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}
</style>
