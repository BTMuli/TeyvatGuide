<template>
  <TItemBox2 v-model="box" />
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TItemBox2, { TItemBox2Data } from "../main/t-itembox-2.vue";

interface TMiniWeaponProps {
  item: TGApp.App.Calendar.Material;
}
const props = defineProps<TMiniWeaponProps>();
const box = computed(() => {
  return {
    bg: props.item.bg,
    icon: props.item.icon,
    star: props.item.starIcon,
    width: "150px",
    height: "45px",
    name: props.item.name,
  } as TItemBox2Data;
});
</script>
