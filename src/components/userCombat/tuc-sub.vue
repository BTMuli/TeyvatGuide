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
  height: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border-radius: 5px;
  background: var(--box-bg-2);
}

.tuc-sub-title {
  margin-right: auto;
  color: var(--box-text-2);
  font-family: var(--font-title);
}
</style>
