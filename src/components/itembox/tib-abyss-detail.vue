<template>
  <TItemBox :model-value="box" v-if="box" />
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import { AppCharacterData } from "../../data/index.js";
import TItemBox from "../main/t-itembox.vue";
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibAbyssDetailProps {
  modelValue: TGApp.Sqlite.Abyss.CharacterInfo;
}

const props = defineProps<TibAbyssDetailProps>();
const box = ref<TItemBoxData>();

onMounted(async () => {
  const res = AppCharacterData.find((a) => a.id === props.modelValue.id);
  if (res === undefined) return;
  if (props.modelValue.id === 10000005 || props.modelValue.id === 10000007) {
    box.value = {
      clickable: false,
      height: "70px",
      ltSize: "20px",
      bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
      icon: `/WIKI/character/${props.modelValue.id}.webp`,
      lt: `/icon/weapon/${res.weapon}.webp`,
      innerText: `Lv.${props.modelValue.level}`,
      innerHeight: 20,
      display: "inner",
      size: "70px",
    };
  } else {
    box.value = {
      clickable: false,
      height: "70px",
      ltSize: "20px",
      bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
      icon: `/WIKI/character/${props.modelValue.id}.webp`,
      lt: `/icon/element/${res.element}元素.webp`,
      innerText: `Lv.${props.modelValue.level}`,
      innerHeight: 20,
      display: "inner",
      size: "70px",
    };
  }
});
</script>
