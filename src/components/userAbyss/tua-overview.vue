<!-- 概览 -->
<template>
  <div class="tuao-box">
    <div class="tuao-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div v-if="props.valText" class="tuao-val-text">
      <slot name="val-text">{{ props.valText }}</slot>
    </div>
    <div v-if="props.valIcons" class="tuao-val-icons">
      <slot name="val-icons">
        <TItemBox
          v-for="avatar in props.valIcons"
          :key="avatar.id"
          :model-value="getBoxData(avatar)"
        />
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";

import { AppCharacterData } from "@/data/index.js";

type TAOProps = {
  /** 标题 */
  title: string;
  /**值文本 */
  valText?: string | number;
  /** 值图标 */
  valIcons?: Array<TGApp.Sqlite.Abyss.CharacterData>;
  /* 是否多个 */
  multi4?: boolean;
};

const props = defineProps<TAOProps>();

function getBoxData(avatar: TGApp.Sqlite.Abyss.CharacterData): TItemBoxData {
  const res = AppCharacterData.find((a) => a.id === avatar.id);
  return {
    height: "80px",
    ltSize: "20px",
    clickable: false,
    bg: `/icon/bg/${avatar.star}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${res?.element ?? "风"}元素.webp`,
    innerText: avatar.value.toString(),
    display: "inner",
    innerBlur: "5px",
    size: "80px",
    innerHeight: 20,
  };
}
</script>
<style lang="css" scoped>
.tuao-box {
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

.tuao-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 20px;
}

.tuao-val-text {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 20px;
  font-weight: bold;
}

.tuao-val-icons {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(v-bind("props.multi4 ? 4 : 1"), 1fr);
}
</style>
