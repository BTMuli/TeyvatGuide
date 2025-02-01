<template>
  <div class="tuc-dr-box">
    <div class="tuc-dr-bg">
      <img :src="`/icon/relic/${pos}.webp`" alt="relic" />
    </div>
    <div v-if="modelValue" class="tuc-dr-bg">
      <img :src="`/icon/bg/${modelValue.rarity}-Star.webp`" alt="bg" />
    </div>
    <div v-if="modelValue" class="tuc-dr-icon">
      <TMiImg :ori="true" :src="modelValue.icon" alt="relic" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

defineProps<{ modelValue: TGApp.Game.Avatar.Relic | false; pos: number }>();
</script>
<style lang="css" scoped>
.tuc-dr-box {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 5px;
  background: rgb(50 56 68/50%);
}

.tuc-dr-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.tuc-dr-bg:nth-child(1) {
  padding: 5px;
}

.tuc-dr-bg img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.tuc-dr-icon {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.tuc-dr-icon img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}
</style>
