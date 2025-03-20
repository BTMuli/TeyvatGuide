<template>
  <div class="tuc-sub-box">
    <div class="tuc-sub-title">{{ title }}</div>
    <slot name="default" />
  </div>
</template>
<script lang="ts" setup>
defineProps<{ title: string }>();
</script>
<style lang="css" scoped>
.tuc-sub-box {
  position: relative;
  display: flex;
  height: 205px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
}

.tuc-sub-title {
  margin-right: auto;
  color: var(--box-text-2);
  font-family: var(--font-title);
}
</style>
