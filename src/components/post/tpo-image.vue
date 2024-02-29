<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="10px">
    <div class="tpoi-box">
      <img :src="props.image.insert.image" alt="图片" />
      <div class="tpoi-bottom">
        <div class="tpoi-info" v-if="props.image.attributes">
          <p v-if="props.image.attributes.size">
            大小：{{ bytesToSize(props.image.attributes.size ?? 0) }}
          </p>
          <p>尺寸：{{ props.image.attributes.width }}x{{ props.image.attributes.height }}</p>
          <p>格式：{{ format }}</p>
        </div>
        <div class="tpoi-tools">
          <v-icon @click="setBlackBg" title="切换背景色">mdi-format-color-fill</v-icon>
          <v-icon @click="onCopy" title="复制到剪贴板">mdi-content-copy</v-icon>
          <v-icon @click="onDownload" title="下载到本地">mdi-download</v-icon>
          <v-icon @click="onCancel" title="关闭浮窗">mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

import { TpImage } from "./tp-image.vue";
import { copyToClipboard, getImageBuffer, saveCanvasImg } from "../../utils/TGShare";
import { bytesToSize } from "../../utils/toolFunc";
import showSnackbar from "../func/snackbar";
import TOverlay from "../main/t-overlay.vue";

interface TpoImageProps {
  image: TpImage;
  modelValue: boolean;
}

type TpoImageEmits = {
  (e: "update:modelValue", v: boolean): void;
};

const props = defineProps<TpoImageProps>();
const emits = defineEmits<TpoImageEmits>();
const buffer = ref<Uint8Array | null>(null);
const bgMode = ref(0); // 0: transparent, 1: black, 2: white

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
const bg = computed(() => {
  if (bgMode.value === 1) return "black";
  if (bgMode.value === 2) return "white";
  return "transparent";
});

const format = computed(() => {
  if (props.image.attributes?.ext) return props.image.attributes.ext;
  const imageFormat = props.image.insert.image.split(".").pop();
  if (imageFormat !== undefined) return imageFormat;
  return "png";
});

function onCancel() {
  visible.value = false;
}

function setBlackBg() {
  bgMode.value = (bgMode.value + 1) % 3;
  const bgLabelList = ["透明", "黑色", "白色"];
  showSnackbar({
    text: `背景已切换为${bgLabelList[bgMode.value]}`,
  });
}

async function onCopy(): Promise<void> {
  if (format.value === "gif") {
    showSnackbar({
      text: "GIF 图片不支持复制到剪贴板",
      color: "error",
    });
    return;
  }
  const image = props.image.insert.image;
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  await copyToClipboard(buffer.value);
  showSnackbar({ text: `图片已复制到剪贴板，大小：${size}` });
}

async function onDownload() {
  const image = props.image.insert.image;
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  if (buffer.value.byteLength > 80000000) {
    showSnackbar({
      text: "图片过大，无法下载到本地",
      color: "error",
    });
    return;
  }
  await saveCanvasImg(buffer.value, Date.now().toString(), format.value);
  showSnackbar({ text: `图片已下载到本地，大小：${size}` });
}

onUnmounted(() => {
  buffer.value = null;
});
</script>
<style lang="css" scoped>
.tpoi-box {
  position: relative;
  display: flex;
  min-width: 400px;
  max-width: 90vw;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  row-gap: 20px;
}

.tpoi-box img {
  max-width: 90vw;
  max-height: 70vh;
  background-color: v-bind(bg);
  object-fit: contain;
}

.tpoi-bottom {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.tpoi-info {
  padding: 10px;
  border-radius: 10px;
  background-color: var(--common-shadow-2);
  color: white;
}

.tpoi-tools {
  display: flex;
  padding: 10px;
  border-radius: 10px;
  background-color: var(--common-shadow-2);
  color: white;
  gap: 10px;
}

.tpoi-tools v-icon {
  cursor: pointer;
}
</style>
