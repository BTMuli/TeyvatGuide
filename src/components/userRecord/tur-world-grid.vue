<template>
  <div v-if="modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-wg-box">
    <TurWorldSub v-for="area in modelValue" :key="area.id" :data="area" />
  </div>
</template>
<script lang="ts" setup>
import TurWorldSub from "./tur-world-sub.vue";

defineProps<{ modelValue: Array<TGApp.Sqlite.Record.WorldExplore> }>();
</script>
<style lang="css" scoped>
.tur-wg-box {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 0.33fr);
}
</style>
