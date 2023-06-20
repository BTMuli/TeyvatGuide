<template>
  <div class="tsl-box">
    <img src="/src/assets/icons/arrow-right.svg" alt="right">
    <slot>
      {{ title }}
    </slot>
  </div>
</template>
<script lang="ts" setup>
defineProps({
  title: {
    type: String,
  },
});
</script>
<style lang="css" scoped>
.tsl-box {
  background: var(--common-bg-2);
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  margin: 5px 0;
  border-radius: 5px;
  font-family: var(--font-text);
  color: var(--common-color-white);
}

.tsl-box img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}
</style>
