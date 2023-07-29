<template>
  <TItemBox :model-value="box" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TItemBox from "../main/t-itembox.vue";
// utils
import TGSqlite from "../../plugins/Sqlite";
// types
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibAbyssDetailProps {
  modelValue: TGApp.Sqlite.Abyss.CharacterInfo;
}

const props = defineProps<TibAbyssDetailProps>();
const box = ref<TItemBoxData>(<TItemBoxData>{});

onMounted(async () => {
  const res = await TGSqlite.getAppCharacter(props.modelValue.id);
  if (props.modelValue.id === 10000005 || props.modelValue.id === 10000007) {
    box.value = {
      clickable: false,
      height: "70px",
      ltSize: "25px",
      bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
      icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
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
      ltSize: "25px",
      bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
      icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
      lt: `/icon/element/${res.element}元素.webp`,
      innerText: `Lv.${props.modelValue.level}`,
      innerHeight: 20,
      display: "inner",
      size: "70px",
    };
  }
});
</script>
