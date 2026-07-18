<!-- 养成计算-材料需求项 -->
<template>
  <div
    :class="{ missing: material.missing > 0, ready: weakenReady && material.missing === 0 }"
    class="ucmi-item"
    role="button"
    tabindex="0"
    title="查看材料详情"
    @click="emits('select')"
    @keydown.enter="emits('select')"
    @keydown.space.prevent="emits('select')"
  >
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
          {{
            material.missing > 0
              ? `缺少 ${formatCount(material.missing)}`
              : material.craftable > 0
                ? "合成后满足"
                : "已满足"
          }}
        </span>
      </div>
      <span class="ucmi-type">{{ material.type }}</span>
      <div class="ucmi-counts">
        <span :title="formatFullCount(material.required)" class="required">
          需要 {{ formatCount(material.required) }}
        </span>
        <span :title="formatFullCount(material.owned)" class="owned">
          持有 {{ formatCount(material.owned) }}
        </span>
        <span
          v-if="material.craftable > 0"
          :title="formatFullCount(material.craftable)"
          class="craftable"
        >
          可合成 {{ formatCount(material.craftable) }}
        </span>
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
type UcMaterialItemProps = {
  material: TGApp.App.UserCalc.ResultMaterial;
  weakenReady?: boolean;
};
type UcMaterialItemEmits = (e: "select") => void;

withDefaults(defineProps<UcMaterialItemProps>(), { weakenReady: false });
const emits = defineEmits<UcMaterialItemEmits>();

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
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: stretch;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  cursor: pointer;
  transition: opacity 160ms ease;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: 2px;
  }

  &.missing {
    border-color: var(--tgc-od-red);
  }

  &.ready {
    opacity: 0.56;
  }
}

.ucmi-icon {
  position: relative;
  overflow: hidden;
  min-width: 80px;
  align-self: stretch;
  aspect-ratio: 1;
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
  flex: 1;
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
  color: var(--tgc-od-green);
  font-size: 12px;

  &.lack {
    color: var(--tgc-od-red);
  }
}

.ucmi-type {
  color: var(--common-text-sub);
  font-size: 12px;
  opacity: 0.56;
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

  .required {
    color: var(--tgc-od-orange);
  }

  .owned {
    color: var(--tgc-od-blue);
  }

  .craftable {
    color: var(--tgc-od-green);
  }
}
</style>
