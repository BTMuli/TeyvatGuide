<template>
  <div v-if="props.modelValue === undefined">暂无数据</div>
  <div v-else class="tur-ag-box">
    <TibUrAvatar v-for="avatar in data" :key="avatar.id" :model-value="avatar" />
  </div>
</template>

<script lang="ts" setup>
// vue
import { computed } from "vue";
import TibUrAvatar from "../itembox/tib-ur-avatar.vue";

interface TurAvatarGridProps {
  modelValue?: string;
}

const props = defineProps<TurAvatarGridProps>();
const data = computed<TGApp.Sqlite.Record.Avatar[]>(() => JSON.parse(<string>props.modelValue));
</script>
<style lang="css" scoped>
.tur-ag-box {
  display: grid;
  margin-bottom: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
