<template>
  <div class="twa-container">
    <TItemBox :model-value="box" />
    <div class="twa-diff">
      <span>{{ avatar?.name ?? "旅行者" }}</span>
      <span>{{ `${(props.modelValue.cur.Rate * 100).toFixed(3)}%` }}</span>
      <span :class="diffUp ? 'up' : 'down'">{{ getDiffStr() }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

import { AppCharacterData } from "../../data/index.js";
import { AbyssDataItem } from "../../pages/WIKI/Abyss.vue";
import TItemBox, { type TItemBoxData } from "../app/t-item-box.vue";

interface TibWikiAbyssProps {
  modelValue: AbyssDataItem<{ Item: number; Rate: number }>;
}

const props = defineProps<TibWikiAbyssProps>();

const avatar = ref<TGApp.App.Character.WikiBriefInfo>();
const diffUp = computed(() => props.modelValue.cur.Rate > props.modelValue.last.Rate);

const box = computed<TItemBoxData>(() => {
  return {
    bg: `/icon/bg/${avatar.value?.star}-Star.webp`,
    clickable: false,
    display: "inner",
    icon: `/WIKI/character/${avatar.value?.id}.webp`,
    innerHeight: 0,
    innerText: avatar.value?.name ?? "旅行者",
    lt:
      avatar.value === undefined
        ? ""
        : avatar.value.element !== ""
          ? `/icon/element/${avatar.value.element}元素.webp`
          : `/icon/weapon/${avatar.value.weapon}.webp`,
    ltSize: "15px",
    size: "60px",
    height: "60px",
  };
});

onMounted(async () => {
  avatar.value = AppCharacterData.find((a) => a.id === props.modelValue.cur.Item);
});

function getDiffStr() {
  if (props.modelValue.cur.Rate === props.modelValue.last.Rate) return "";
  if (props.modelValue.last.Rate > props.modelValue.cur.Rate) {
    return `↓${((props.modelValue.last.Rate - props.modelValue.cur.Rate) * 100).toFixed(3)}%`;
  }
  return `↑${((props.modelValue.cur.Rate - props.modelValue.last.Rate) * 100).toFixed(3)}%`;
}
</script>
<style lang="css" scoped>
.twa-container {
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-1);
  column-gap: 5px;
}

.twa-diff {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  color: var(--box-text-4);
  font-size: 12px;

  :first-child {
    font-family: var(--font-title);
    font-size: 15px;
  }
}

.twa-diff .up {
  color: var(--tgc-od-red);
  font-family: var(--font-title);
}

.twa-diff .down {
  color: var(--tgc-od-green);
  font-family: var(--font-title);
}
</style>
