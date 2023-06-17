<template>
  <TItemBox :model-value="box" style="cursor: pointer" />
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

interface TibCalendarWeaponProps {
  modelValue: TGApp.App.Calendar.Item;
}

const props = defineProps<TibCalendarWeaponProps>();
const box = computed(() => {
  return {
    bg: props.modelValue.bg,
    icon: props.modelValue.icon,
    size: "100px",
    height: "100px",
    display: "inner",
    lt: props.modelValue.weaponIcon,
    ltSize: "30px",
    innerHeight: 25,
    innerText: props.modelValue.name,
  } as TItemBoxData;
});
</script>
