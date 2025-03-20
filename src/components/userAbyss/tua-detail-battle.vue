<template>
  <div class="tud-db-box">
    <div class="tud-db-time">{{ props.title }} {{ props.modelValue.time }}</div>
    <div class="tud-db-icons-grid">
      <TItemBox
        v-for="avatar in props.modelValue.characters"
        :key="avatar.id"
        :model-value="getBoxData(avatar)"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";

import { AppCharacterData } from "@/data/index.js";

type TuaDetailBattleProps = { title: string; modelValue: TGApp.Sqlite.Abyss.Battle };

const props = defineProps<TuaDetailBattleProps>();

function getBoxData(avatar: TGApp.Sqlite.Abyss.CharacterInfo): TItemBoxData {
  const res = AppCharacterData.find((i) => i.id === avatar.id);
  if (avatar.id === 10000005 || avatar.id === 10000007) {
    return {
      clickable: false,
      height: "70px",
      ltSize: "20px",
      bg: `/icon/bg/${avatar.star}-Star.webp`,
      icon: `/WIKI/character/${avatar.id}.webp`,
      lt: `/icon/weapon/${res?.weapon ?? "单手剑"}.webp`,
      innerText: `Lv.${avatar.level}`,
      innerHeight: 20,
      display: "inner",
      size: "70px",
    };
  }
  return {
    clickable: false,
    height: "70px",
    ltSize: "20px",
    bg: `/icon/bg/${avatar.star}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${res?.element ?? "风"}元素.webp`,
    innerText: `Lv.${avatar.level}`,
    innerHeight: 20,
    display: "inner",
    size: "70px",
  };
}
</script>
<style lang="css" scoped>
.tud-db-icons-grid {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
}

.tud-db-time {
  color: var(--box-text-1);
  font-size: 12px;
  opacity: 0.6;
  text-align: left;
}
</style>
