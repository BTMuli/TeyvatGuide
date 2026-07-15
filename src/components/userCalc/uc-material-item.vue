<!-- 养成计算-材料需求项 -->
<template>
  <div :class="{ missing: material.missing > 0 }" class="ucmi-item">
    <div class="ucmi-icon">
      <img :src="`/icon/bg/${material.star}-Star.webp`" alt="background" />
      <img :src="`/icon/material/${material.id}.webp`" :alt="material.name" />
    </div>
    <div class="ucmi-info">
      <div class="ucmi-name-row">
        <span class="ucmi-name">{{ material.name }}</span>
        <span
          :class="{ lack: material.missing > 0 }"
          :title="formatFullCount(material.missing)"
          class="ucmi-status"
        >
          {{ material.missing > 0 ? `缺少 ${formatCount(material.missing)}` : "已满足" }}
        </span>
      </div>
      <span class="ucmi-type">{{ material.type }}</span>
      <div class="ucmi-counts">
        <span :title="formatFullCount(material.required)">
          需要 {{ formatCount(material.required) }}
        </span>
        <span :title="formatFullCount(material.owned)">持有 {{ formatCount(material.owned) }}</span>
      </div>
      <v-progress-linear
        :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        :model-value="material.progress"
        height="4"
        rounded
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UserCalcResultMaterial } from "@comp/userCalc/uc-types.js";

type UcMaterialItemProps = {
  material: UserCalcResultMaterial;
};

defineProps<UcMaterialItemProps>();

function formatCount(count: number): string {
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
.ucmi-item {
  display: grid;
  overflow: hidden;
  min-width: 0;
  align-items: stretch;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  grid-template-columns: 80px minmax(0, 1fr);

  &.missing {
    border-color: var(--tgc-od-red);
  }
}

.ucmi-icon {
  position: relative;
  overflow: hidden;
  min-height: 80px;
  align-self: stretch;
  background: var(--common-shadow-t-2);

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
  }

  img:first-child {
    object-fit: cover;
  }

  img:last-child {
    object-fit: contain;
  }
}

.ucmi-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  gap: 4px;
}

.ucmi-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 8px;
}

.ucmi-name {
  min-width: 0;
  font-family: var(--font-title);
  font-weight: 400;
  overflow-wrap: anywhere;
}

.ucmi-status {
  flex-shrink: 0;
  color: var(--common-text-sub);
  font-size: 12px;

  &.lack {
    color: var(--tgc-od-red);
  }
}

.ucmi-type {
  color: var(--common-text-sub);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.ucmi-counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  font-size: 12px;
  gap: 4px 8px;

  span {
    white-space: nowrap;
  }
}
</style>
