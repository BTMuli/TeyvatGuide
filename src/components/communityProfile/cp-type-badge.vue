<!-- 帖子类型徽标 -->
<template>
  <span class="cp-type-badge">
    <v-icon v-if="icon" aria-hidden="true" size="14">{{ icon }}</v-icon>
    <span>{{ label }}</span>
  </span>
</template>

<script lang="ts" setup>
type CpTypeBadgeProps = { icon?: string; label: string };

const { icon, label } = defineProps<CpTypeBadgeProps>();
</script>

<style lang="scss" scoped>
.cp-type-badge {
  display: inline-flex;
  height: 20px;
  align-items: center;
  padding: 0 6px;
  border-radius: 4px;
  background: rgb(0 0 0 / 60%);
  color: var(--tgc-white-1);
  gap: 4px;
  white-space: nowrap;
}
</style>
