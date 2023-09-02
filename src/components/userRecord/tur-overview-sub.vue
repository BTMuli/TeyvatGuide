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
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-2);
}

.tur-os-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 20px;
}

.tur-os-text {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 20px;
}

.dark .tur-os-text {
  color: var(--common-color-yellow);
  text-shadow: none;
}
</style>
