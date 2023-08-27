<template>
  <div class="tuad-box">
    <TuaDetailTitle
      :val="props.modelValue.winStar"
      :name="`第${props.modelValue.id}层`"
      mode="floor"
    />
    <div class="tuad-divider" />
    <div class="tuad-index-box">
      <TuaDetailLevel
        v-for="level in props.modelValue.levels"
        :key="level.id"
        :model-value="level"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TuaDetailTitle from "./tua-detail-title.vue";
import TuaDetailLevel from "./tua-detail-level.vue";

interface TuaDetailProps {
  modelValue: TGApp.Sqlite.Abyss.Floor;
}

const props = defineProps<TuaDetailProps>();
</script>
<style lang="css" scoped>
.tuad-divider {
  width: 100%;
  height: 1px;
  border-radius: 5px;
  background: var(--common-text-content);
}

.tuad-index-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
