<template>
  <TItemBox :model-value="box" />
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TItemBox from "../main/t-itembox.vue";
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibCalendarItemProps {
  model: "avatar" | "weapon";
  data: TGApp.App.Calendar.Item;
  clickable: boolean;
}

const props = defineProps<TibCalendarItemProps>();
const box = ref<TItemBoxData>({
  bg: "",
  icon: "",
  size: "100px",
  height: "100px",
  display: "inner",
  clickable: false,
  lt: "",
  ltSize: "20px",
  innerHeight: 25,
  innerIcon: "",
  innerText: "",
});

onMounted(() => {
  if (props.model === "avatar") {
    box.value = {
      bg: props.data.bg,
      icon: props.data.icon,
      size: "100px",
      height: "100px",
      display: "inner",
      clickable: props.clickable,
      lt: props.data.elementIcon ?? "",
      ltSize: "20px",
      innerHeight: 25,
      innerIcon: props.data.weaponIcon,
      innerText: props.data.name,
    };
  } else {
    box.value = {
      bg: props.data.bg,
      icon: props.data.icon,
      size: "100px",
      height: "100px",
      display: "inner",
      clickable: props.clickable,
      lt: props.data.weaponIcon,
      ltSize: "20px",
      innerHeight: 25,
      innerText: props.data.name,
    };
  }
});
</script>
