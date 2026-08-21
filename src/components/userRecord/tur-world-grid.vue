<template>
  <div v-if="worlds.length === 0">暂无数据</div>
  <div v-else class="tur-wg-box">
    <TurWorldSub
      v-for="(world, index) in worlds"
      :key="world.id"
      :children="world.children"
      :menuLocation="index % 3 === 2 ? 'start' : 'end'"
      :uid
      :version
      :world
    />
  </div>
</template>
<script lang="ts" setup>
import TurWorldSub from "./tur-world-sub.vue";

type TurWorldGridProps = {
  worlds: Array<TGApp.Game.Record.WorldExploreDisplay>;
  uid: number;
  version?: string;
};

defineProps<TurWorldGridProps>();
</script>
<style lang="scss" scoped>
.tur-wg-box {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (width <= 960px) {
  .tur-wg-box {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .tur-wg-box {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
