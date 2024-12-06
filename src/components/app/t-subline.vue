<template>
  <div class="tsl-box">
    <img src="../../assets/icons/arrow-right.svg" alt="right" />
    <slot>{{ title }}</slot>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ title?: string }>();
</script>
<style lang="css" scoped>
.tsl-box {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 5px;
  margin: 5px 0;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-family: var(--font-title);
  gap: 5px;
}

.tsl-box :first-child {
  width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: 5px;
  filter: invert(22%) sepia(7%) saturate(1241%) hue-rotate(182deg) brightness(95%) contrast(99%);
}

.dark .tsl-box {
  background: #2c313a;
  color: #faf7e8;
}

.dark .tsl-box :first-child {
  filter: none;
}
</style>
