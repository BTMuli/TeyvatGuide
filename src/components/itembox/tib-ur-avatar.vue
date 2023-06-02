<template>
  <TItemBox :model-value="box" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

interface TibUrAvatarProps {
  modelValue: TGApp.Sqlite.Record.Avatar
}

const props = defineProps<TibUrAvatarProps>();
const box = ref({} as TItemBoxData);

onMounted(async () => {
  box.value = {
    size: "80px",
    height: "80px",
    ltSize: "30px",
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
    lt: `/icon/element/${props.modelValue.element}元素.webp`,
    rt: props.modelValue.constellation.toString() || "0",
    rtSize: "20px",
    innerText: `${props.modelValue.name}`,
    innerHeight: 20,
    display: "inner",
  };
});
</script>
