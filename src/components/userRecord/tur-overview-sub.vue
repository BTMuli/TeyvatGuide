<template>
  <div class="tur-os-box">
    <div class="tur-os-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div class="tur-os-text">
      <div v-if="props.icon !== undefined" class="tur-os-icon">
        <slot name="icon"><img :src="props.icon" alt="icon" /></slot>
      </div>
      <slot name="val-text">{{ props.text }}</slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
type TAOProps = { title: string; text: string | number | undefined; icon?: string | undefined };

const props = defineProps<TAOProps>();
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
  background: var(--box-bg-2);
}

.tur-os-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 20px;
}

.tur-os-text {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 20px;
  gap: 5px;
}

.dark .tur-os-text {
  color: var(--tgc-yellow-1);
  text-shadow: none;
}

.tur-os-icon {
  width: 25px;
  height: 25px;

  img {
    width: 100%;
    height: 100%;
  }
}
</style>
