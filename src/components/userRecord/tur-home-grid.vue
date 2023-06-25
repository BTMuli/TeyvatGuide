<template>
  <div v-if="props.modelValue === undefined">暂无数据</div>
  <div v-else class="tur-hg-box">
    <TurHomeSub v-for="home in homes" :data="home" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TurHomeSub from "./tur-home-sub.vue";

interface TurHomeGridProps {
  modelValue?: string;
}

const props = defineProps<TurHomeGridProps>();
const homes = computed(() => {
  const res = JSON.parse(props.modelValue || "[]") as TGApp.Sqlite.Record.Home[];
  if (res.length > 0) {
    return res;
  }
});
</script>
<style lang="css" scoped>
.tur-hg-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 10px;
  width: 100%;
}
</style>
