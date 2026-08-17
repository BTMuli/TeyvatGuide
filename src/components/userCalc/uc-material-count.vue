<!-- 养成材料数量进度 -->
<template>
  <span :title="countTitle" class="ucmc-count">
    <span class="ucmc-current">{{ formatCount(current) }}</span>
    <template v-if="craftable > 0">
      <span class="ucmc-separator">（</span>
      <span class="ucmc-craftable">{{ formatCount(craftable) }}</span>
      <span class="ucmc-separator">）</span>
    </template>
    <span class="ucmc-separator">/</span>
    <span :class="{ complete }" class="ucmc-required">{{ formatCount(required) }}</span>
  </span>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type UcMaterialCountProps = {
  complete: boolean;
  craftable: number;
  current: number;
  required: number;
  compact?: boolean;
};

const {
  complete,
  craftable,
  current,
  required,
  compact = false,
} = defineProps<UcMaterialCountProps>();

const countTitle = computed<string>(() => {
  const craftableLabel = craftable > 0 ? `，可合成量 ${formatFullCount(craftable)}` : "";
  return `当前量 ${formatFullCount(current)}${craftableLabel}，需求总量 ${formatFullCount(required)}`;
});

function formatCount(count: number): string {
  if (!compact) return formatFullCount(count);
  const units = [
    { base: 1_000_000_000, suffix: "B" },
    { base: 1_000_000, suffix: "M" },
    { base: 1_000, suffix: "k" },
  ];
  const unit = units.find((item) => count >= item.base);
  if (!unit) return formatFullCount(count);
  return `${(count / unit.base).toFixed(1).replace(/\.0$/, "")}${unit.suffix}`;
}

function formatFullCount(count: number): string {
  return count.toLocaleString("zh-CN");
}
</script>

<style lang="scss" scoped>
.ucmc-count {
  display: inline-flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ucmc-current {
  color: var(--tgc-od-blue);
}

.ucmc-craftable {
  color: var(--tgc-od-green);
}

.ucmc-separator {
  color: var(--common-text-sub);
}

.ucmc-required {
  color: var(--tgc-od-red);

  &.complete {
    color: var(--tgc-od-green);
  }
}
</style>
