<template>
  <div class="tud-db-box">
    <div class="tud-db-time">{{ props.title }} {{ props.modelValue.time }}</div>
    <div class="tud-db-icons-grid">
      <TibAbyssDetail
        v-for="avatar in props.modelValue.characters"
        :key="avatar.id"
        :model-value="avatar"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TibAbyssDetail from "../itembox/tib-abyss-detail.vue";

interface TuaDetailBattleProps {
  title: string;
  modelValue: TGApp.Sqlite.Abyss.Battle;
}

const props = defineProps<TuaDetailBattleProps>();
</script>
<style lang="css" scoped>
.tud-db-icons-grid {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  gap: 10px;
}

.tud-db-time {
  color: var(--box-text-1);
  font-size: 12px;
  opacity: 0.6;
  text-align: left;
}
</style>
