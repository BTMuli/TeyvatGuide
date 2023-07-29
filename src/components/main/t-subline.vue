<template>
  <div class="tsl-box">
    <img src="/src/assets/icons/arrow-right.svg" alt="right" />
    <slot>
      {{ props.title }}
    </slot>
  </div>
</template>
<script lang="ts" setup>
const props = defineProps<{
  title?: string;
}>();
</script>
<style lang="css" scoped>
.tsl-box {
  display: flex;
  height: 30px;
  align-items: center;
  padding: 0 10px;
  border-radius: 5px;
  margin: 5px 0;
  background: var(--common-shadow-2);
  color: var(--common-color-white);
  font-family: var(--font-text);
}

.tsl-box img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}
</style>
