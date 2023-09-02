<template>
  <div class="tsl-box">
    <img src="/src/assets/icons/arrow-right.svg" alt="right" class="tsl-icon" />
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
  align-items: center;
  padding: 5px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  margin: 5px 0;
  color: var(--box-text-4);
  font-family: var(--font-title);
  gap: 5px;
}

.tsl-box img {
  width: 20px;
  height: 20px;
  padding: 5px;
  border-radius: 5px;
  background: var(--common-shadow-4);
}
</style>
