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
  text: string | number | undefined;
}

defineProps<TAOProps>();
</script>
<style lang="css" scoped>
.tur-os-box {
  display: flex;
  width: 100%;
  height: auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  background: var(--common-shadow-1);
}

.tur-os-title {
  color: var(--common-text-content);
  font-family: var(--font-title);
  font-size: 20px;
}

.tur-os-text {
  color: var(--common-color-white);
  font-family: var(--font-text);
  font-size: 20px;
  text-shadow: 0 0 10px var(--common-color-yellow);
}

.dark .tur-os-text {
  color: var(--common-color-yellow);
  text-shadow: none;
}
</style>
