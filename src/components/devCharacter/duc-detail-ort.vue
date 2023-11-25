<template>
  <div class="duc-dort-box">
    <div :title="talent.name" v-for="talent in talents" :key="talent.pos" class="duc-dort-item">
      <img :src="talent.icon" alt="talent" />
      <span>Lv.{{ talent.level }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

interface DucDetailOrtProps {
  modelValue: TGApp.Sqlite.Character.RoleTalent[];
}

const props = defineProps<DucDetailOrtProps>();
const talents = computed(() => {
  return props.modelValue ?? [];
});
</script>
<style lang="css" scoped>
.duc-dort-box {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.duc-dort-item {
  display: flex;
  column-gap: 10px;
}

.duc-dort-item img {
  width: 40px;
  height: 40px;
  padding: 5px;
  border-radius: 50%;
  backdrop-filter: blur(5px);
  background: rgba(0 0 0 /40%);
}

.duc-dort-item span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 16px;
  text-shadow: 0 0 5px rgba(0 0 0/40%);
}
</style>
