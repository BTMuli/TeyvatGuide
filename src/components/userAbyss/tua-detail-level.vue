<template>
  <div class="tud-dl-divider" />
  <TuaDetailTitle :val="props.modelValue.winStar" :name="`第${props.modelValue.id}间`" />
  <TuaDetailBattle :model-value="props.modelValue.upBattle" />
  <TuaDetailBattle :model-value="props.modelValue.downBattle" />
</template>
<script lang="ts" setup>
// vue
import TuaDetailTitle from "./tua-detail-title.vue";
import TuaDetailBattle from "./tua-detail-battle.vue";

interface TuaDetailLevelProps {
  modelValue: TGApp.Sqlite.Abyss.Level;
}

const props = defineProps<TuaDetailLevelProps>();
</script>
<style lang="css" scoped>
.tud-dl-divider {
  border-radius: 5px;
  width: 100%;
  height: 1px;
  background: var(--common-text-content);
}
</style>
