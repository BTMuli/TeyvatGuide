<template>
  <div class="tua-dcc-box">
    <div
      v-for="constellation in props.modelValue"
      :key="constellation.pos"
      class="tua-dcc-item"
      :title="`${constellation.pos}命-${constellation.name}`"
    >
      <TMiImg :ori="true" :src="constellation.icon" alt="constellation" class="tua-dcc-icon" />
      <div v-if="!constellation.is_actived" class="tua-dcc-lock">
        <v-icon size="10px" color="var(--tgc-od-white)">mdi-lock</v-icon>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type TuaDcConstellationsProps = { modelValue: Array<TGApp.Game.Avatar.Constellation> };

const props = defineProps<TuaDcConstellationsProps>();
</script>
<style lang="css" scoped>
.tua-dcc-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tua-dcc-item {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: 1px solid #ffffff33;
  border-radius: 50%;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: #00000033;
}

.tua-dcc-icon {
  width: 100%;
  height: 100%;
}

.tua-dcc-lock {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  background: #00000080;
}
</style>
