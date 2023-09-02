<template>
  <div class="tua-dl-box">
    <TuaDetailTitle
      :val="props.modelValue.winStar"
      :name="`第${props.modelValue.id}间`"
      mode="level"
    />
    <TuaDetailBattle title="上半" :model-value="props.modelValue.upBattle" />
    <TuaDetailBattle title="下半" :model-value="props.modelValue.downBattle" />
  </div>
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
.tua-dl-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px inset var(--common-shadow-2);
  border-radius: 5px;
  margin-top: 10px;
  background: var(--box-bg-2);
  gap: 10px;
}
</style>
