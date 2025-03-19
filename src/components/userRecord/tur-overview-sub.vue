<template>
  <div class="tur-os-box">
    <div class="tur-os-text">
      <div v-if="props.icon !== undefined" class="tur-os-icon">
        <slot name="icon">
          <TMiImg :ori="true" :src="props.icon" alt="icon" />
        </slot>
      </div>
      <slot name="val-text">{{ props.text }}</slot>
    </div>
    <div class="tur-os-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

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
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.tur-os-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
}

.tur-os-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-yellow-1);
  column-gap: 4px;
  font-family: var(--font-text);
  font-size: 18px;
  line-height: 24px;
}

.dark .tur-os-text {
  color: var(--tgc-yellow-1);
  text-shadow: none;
}

.tur-os-icon {
  position: relative;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
  }
}
</style>
