<template>
  <div class="tur-os-box">
    <div class="tur-os-title">
      <slot name="title">
        {{ title }}
      </slot>
    </div>
    <div class="tur-os-text">
      <slot name="val-text">
        {{ text }}
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TAOProps {
  title: string;
  text: string | number;
}

defineProps<TAOProps>();
</script>
<style lang="css" scoped>
.tur-os-box {
  width: 100%;
  height: auto;
  padding: 5px;
  border-radius: 5px;
  background: var(--common-bg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tur-os-title {
  font-family: var(--font-title);
  font-size: 20px;
  color: var(--common-text-2);
}

.tur-os-text {
  font-family: var(--font-text);
  font-size: 20px;
  color: var(--common-color-white);
  text-shadow: 0 0 10px var(--common-color-yellow);
}

.dark .tur-os-text {
  color: var(--common-color-yellow);
  text-shadow: none;
}
</style>
