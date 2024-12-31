<template>
  <div class="tuc-dib-box">
    <img :src="bg" alt="bg" class="tuc-dib-bg" />
    <img :src="icon" alt="icon" class="tuc-dib-icon" />
  </div>
</template>
<script lang="ts" setup>
defineProps<{ icon: string; bg: string }>();
</script>
<style lang="css" scoped>
.tuc-dib-box {
  position: relative;
  overflow: hidden;
  width: 60px;
  height: 60px;
  border-radius: 5px;
}

.tuc-dib-bg {
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.tuc-dib-icon {
  position: absolute;
  z-index: 2;
  width: 100%;
  height: 100%;
}
</style>
