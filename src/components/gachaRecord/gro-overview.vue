<template>
  <div class="gro-o-container">
    <!-- 这里放三列 -->
  </div>
</template>
<script lang="ts" setup>
interface GachaOverviewProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewProps>();

console.log(props.modelValue);
</script>
<style lang="css" scoped>
.gro-o-container {
  width: 100%;
  height: 100%;
  border-radius: 5px;
  background: var(--common-shadow-2);
}
</style>
