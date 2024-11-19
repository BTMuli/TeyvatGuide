<template>
  <div class="tuao-box">
    <div class="tuao-title">
      <slot name="title">
        {{ props.title }}
      </slot>
    </div>
    <div v-if="props.valText" class="tuao-val-text">
      <slot name="val-text">
        {{ props.valText }}
      </slot>
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
import { computed } from "vue";

import { AppCharacterData } from "../../data/index.js";
import TItemBox, { TItemBoxData } from "../app/t-item-box.vue";

interface TAOProps {
  title: string;
  valText?: string | number;
  valIcons?: TGApp.Sqlite.Abyss.Character[];
  multi4?: boolean;
}

const props = defineProps<TAOProps>();
const getIconNum = computed(() => (props.multi4 ? 4 : 1));

function getBoxData(avatar: TGApp.Sqlite.Abyss.Character): TItemBoxData {
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
}

.tuao-val-icons {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(v-bind(getIconNum), 1fr);
}
</style>
