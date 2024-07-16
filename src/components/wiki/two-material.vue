<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div v-if="props.data" class="twom-container">
      <slot name="left"></slot>
      <div class="twom-box">
        <div class="twom-top">
          <img :src="`/icon/material/${props.data.id}.webp`" alt="icon" class="twom-left" />
          <div class="twom-name">{{ props.data.name }}</div>
          <div class="twom-type">{{ props.data.type }}</div>
        </div>
        <div class="twom-bottom">
          <div class="twom-desc">{{ parseDesc() }}</div>
          <div class="twom-source" v-if="props.data.source.length > 1">
            <TwoSource :data="item" v-for="(item, index) in props.data.source" :key="index" />
          </div>
          <div class="twom-convert" v-if="props.data.convert.length > 1">
            <TwoConvert :data="item" v-for="(item, index) in props.data.convert" :key="index" />
          </div>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed } from "vue";

import TOverlay from "../main/t-overlay.vue";

import TwoConvert from "./two-convert.vue";
import TwoSource from "./two-source.vue";

interface TwoMaterialProps {
  modelValue: boolean;
  data: TGApp.App.Material.WikiItem;
}

type TwoMaterialEmits = (e: "update:modelValue", value: boolean) => void;

const props = defineProps<TwoMaterialProps>();
const emits = defineEmits<TwoMaterialEmits>();

const visible = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emits("update:modelValue", value);
  },
});
const iconBg = computed(() => {
  if (!props.data) return "url('/icon/bg/0-BGC.webp')";
  return `url('/icon/bg/${props.data.star}-BGC.webp')`;
});

function parseDesc() {
  if (!props.data) return "";
  return props.data.description.replace(/\\n/g, "\n");
}

function onCancel() {
  console.log(props.data);
  visible.value = false;
}
</script>
<style lang="css" scoped>
.twom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.twom-box {
  position: relative;
  display: flex;
  width: 800px;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  row-gap: 10px;
}

.twom-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  background-position: center;
  background-size: cover;
  column-gap: 10px;
}

.twom-left {
  overflow: hidden;
  width: 60px;
  border-radius: 50%;
  aspect-ratio: 1;
  background-image: v-bind(iconBg);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.twom-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 30px;
}

.twom-type {
  position: absolute;
  right: 10px;
  bottom: 10px;
  opacity: 0.8;
}

.twom-bottom {
  display: flex;
  max-height: 400px;
  flex-direction: column;
  padding-right: 10px;
  overflow-y: auto;
  row-gap: 10px;
}

.twom-desc,
.twom-source,
.twom-convert {
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.twom-desc {
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}

.twom-source {
  display: flex;
  flex-direction: column;
  padding: 10px;
  font-size: 16px;
  row-gap: 5px;
  white-space: pre-wrap;
}

.twom-convert {
  display: flex;
  flex-direction: column;
  padding: 10px;
  row-gap: 5px;
}
</style>
