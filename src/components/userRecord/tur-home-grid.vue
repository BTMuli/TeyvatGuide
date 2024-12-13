<template>
  <div v-if="modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-hg-box">
    <TurHomeSub v-for="(home, index) in modelValue" :key="index" :data="home" />
  </div>
</template>
<script lang="ts" setup>
import TurHomeSub from "./tur-home-sub.vue";

defineProps<{ modelValue: Array<TGApp.Sqlite.Record.Home> }>();
</script>
<style lang="css" scoped>
.tur-hg-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
