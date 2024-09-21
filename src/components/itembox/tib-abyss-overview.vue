<template>
  <TItemBox v-model="box" v-if="box" />
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import { AppCharacterData } from "../../data/index.js";
import TItemBox from "../main/t-itembox.vue";
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibAbyssOverviewProps {
  modelValue: TGApp.Sqlite.Abyss.Character;
}

const props = defineProps<TibAbyssOverviewProps>();
const box = ref<TItemBoxData>();

onMounted(() => {
  const res = AppCharacterData.find((a) => a.id === props.modelValue.id);
  if (res === undefined) return;
  box.value = {
    height: "80px",
    ltSize: "20px",
    clickable: false,
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/${props.modelValue.id}.webp`,
    lt: `/icon/element/${res.element}元素.webp`,
    innerText: props.modelValue.value.toString(),
    display: "inner",
    size: "80px",
    innerHeight: 20,
  };
});
</script>
