<template>
  <div :class="{ clickable: hasActivate }" class="config-item" @click="emit('activate')">
    <div class="item-action">
      <span class="item-icon"><v-icon :icon /></span>
      <span class="item-content">
        <span class="item-title">{{ title }}</span>
        <span v-if="subtitle || $slots.subtitle" class="item-subtitle"
          ><slot name="subtitle">{{ subtitle }}</slot></span
        >
      </span>
    </div>
    <div v-if="$slots.append" class="item-append"><slot name="append" /></div>
  </div>
</template>
<script lang="ts" setup>
import { getCurrentInstance } from "vue";

defineProps<{ title: string; subtitle?: string; icon: string }>();
const emit = defineEmits<{ activate: [] }>();

const instance = getCurrentInstance();
const hasActivate = Boolean(instance?.vnode.props?.onActivate);
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.config-item {
  @include github-styles.github-card-shadow;

  display: flex;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 4px;
}

.dark .config-item {
  @include github-styles.github-card-shadow("dark");
}

.config-item.clickable {
  cursor: pointer;
}

.config-item.clickable:hover {
  background: var(--box-bg-2);
}

.item-action {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 4px;
}

.item-icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-2);
}

.config-item.clickable:hover .item-icon {
  background: var(--box-bg-1);
}

.item-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.item-title {
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.item-subtitle {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.item-append {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
}
</style>
