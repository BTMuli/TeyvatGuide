<template>
  <div v-if="worlds.length === 0">暂无数据</div>
  <div v-else class="tur-wg-box">
    <TurWorldSub v-for="world in worlds" :key="world.id" :world />
  </div>
</template>
<script lang="ts" setup>
import TurWorldSub from "./tur-world-sub.vue";

type TurWorldGridProps = { worlds: Array<TGApp.Sqlite.Record.WorldExplore> };

defineProps<TurWorldGridProps>();
</script>
<style lang="css" scoped>
.tur-wg-box {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 0.34fr);
}
</style>
