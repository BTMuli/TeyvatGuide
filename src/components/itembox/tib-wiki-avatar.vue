<template>
  <TItemBox :model-value="box" />
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

interface TibCalendarAvatarProps {
  modelValue: TGApp.App.Character.WikiBriefInfo;
}

const props = defineProps<TibCalendarAvatarProps>();
const box = computed(() => {
  return {
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
    size: "128px",
    height: "128px",
    display: "inner",
    lt: `/icon/element/${props.modelValue.element}元素.webp`,
    ltSize: "40px",
    innerHeight: 30,
    innerIcon: `/icon/weapon/${props.modelValue.weapon}.webp`,
    innerText: props.modelValue.name,
  } as TItemBoxData;
});
</script>
