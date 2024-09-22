<template>
  <div v-if="props.modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-wg-box">
    <TurWorldSub v-for="area in props.modelValue" :key="area.id" :data="area" />
  </div>
</template>
<script lang="ts" setup>
import TurWorldSub from "./tur-world-sub.vue";

interface TurWorldGridProps {
  modelValue: TGApp.Sqlite.Record.WorldExplore[];
}

const props = defineProps<TurWorldGridProps>();
</script>
<style lang="css" scoped>
.tur-wg-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
