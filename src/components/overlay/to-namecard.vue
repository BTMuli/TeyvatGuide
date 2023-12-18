<template>
  <!-- todo 支持 share -->
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="ton-box" v-if="props.data">
      <img alt="bg" class="ton-bg" v-if="props.data" :src="props.data.profile" />
      <div class="ton-content">
        <span>{{ props.data.name }}</span>
        <span>{{ props.data.desc }}</span>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed } from "vue";

import TOverlay from "../main/t-overlay.vue";

interface ToNamecardProps {
  modelValue: boolean;
  data?: {
    profile: string;
    name: string;
    bg: string;
    icon: string;
    desc: string;
  };
}

type ToNamecardEmits = (e: "update:modelValue", value: boolean) => void;

const props = defineProps<ToNamecardProps>();

const emits = defineEmits<ToNamecardEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

function onCancel() {
  visible.value = false;
}
</script>
<style lang="css" scoped>
.ton-box {
  position: relative;
  overflow: hidden;
  width: 800px;
  height: 400px;
  border-radius: 10px;
}

.ton-bg {
  position: absolute;
  width: 100%;
  height: 100%;
}

.ton-content {
  position: absolute;
  right: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px;
  background: rgb(0 0 0 / 20%);
  box-shadow: 0 0 10px rgb(255 255 255 /20%);
  color: var(--tgc-white-1);
  text-shadow: 0 0 5px rgb(0 0 0/80%);
}

.ton-content :nth-child(1) {
  font-family: var(--font-title);
  font-size: 20px;
}

.ton-content :nth-child(2) {
  opacity: 0.8;
}
</style>
