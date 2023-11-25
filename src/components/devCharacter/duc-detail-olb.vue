<template>
  <div class="duc-dolb-box">
    <div
      v-for="constellation in constellations"
      :key="constellation.pos"
      :title="constellation.name"
      class="duc-dolb-item"
    >
      <div v-if="!constellation.active" class="duc-dolb-lock">
        <v-icon color="white">mdi-lock</v-icon>
      </div>
      <img class="duc-dolb-icon" :src="constellation.icon" alt="constellation" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

interface DucDetailOlbProps {
  modelValue: TGApp.Sqlite.Character.RoleConstellation[];
}

const props = defineProps<DucDetailOlbProps>();
const constellations = computed(() => {
  return props.modelValue ?? [];
});
</script>
<style>
.duc-dolb-box {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.duc-dolb-item {
  position: relative;
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  backdrop-filter: blur(5px);
  background: rgb(0 0 0/40%);
}

.duc-dolb-lock {
  position: absolute;
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 50%;
  backdrop-filter: blur(5px);
  background-color: rgb(0 0 0 / 40%);
}

.duc-dolb-icon {
  width: 50px;
  height: 50px;
  padding: 5px;
  border-radius: 50%;
}
</style>
