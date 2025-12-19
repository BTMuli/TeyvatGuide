<!-- WIKI 材料项 -->
<template>
  <div :title="props.material.name" class="pw-mi-box">
    <div class="pw-mi-left">
      <img :src="`/icon/bg/${props.material.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/icon/material/${props.material.id}.webp`" alt="icon" class="icon" />
    </div>
    <div class="pw-mi-right">{{ props.material.name }}</div>
    <div class="pw-mi-extra">{{ props.material.type }}·{{ props.material.id }}</div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { computed } from "vue";

type PbMaterialItemProps = { material: TGApp.App.Material.WikiItem };
const props = defineProps<PbMaterialItemProps>();

const idColor = computed<string>(() => getOdStarColor(props.material.star));
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.pw-mi-box {
  position: relative;
  display: flex;
  overflow: hidden;
  height: 48px;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  column-gap: 4px;
}

.pw-mi-left {
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

.pw-mi-right {
  position: relative;
  overflow: hidden;
  max-width: 100%;
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.pw-mi-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  color: v-bind(idColor); /* stylelint-disable-line value-keyword-case */
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}
</style>
