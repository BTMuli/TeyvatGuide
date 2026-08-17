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
      </div>
      <span class="ucmi-type">{{ material.type }}</span>
      <UcMaterialCount
        :complete="material.missing === 0"
        :craftable="material.craftable"
        :current="material.owned"
        :required="material.required"
        compact
      />
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
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";

type UcMaterialItemProps = {
  material: TGApp.App.UserCalc.ResultMaterial;
  weakenReady?: boolean;
};
type UcMaterialItemEmits = { select: [] };

const { weakenReady = false } = defineProps<UcMaterialItemProps>();
const emits = defineEmits<UcMaterialItemEmits>();
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
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-weight: 400;
  overflow-wrap: anywhere;
}

.ucmi-type {
  color: var(--box-text-4);
  font-size: 12px;
  opacity: 0.56;
  overflow-wrap: anywhere;
}

.ucmc-count {
  font-size: 12px;
}
</style>
