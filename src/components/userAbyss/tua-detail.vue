<template>
  <div class="tuad-box">
    <TuaDetailTitle
      :val="props.modelValue.winStar"
      :name="`第${props.modelValue.id}层`"
      mode="floor"
    />
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
import TuaDetailLevel from "./tua-detail-level.vue";
import TuaDetailTitle from "./tua-detail-title.vue";

interface TuaDetailProps {
  modelValue: TGApp.Sqlite.Abyss.Floor;
}

const props = defineProps<TuaDetailProps>();
</script>
<style lang="css" scoped>
.tuad-box {
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
}

.tuad-index-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
