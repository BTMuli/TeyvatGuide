<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tolc-box">
      <div class="tolc-title">兑换码</div>
      <v-list-item v-for="(item, index) in props.data" :key="index">
        <template #title>
          {{ item.code }}
        </template>
        <template #subtitle>
          <div v-html="item.title"></div>
          <span>{{ timestampToDate(Number(item.to_get_time) * 1000) }}</span>
        </template>
        <template #prepend>
          <img :src="item.img" alt="icon" />
        </template>
        <template #append>
          <v-btn @click="copy(item.code)" icon="mdi-content-copy" variant="outlined"></v-btn>
        </template>
      </v-list-item>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed } from "vue";

import { timestampToDate } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface ToLiveCodeProps {
  data: TGApp.BBS.Navigator.CodeData[];
  modelValue: boolean;
}

type ToLiveCodeEmits = (e: "update:modelValue", value: boolean) => void;

const props = withDefaults(defineProps<ToLiveCodeProps>(), {
  data: <TGApp.BBS.Navigator.CodeData[]>[],
  modelValue: false,
});
const emits = defineEmits<ToLiveCodeEmits>();

const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

function onCancel(): void {
  visible.value = false;
}

function copy(code: string): void {
  navigator.clipboard.writeText(code);
  showSnackbar({ text: "已复制到剪贴板", color: "success" });
}
</script>
<style lang="css" scoped>
.tolc-box {
  padding: 10px;
  border-radius: 10px;
  background: var(--app-page-bg);
}

.tolc-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  text-align: center;
}
</style>
