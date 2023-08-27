<template>
  <div class="tud-db-box">
    <div class="tud-db-icons-grid">
      <TibAbyssDetail
        v-for="avatar in props.modelValue.characters"
        :key="avatar.id"
        :model-value="avatar"
      />
    </div>
    <div class="tud-db-time">
      {{ props.modelValue.time }}
    </div>
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
.tud-db-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.tud-db-icons-grid {
  display: flex;
  width: 100%;
  flex-direction: row;
  justify-content: flex-start;
  gap: 10px;
}

.tud-db-time {
  color: var(--common-text-content);
  font-size: 12px;
  text-align: center;
}
</style>
