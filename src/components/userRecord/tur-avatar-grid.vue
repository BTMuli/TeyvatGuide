<template>
  <div v-if="props.modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-ag-box">
    <TibUrAvatar v-for="avatar in props.modelValue" :key="avatar.id" :model-value="avatar" />
  </div>
</template>

<script lang="ts" setup>
import TibUrAvatar from "../itembox/tib-ur-avatar.vue";

interface TurAvatarGridProps {
  modelValue: TGApp.Sqlite.Record.Avatar[];
}

const props = defineProps<TurAvatarGridProps>();
</script>
<style lang="css" scoped>
.tur-ag-box {
  display: grid;
  margin-bottom: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
