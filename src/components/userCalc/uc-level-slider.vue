<!-- 养成计算-分段等级滑条 -->
<template>
  <div
    :class="{ compact, single }"
    :style="{ '--ucls-chunk-count': trackLevels.length }"
    class="ucls-shell"
  >
    <span
      v-if="!single"
      :class="{
        editable: currentEditable,
        'at-start': current <= min,
        'at-end': current >= max,
      }"
      :style="{ '--ucls-marker-position': getMarkerPosition(current) }"
      class="ucls-marker current"
    >
      {{ currentEditable ? "起始" : "当前" }} Lv.{{ current }}
    </span>
    <span
      :class="{ 'at-start': model <= min, 'at-end': model >= max, single }"
      :style="{ '--ucls-marker-position': getMarkerPosition(model) }"
      class="ucls-marker target"
    >
      {{ single ? "等级" : "目标" }} Lv.{{ model }}
    </span>
    <div class="ucls-track" aria-hidden="true">
      <span
        v-for="level in trackLevels"
        :key="level"
        :class="{
          single: single && level <= model,
          current: !single && level <= current,
          target: !single && level > current && level <= model,
          remaining: level > model && level <= reachableMax,
          unavailable: level > reachableMax,
        }"
        class="ucls-chunk"
      />
    </div>
    <v-range-slider
      v-if="currentEditable && !single"
      :disabled="disabled"
      :max="max"
      :min="min"
      :model-value="[current, model]"
      aria-label="起始与目标等级"
      class="ucls-control range"
      color="var(--tgc-od-green)"
      density="compact"
      hide-details
      step="1"
      @update:model-value="updateRange"
    />
    <v-slider
      v-else
      :disabled="disabled"
      :max="max"
      :min="min"
      :model-value="model"
      :aria-label="single ? '等级' : '目标等级'"
      :color="single ? 'var(--tgc-od-blue)' : 'var(--tgc-od-green)'"
      class="ucls-control"
      density="compact"
      hide-details
      step="1"
      @update:model-value="updateValue"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type UcLevelSliderProps = {
  current: number;
  currentEditable?: boolean;
  min?: number;
  max: number;
  limitMax?: number;
  disabled?: boolean;
  compact?: boolean;
  single?: boolean;
};

const props = withDefaults(defineProps<UcLevelSliderProps>(), {
  currentEditable: false,
  min: 1,
  disabled: false,
  compact: false,
  single: false,
});
const emit = defineEmits<{ "update:current": [value: number] }>();

const model = defineModel<number>({ required: true });

const reachableMax = computed<number>(() =>
  Math.min(props.max, Math.max(props.min, props.current, props.limitMax ?? props.max)),
);
const trackLevels = computed<Array<number>>(() =>
  Array.from({ length: Math.max(props.max - props.min, 0) }, (_, index) => props.min + index + 1),
);

function updateValue(value: number): void {
  const lowerBound = props.single ? props.min : props.current;
  model.value = Math.max(lowerBound, Math.min(value, reachableMax.value));
}

function updateRange(value: [number, number]): void {
  const nextCurrent = Math.min(Math.max(value[0], props.min), reachableMax.value);
  const nextTarget = Math.min(Math.max(value[1], nextCurrent), reachableMax.value);
  emit("update:current", nextCurrent);
  model.value = nextTarget;
}

function getMarkerPosition(value: number): string {
  const range = props.max - props.min;
  if (range <= 0) return "0%";
  const normalized = Math.min(Math.max(value, props.min), props.max);
  return `${((normalized - props.min) / range) * 100}%`;
}
</script>

<style lang="scss" scoped>
.ucls-shell {
  --ucls-marker-gap: 8px;

  position: relative;
  display: flex;
  width: calc(100% - 16px);
  height: 54px;
  align-items: center;
  margin: 0 8px;

  &.compact {
    --ucls-marker-gap: 4px;

    height: 42px;
  }
}

.ucls-marker {
  position: absolute;
  z-index: 2;
  left: var(--ucls-marker-position);
  padding: 1px 5px;
  border: 1px solid currentcolor;
  border-radius: 3px;
  background: var(--box-bg-1);
  font-size: 10px;
  line-height: 14px;
  pointer-events: none;
  transform: translateX(-50%);
  white-space: nowrap;

  &.at-start {
    transform: none;

    &::after {
      left: 4px;
      transform: none;
    }
  }

  &.at-end {
    transform: translateX(-100%);

    &::after {
      right: 4px;
      left: auto;
      transform: none;
    }
  }

  &::after {
    position: absolute;
    left: 50%;
    width: 0;
    height: 0;
    border-right: 4px solid transparent;
    border-left: 4px solid transparent;
    content: "";
    transform: translateX(-50%);
  }

  &.current {
    top: calc(50% + 8px);
    color: var(--tgc-od-blue);

    &::after {
      bottom: 100%;
      border-bottom: 4px solid var(--tgc-od-blue);
    }

    &.editable {
      font-weight: 500;
    }
  }

  &.target {
    bottom: calc(50% + var(--ucls-marker-gap));
    color: var(--tgc-od-green);

    &::after {
      top: 100%;
      border-top: 4px solid var(--tgc-od-green);
    }

    &.single {
      color: var(--tgc-od-blue);

      &::after {
        border-top-color: var(--tgc-od-blue);
      }
    }
  }
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

  &.single {
    background: var(--tgc-od-blue);
  }

  &.target {
    background: var(--tgc-od-green);
  }

  &.remaining {
    background: var(--tgc-od-white);
  }

  &.unavailable {
    background: var(--tgc-od-red);
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

  &.range :deep(.v-slider-thumb:nth-last-child(2) .v-slider-thumb__surface) {
    background: var(--tgc-od-blue);
  }
}
</style>
