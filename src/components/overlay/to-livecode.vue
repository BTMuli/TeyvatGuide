<template>
  <TOverlay v-model="visible" :hide="true" :to-click="onCancel" blur-val="20px">
    <div class="tolc-box">
      <div class="tolc-title">
        <span>兑换码</span>
        <v-icon
          size="18px"
          title="share"
          @click="shareImg()"
          icon="mdi-share-variant"
          variant="outlined"
          data-html2canvas-ignore
        />
      </div>
      <div class="tolc-info">ActID:{{ props.actId }}</div>
      <v-list-item v-for="(item, index) in props.data" :key="index">
        <template #title>
          {{ item.code === "" ? "暂无兑换码" : item.code }}
        </template>
        <template #subtitle>
          <div v-html="item.title"></div>
          <span title="开放时间">{{ timestampToDate(Number(item.to_get_time) * 1000) }}</span>
        </template>
        <template #prepend>
          <img
            :src="item.img === '' ? '/source/UI/empty.webp' : item.img"
            alt="icon"
            class="tolc-icon"
          />
        </template>
        <template #append>
          <v-btn
            size="small"
            :disabled="item.code === ''"
            @click="copy(item.code)"
            icon="mdi-content-copy"
            variant="outlined"
            class="tolc-btn"
            data-html2canvas-ignore
          ></v-btn>
        </template>
      </v-list-item>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed } from "vue";

import { generateShareImg } from "../../utils/TGShare.js";
import { timestampToDate } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface ToLiveCodeProps {
  data: TGApp.BBS.Navigator.CodeData[];
  actId: string | undefined;
  modelValue: boolean;
}

type ToLiveCodeEmits = (e: "update:modelValue", value: boolean) => void;

const props = withDefaults(defineProps<ToLiveCodeProps>(), { modelValue: false });
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

async function shareImg(): Promise<void> {
  const element = <HTMLElement>document.querySelector(".tolc-box");
  const fileName = `LiveCode_${props.actId}_${new Date().getTime()}`;
  await generateShareImg(fileName, element, 2);
}
</script>
<style lang="css" scoped>
.tolc-box {
  position: relative;
  width: 340px;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background: var(--app-page-bg);
}

.tolc-title {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 20px;
  text-align: center;
}

.tolc-info {
  position: absolute;
  z-index: -1;
  right: 6px;
  bottom: 2px;
  font-size: 10px;
}

.tolc-icon {
  width: 40px;
  margin-right: 10px;
  aspect-ratio: 1;
}

.tolc-btn {
  margin-left: 10px;
}
</style>
