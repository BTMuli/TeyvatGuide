<template>
  <div class="info-item">
    <div :class="{ pad }" class="info-icon">
      <img v-if="!icon.startsWith('mdi-')" :src="icon" alt="" />
      <v-icon v-else :icon />
    </div>
    <div class="info-content">
      <span class="info-heading">
        <span :title class="info-title">{{ title }}</span>
        <span v-if="append" class="info-append">{{ append }}</span>
      </span>
      <span class="info-subtitle">
        <span class="info-subtitle-text">{{ subtitle }}</span>
        <slot name="subtitleAction" />
      </span>
    </div>
  </div>
</template>
<script lang="ts" setup>
type InfoItemProps = {
  pad?: boolean;
  title: string;
  subtitle: string;
  icon: string;
  append?: string;
};

const { title, subtitle, icon, append, pad = false } = defineProps<InfoItemProps>();
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.info-item {
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
  text-decoration: none;
}

.dark .info-item {
  @include github-styles.github-card-shadow("dark");
}

.info-icon {
  display: flex;
  overflow: hidden;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-2);

  &.pad {
    padding: 4px;
  }
}

.info-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.info-content {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.info-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4px;
}

.info-title {
  overflow: hidden;
  height: 16px;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-append,
.info-subtitle {
  height: 16px;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.info-append {
  flex-shrink: 0;
  text-align: right;
}

.info-subtitle {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-subtitle-text {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
