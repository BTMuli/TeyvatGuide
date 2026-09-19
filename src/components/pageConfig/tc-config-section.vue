<template>
  <div class="config-section">
    <div class="section-title">
      <v-icon
        :class="{ clickable: iconClickable }"
        class="section-icon"
        size="16"
        :icon
        @click="handleIconClick"
      />
      <span>{{ title }}</span>
      <slot name="titleAction" />
    </div>
    <div class="section-grid" :style="{ '--section-columns': columns }"><slot /></div>
  </div>
</template>
<script lang="ts" setup>
type ConfigSectionProps = {
  title: string;
  icon: string;
  iconClickable?: boolean;
  columns?: number;
};

const { iconClickable = false, columns = 2 } = defineProps<ConfigSectionProps>();
const emit = defineEmits<{ iconClick: [] }>();

function handleIconClick(): void {
  if (iconClickable) emit("iconClick");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.config-section {
  @include github-styles.github-card;

  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 8px;
  border-radius: 4px;
  font-family: var(--font-text);
}

.dark .config-section {
  @include github-styles.github-card("dark");
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  gap: 4px;
}

.section-icon.clickable {
  cursor: pointer;
}

.section-icon.clickable:hover {
  color: var(--tgc-od-red);
}

.section-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(var(--section-columns, 2), minmax(0, 1fr));
}

@media (width <= 900px) {
  .section-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
