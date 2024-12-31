<template>
  <TOverlay v-model="visible" blur-val="10px">
    <div class="tpoi-box">
      <div :class="{ 'tpoi-top-ori': isOriSize, 'tpoi-top': !isOriSize }">
        <img :src="props.image.insert.image" alt="图片" @click="isOriSize = !isOriSize" />
      </div>
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
          <v-icon @click="visible = false" title="关闭浮窗">mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { computed, ref, shallowRef } from "vue";

import type { TpImage } from "./tp-image.vue";

import { copyToClipboard, getImageBuffer, saveCanvasImg } from "@/utils/TGShare.js";
import { bytesToSize } from "@/utils/toolFunc.js";

type TpoImageProps = { image: TpImage };

const props = defineProps<TpoImageProps>();
const visible = defineModel<boolean>();
const bgMode = ref<number>(0); // 0: transparent, 1: black, 2: white
const isOriSize = ref<boolean>(false);
const buffer = shallowRef<Uint8Array | null>(null);
const format = computed<string>(() => {
  if (props.image.attributes?.ext) return props.image.attributes.ext;
  const imageFormat = props.image.insert.image.split(".").pop();
  if (imageFormat !== undefined) return imageFormat;
  return "png";
});

function setBlackBg(): void {
  bgMode.value = (bgMode.value + 1) % 3;
  const bgLabelList = ["透明", "黑色", "白色"];
  showSnackbar.success(`背景已切换为${bgLabelList[bgMode.value]}`);
}

async function onCopy(): Promise<void> {
  if (format.value === "gif") {
    showSnackbar.warn("GIF 图片不支持复制到剪贴板");
    return;
  }
  const image = props.image.insert.image;
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  await copyToClipboard(buffer.value);
  showSnackbar.success(`图片已复制到剪贴板，大小：${size}`);
}

async function onDownload(): Promise<void> {
  const image = props.image.insert.image;
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  if (buffer.value.byteLength > 80000000) {
    showSnackbar.warn("图片过大，无法下载到本地");
    return;
  }
  await saveCanvasImg(buffer.value, Date.now().toString(), format.value);
  showSnackbar.success(`图片已下载到本地，大小：${size}`);
}
</script>
<style lang="css" scoped>
.tpoi-box {
  position: relative;
  display: flex;
  max-width: 90%;
  max-height: 90%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  row-gap: 20px;
  transition: all 0.5s;
}

.tpoi-top {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 70%;
  align-items: flex-start;
  justify-content: center;
  border-radius: 10px;
  background: v-bind("bgMode === 1 ? 'black' : bgMode === 2 ? 'white' : 'transparent'");
  cursor: zoom-in;
  overflow-y: auto;
}

.tpoi-top-ori {
  position: relative;
  overflow: auto;
  max-width: 100%;
  max-height: 70%;
  cursor: zoom-out;
}

.tpoi-top img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
  object-fit: contain;
}

.tpoi-bottom {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
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
