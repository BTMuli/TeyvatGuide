<!-- 背包材料转换项材料单项 -->
<template>
  <div
    :class="[`star${props.material.star}`, `${props.material.local === 0 ? 'empty' : ''}`]"
    :title="props.material.name"
    class="pbo-cm-box"
  >
    <div class="pbo-cm-left">
      <img :src="`/icon/bg/${props.material.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/icon/material/${props.material.id}.webp`" alt="icon" class="icon" />
    </div>
    <div class="pbo-cm-right">
      <span class="pbo-cm-title">{{ props.material.name }}</span>
      <span class="pbo-cm-count">x{{ props.material.count }}</span>
    </div>
    <div :title="`持有：${props.material.local}`" class="pbo-cm-local">
      {{ props.material.local }}
    </div>
    <div class="pbo-cm-extra">{{ props.material.type }}·{{ props.material.id }}</div>
  </div>
</template>
<script lang="ts" setup>
import { PboConvertSource } from "./pbo-convert.vue";

type PbMaterialItemProps = { material: PboConvertSource };
const props = defineProps<PbMaterialItemProps>();
</script>
<style lang="scss" scoped>
@use "@styles/utils.scss" as utils;
@use "@styles/github.styles.scss" as github-styles;

.pbo-cm-box {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: 200px;
  height: 48px;
  align-items: center;
  justify-content: flex-start;
  padding-right: 4px;
  border-radius: 4px;
  column-gap: 4px;

  &.empty {
    opacity: 0.4;
  }
}

.pbo-cm-left {
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

.pbo-cm-right {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  align-items: flex-end;
  justify-content: center;
  color: var(--box-text-2);
  column-gap: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.pbo-cm-title {
  font-size: 14px;
}

.pbo-cm-count {
  position: relative;
  border-radius: 12px;
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 12px;
}

.pbo-cm-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}

.pbo-cm-local {
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
  line-height: 12px;
  text-align: center;
}

@for $i from 1 through 5 {
  .star#{$i} {
    $pbo-cm-base: utils.get-od-star-color($i);

    border: 1px solid rgba($pbo-cm-base, 0.2);
    background: rgba($pbo-cm-base, 0.15);

    .pbo-cm-extra {
      color: $pbo-cm-base;
    }

    .pbo-cm-local {
      @include github-styles.github-tag-dark-gen($pbo-cm-base);

      border-top: unset;
      border-right: unset;
    }
  }
}
</style>
