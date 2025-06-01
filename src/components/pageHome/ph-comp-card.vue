<template>
  <div class="thc-container">
    <div class="thc-title">
      <slot name="title" />
    </div>
    <div v-if="append" class="thc-append">
      <slot name="title-append" />
    </div>
    <div class="thc-box">
      <slot name="default" />
    </div>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ append?: boolean }>();
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.thc-container {
  @include github-styles.github-card;

  position: relative;
  min-height: 100px;
  box-sizing: border-box;
  padding: 24px 8px 8px;
  border-radius: 4px;
  margin-top: 24px;
}

.dark .thc-container {
  @include github-styles.github-card("dark");
}

.thc-title,
.thc-append {
  position: absolute;
  top: -16px;
  display: flex;
  height: 32px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 1px solid var(--tgc-od-white);
  border-radius: 4px;
  background: var(--tgc-od-blue);
  font-family: var(--font-title);
}

.thc-title {
  left: 8px;
  color: var(--tgc-white-1);
  font-size: 20px;
}

.thc-append {
  right: 8px;
  color: var(--tgc-white-1);
  font-size: 16px;
}
</style>
