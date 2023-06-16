<template>
  <div class="tuc-dib-box">
    <div v-if="modelValue.bg" class="tuc-dib-bg">
      <img :src="modelValue.bg" alt="bg">
    </div>
    <div v-if="modelValue.icon" class="tuc-dib-icon">
      <img :src="modelValue.icon" alt="icon">
    </div>
  </div>
</template>
<script lang="ts" setup>

interface TucDetailItemBoxProps {
  modelValue: {
    icon?: string,
    bg?: string,
  };
}

defineProps<TucDetailItemBoxProps>();
</script>
<style lang="css" scoped>
.tuc-dib-box {
  width: 60px;
  height: 60px;
  border-radius: 5px;
  position: relative;
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
