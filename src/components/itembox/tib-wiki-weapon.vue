<template>
  <TItemBox :model-value="box" style="cursor: pointer;" />
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

interface TibCalendarWeaponProps {
  modelValue: TGApp.App.Weapon.WikiBriefInfo
}

const props = defineProps<TibCalendarWeaponProps>();
const box = computed(() => {
  return {
    bg: props.modelValue.bg,
    icon: props.modelValue.icon,
    size: "128px",
    height: "128px",
    display: "inner",
    lt: props.modelValue.weaponIcon,
    ltSize: "40px",
    innerText: props.modelValue.name,
    innerHeight: 30,
  } as TItemBoxData;
});
</script>
