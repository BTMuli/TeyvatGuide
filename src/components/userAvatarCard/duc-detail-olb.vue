<template>
  <div class="duc-dolb-box">
    <div
      v-for="constellation in props.modelValue"
      :key="constellation.pos"
      :title="constellation.name"
      class="duc-dolb-item"
    >
      <div v-if="!constellation.is_actived" class="duc-dolb-lock">
        <v-icon color="white">mdi-lock</v-icon>
      </div>
      <div class="duc-dolb-icon">
        <TMiImg :ori="true" :src="constellation.icon" alt="constellation" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type DucDetailOlbProps = { modelValue: Array<TGApp.Game.Avatar.Constellation> };

const props = defineProps<DucDetailOlbProps>();
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
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: #00000066;
}

.duc-dolb-lock {
  position: absolute;
  z-index: 2;
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 50%;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background-color: #00000066;
}

.duc-dolb-icon {
  position: relative;
  z-index: 1;
  display: flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
