<template>
  <div class="tuad-box">
    <TuaDetailTitle :val="props.modelValue.winStar" :name="`第${props.modelValue.id}层`" mode="floor" />
    <div class="tuad-index-box">
      <TuaDetailLevel v-for="level in props.modelValue.levels" :key="level.id" :model-value="level" />
    </div>
  </div>
</template>
<script lang="ts" setup>

import TuaDetailTitle from "./tua-detail-title.vue";
import TuaDetailLevel from "./tua-detail-level.vue";

interface TuaDetailProps {
  modelValue: TGApp.Sqlite.Abyss.Floor
}

const props = defineProps<TuaDetailProps>();
</script>
<style lang="css" scoped>
.tuad-box {
  width: 100%;
  margin-bottom: 10px;
  border-radius: 5px;
  background: var(--common-bg);
  padding: 10px;
}

.tuad-index-box {
  width: 100%;
}
</style>
