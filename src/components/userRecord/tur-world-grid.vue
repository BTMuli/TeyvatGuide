<template>
  <div v-if="props.modelValue === undefined">暂无数据</div>
  <div v-else class="tur-wg-box">
    <TurWorldSub v-for="(area, index) in getData()" :key="index" :data="area" :theme="theme" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TurWorldSub from "./tur-world-sub.vue";

interface TurWorldGridProps {
  modelValue?: string;
}

const props = defineProps<TurWorldGridProps>();
const theme = computed(() => {
  const data = localStorage.getItem("theme");
  if (data) {
    return JSON.parse(data).theme || "default";
  } else {
    return "default";
  }
});

function getData(): TGApp.Sqlite.Record.WorldExplore[] {
  return JSON.parse(<string>props.modelValue);
}
</script>
<style lang="css" scoped>
.tur-wg-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
