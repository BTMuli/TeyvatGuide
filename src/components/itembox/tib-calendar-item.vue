<template>
  <TItemBox :model-value="box" />
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TItemBox from "../main/t-itembox.vue";
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibCalendarItemProps {
  model: "avatar" | "weapon";
  data: TGApp.App.Calendar.Item;
  clickable: boolean;
}

const props = defineProps<TibCalendarItemProps>();
const box = computed<TItemBoxData>(() => {
  if (props.model === "avatar") {
    return {
      bg: props.data.bg,
      icon: props.data.icon,
      size: "100px",
      height: "100px",
      display: "inner",
      clickable: props.clickable,
      lt: props.data.elementIcon,
      ltSize: "30px",
      innerHeight: 25,
      innerIcon: props.data.weaponIcon,
      innerText: props.data.name,
    };
  }
  return {
    bg: props.data.bg,
    icon: props.data.icon,
    size: "100px",
    height: "100px",
    display: "inner",
    clickable: props.clickable,
    lt: props.data.weaponIcon,
    ltSize: "30px",
    innerHeight: 25,
    innerText: props.data.name,
  };
});
</script>
