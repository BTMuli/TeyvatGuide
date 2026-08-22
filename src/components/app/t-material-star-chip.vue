<!-- 材料星级色条芯片（Wiki / 背包 / 合成共用） -->
<template>
  <div :class="[`star${star}`, mode, { empty: isEmpty }]" :title="name" class="tmsc-box">
    <div class="tmsc-left">
      <img :src="`/icon/bg/${star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/icon/material/${id}.webp`" alt="icon" class="icon" />
    </div>
    <div class="tmsc-right">
      <span class="tmsc-title">{{ name }}</span>
      <span v-if="mode === 'convert' && required !== undefined" class="tmsc-required">
        x{{ fmtUtil.num(required) }}
      </span>
    </div>
    <div
      v-if="mode !== 'wiki' && owned !== undefined"
      :title="mode === 'convert' ? `持有：${fmtUtil.num(owned)}` : undefined"
      class="tmsc-owned"
    >
      {{ fmtUtil.num(owned) }}
    </div>
    <div class="tmsc-extra">{{ type }}·{{ id }}</div>
  </div>
</template>

<script lang="ts" setup>
import fmtUtil from "@utils/fmtUtil.js";
import { computed } from "vue";

type MaterialStarChipMode = "bag" | "convert" | "wiki";

type TMaterialStarChipProps = {
  id: number | string;
  name: string;
  type: string;
  star: number;
  mode?: MaterialStarChipMode;
  /** 背包持有量，或合成场景下的本地持有量 */
  owned?: number;
  /** 合成需求量（仅 convert 展示 xN） */
  required?: number;
};

const {
  id,
  name,
  type,
  star,
  mode = "wiki",
  owned,
  required,
} = defineProps<TMaterialStarChipProps>();

const isEmpty = computed<boolean>(() => {
  if (mode === "wiki") return false;
  return (owned ?? 0) === 0;
});
</script>

<style lang="scss" scoped>
@use "@styles/utils.scss" as utils;

.tmsc-box {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  border-radius: 4px;
  column-gap: 4px;
  cursor: pointer;

  &.convert {
    min-width: 200px;
  }

  &.empty {
    opacity: 0.4;

    .tmsc-owned {
      color: var(--tgc-od-red);
    }
  }
}

.tmsc-left {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  aspect-ratio: 1;

  .bg,
  .icon {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
  }
}

.tmsc-right {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  align-items: flex-end;
  color: var(--box-text-2);
  column-gap: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.tmsc-title {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tmsc-required {
  flex-shrink: 0;
  border-radius: 12px;
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
}

.tmsc-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}

.tmsc-owned {
  position: absolute;
  top: 0;
  right: 0;
  box-sizing: border-box;
  padding-right: 4px;
  padding-left: 12px;
  border-top: unset;
  border-right: unset;
  border-bottom-left-radius: 12px;
  font-family: var(--font-title);
  font-size: 10px;
  font-weight: normal;
  line-height: 12px;
  text-align: center;
}

@for $i from 0 through 5 {
  .star#{$i} {
    $tmsc-base: utils.get-od-star-color($i);

    border: 1px solid rgba($tmsc-base, 0.2);
    background: rgba($tmsc-base, 0.15);

    .tmsc-extra {
      color: $tmsc-base;
    }

    .tmsc-owned {
      border: 1px solid rgba($tmsc-base, 0.3);
      border-top: unset;
      border-right: unset;
      background: rgba($tmsc-base, 0.18);
      color: $tmsc-base;
    }
  }
}
</style>
