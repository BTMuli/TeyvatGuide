<!-- 养成计算-分段等级滑条 -->
<template>
  <div :style="{ '--ucls-chunk-count': trackLevels.length }" class="ucls-shell">
    <div class="ucls-track" aria-hidden="true">
      <span
        v-for="level in trackLevels"
        :key="level"
        :class="{
          current: level <= current,
          target: level > current && level <= model,
        }"
        class="ucls-chunk"
      />
    </div>
    <v-slider
      :disabled="disabled"
      :max="max"
      :min="min"
      :model-value="model"
      class="ucls-control"
      color="var(--tgc-od-green)"
      density="compact"
      hide-details
      step="1"
      thumb-label
      @update:model-value="updateValue"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type UcLevelSliderProps = {
  current: number;
  min?: number;
  max: number;
  disabled?: boolean;
};

const props = withDefaults(defineProps<UcLevelSliderProps>(), {
  min: 1,
  disabled: false,
});

const model = defineModel<number>({ required: true });

const trackLevels = computed<Array<number>>(() =>
  Array.from({ length: Math.max(props.max - props.min, 0) }, (_, index) => props.min + index + 1),
);

function updateValue(value: number): void {
  model.value = Math.max(props.current, Math.min(value, props.max));
}
</script>

<style lang="scss" scoped>
.ucls-shell {
  position: relative;
  width: calc(100% - 16px);
  margin: 0 8px;
}

.ucls-track {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  display: grid;
  height: 10px;
  padding: 1px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: transparent;
  gap: 2px;
  grid-template-columns: repeat(var(--ucls-chunk-count), minmax(0, 1fr));
  transform: translateY(-50%);
}

.ucls-chunk {
  min-width: 0;
  border-radius: 1px;

  &.current {
    background: var(--tgc-od-blue);
  }

  &.target {
    background: var(--tgc-od-green);
  }
}

.ucls-control {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0;

  :deep(.v-slider-track__background),
  :deep(.v-slider-track__fill) {
    opacity: 0;
  }
}
</style>
