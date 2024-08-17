<template>
  <TItemBox v-model="box" />
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import TItemBox from "../main/t-itembox.vue";
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibAbyssOverviewProps {
  modelValue: TGApp.Sqlite.Abyss.Character;
}

const props = defineProps<TibAbyssOverviewProps>();
const box = ref<TItemBoxData>(<TItemBoxData>{});

onMounted(async () => {
  const res = await TGSqlite.getAppCharacter(props.modelValue.id);
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
