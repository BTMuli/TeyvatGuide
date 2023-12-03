<template>
  <div v-if="!props.modelValue">暂无数据</div>
  <div v-else class="tur-hg-box">
    <TurHomeSub v-for="(home, index) in homes" :key="index" :data="home" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TurHomeSub from "./tur-home-sub.vue";

interface TurHomeGridProps {
  modelValue?: string;
}

const props = defineProps<TurHomeGridProps>();
const homes = computed<TGApp.Sqlite.Record.Home[]>(() => {
  const res = JSON.parse(props.modelValue ?? "[]");
  if (res.length > 0) {
    return res;
  }
  return [];
});
</script>
<style lang="css" scoped>
.tur-hg-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
