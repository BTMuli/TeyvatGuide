<template>
  <TItemBox :model-value="box" />
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

import { AppCharacterData } from "../../data/index.js";
import TItemBox, { type TItemBoxData } from "../main/t-itembox.vue";

interface TibWikiAbyssProps {
  modelValue: string | number;
}

const props = defineProps<TibWikiAbyssProps>();

const avatar = ref<TGApp.App.Character.WikiBriefInfo>();

const box = computed<TItemBoxData>(() => {
  return {
    bg: `/icon/bg/${avatar.value?.star ?? 5}-Star.webp`,
    clickable: false,
    display: "outer",
    height: "80px",
    icon: `/WIKI/character/${props.modelValue}.webp`,
    innerHeight: 20,
    innerText: avatar.value?.name ?? "旅行者",
    lt:
      avatar.value === undefined
        ? ""
        : avatar.value.element !== ""
          ? `/icon/element/${avatar.value.element}元素.webp`
          : `/icon/weapon/${avatar.value.weapon}.webp`,
    ltSize: "20px",
    size: "80px",
  };
});

onMounted(async () => {
  avatar.value = AppCharacterData.find((a) => a.id.toString() === props.modelValue.toString())!;
});
</script>
