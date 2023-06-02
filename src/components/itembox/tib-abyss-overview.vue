<template>
  <TItemBox :model-value="box" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";
// utils
import TGSqlite from "../../plugins/Sqlite";

interface TibAbyssOverviewProps {
  modelValue: TGApp.Sqlite.Abyss.Character;
}

const props = defineProps<TibAbyssOverviewProps>();
const box = ref({} as TItemBoxData);

onMounted(async () => {
  const res = await TGSqlite.getAppCharacter(props.modelValue.id);
  box.value = {
    height: "80px",
    ltSize: "30px",
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
    lt: `/icon/element/${res.element}元素.webp`,
    innerText: props.modelValue.value.toString(),
    display: "inner",
    size: "80px",
    innerHeight: 20,
  };
});
</script>
