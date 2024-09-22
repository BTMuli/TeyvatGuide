<template>
  <div v-if="props.modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-hg-box">
    <TurHomeSub v-for="(home, index) in props.modelValue" :key="index" :data="home" />
  </div>
</template>
<script lang="ts" setup>
import TurHomeSub from "./tur-home-sub.vue";

interface TurHomeGridProps {
  modelValue: TGApp.Sqlite.Record.Home[];
}

const props = defineProps<TurHomeGridProps>();
</script>
<style lang="css" scoped>
.tur-hg-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
