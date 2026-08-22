<!-- 养成材料数量进度 -->
<template>
  <span :title="countTitle" class="ucmc-count">
    <span class="ucmc-current">{{ formatDisplayCount(current) }}</span>
    <template v-if="craftable > 0">
      <span class="ucmc-separator">（</span>
      <span class="ucmc-craftable">{{ formatDisplayCount(craftable) }}</span>
      <span class="ucmc-separator">）</span>
    </template>
    <span class="ucmc-separator">/</span>
    <span :class="{ complete }" class="ucmc-required">{{ formatDisplayCount(required) }}</span>
  </span>
</template>

<script lang="ts" setup>
import fmtUtil from "@utils/fmtUtil.js";
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
  const craftableLabel = craftable > 0 ? `，可合成量 ${fmtUtil.num(craftable)}` : "";
  return `当前量 ${fmtUtil.num(current)}${craftableLabel}，需求总量 ${fmtUtil.num(required)}`;
});

function formatDisplayCount(count: number): string {
  if (!compact) return fmtUtil.num(count);
  const units = [
    { base: 1_000_000_000, suffix: "B" },
    { base: 1_000_000, suffix: "M" },
    { base: 1_000, suffix: "k" },
  ];
  const unit = units.find((item) => count >= item.base);
  if (!unit) return fmtUtil.num(count);
  return `${(count / unit.base).toFixed(1).replace(/\.0$/, "")}${unit.suffix}`;
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
