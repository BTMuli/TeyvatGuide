<template>
  <div class="tuc-dib-box">
    <div v-if="bg" class="tuc-dib-bg">
      <img :src="bg" alt="bg" />
    </div>
    <div v-if="icon" class="tuc-dib-icon">
      <img :src="icon" alt="icon" />
    </div>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ icon?: string; bg?: string }>();
</script>
<style lang="css" scoped>
.tuc-dib-box {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 5px;
}

.tuc-dib-bg {
  position: absolute;
  width: 100%;
  height: 100%;
}

.tuc-dib-bg img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.tuc-dib-icon {
  position: absolute;
  width: 100%;
  height: 100%;
}

.tuc-dib-icon img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}
</style>
