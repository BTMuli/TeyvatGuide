<template>
  <div class="tud-db-time">
    {{ props.modelValue.time }}
  </div>
  <div class="tud-db-icons-grid">
    <TibAbyssDetail
      v-for="avatar in props.modelValue.characters"
      :key="avatar.id"
      :model-value="avatar"
    />
  </div>
</template>
<script lang="ts" setup>
import TibAbyssDetail from "../itembox/tib-abyss-detail.vue";

interface TuaDetailBattleProps {
  modelValue: TGApp.Sqlite.Abyss.Battle;
}

const props = defineProps<TuaDetailBattleProps>();
</script>
<style lang="css" scoped>
.tud-db-icons-grid {
  display: grid;
  margin-bottom: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.tud-db-time {
  width: 100%;
  color: var(--common-text-quote);
  font-size: 12px;
  text-align: left;
}
</style>
