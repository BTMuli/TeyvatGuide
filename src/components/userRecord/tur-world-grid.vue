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
  grid-gap: 10px;
  grid-template-columns: repeat(3, calc(33.3333% - 10px));
}
</style>
