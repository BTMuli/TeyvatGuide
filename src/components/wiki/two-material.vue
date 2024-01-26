<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div v-if="props.data" class="twom-container">
      <div class="twom-box">
        <!-- todo 根据类型显示不同的背景 -->
        <div class="twom-top">
          <div class="twom-ttl">{{ props.data.name }}</div>
          <div class="twom-right">
            <img :src="`/icon/material/${props.data.id}.webp`" alt="icon" />
          </div>
          <div class="twom-tbl">{{ props.data.type }}</div>
        </div>
        <div class="twom-bottom">
          <div class="twom-desc">{{ props.data.description }}</div>
          <div class="twom-source" v-if="props.data.source.length > 1">
            {{ props.data.source }}
          </div>
          <div class="twom-convert" v-if="props.data.convert.length > 1">
            {{ props.data.convert }}
          </div>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed } from "vue";

import TOverlay from "../main/t-overlay.vue";

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

function onCancel() {
  visible.value = false;
}
</script>
<style lang="css" scoped>
.twom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background: var(--app-side-bg);
  column-gap: 10px;
}

.twom-box {
  position: relative;
  overflow: hidden;
  width: 800px;
  height: 400px;
  border-radius: 10px;
}

.twom-top {
  position: relative;
  display: flex;
  height: 200px;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  background-position: center;
  background-size: cover;
}
</style>
