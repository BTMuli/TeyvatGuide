<template>
  <TOverlay v-model="visible" blur-val="10px">
    <div class="tpoi-box">
      <div :class="{ 'tpoi-top-ori': isOriSize, 'tpoi-top': !isOriSize }">
        <img :src="localLink" alt="图片" @click="isOriSize = !isOriSize" />
      </div>
      <div class="tpoi-bottom">
        <div class="tpoi-info" v-if="props.image.attributes">
          <p v-if="props.image.attributes.size" class="tpoi-info-item">
            <span>大小：</span>
            <span>{{ bytesToSize(props.image.attributes.size ?? 0) }}</span>
          </p>
          <p class="tpoi-info-item">
            <span>尺寸：</span>
            <span>{{ props.image.attributes.width }}x{{ props.image.attributes.height }}</span>
          </p>
          <p class="tpoi-info-item">
            <span>格式：</span>
            <span>{{ format }}</span>
          </p>
        </div>
        <div class="tpoi-tools">
          <v-icon @click="setBlackBg" title="切换背景色" v-if="showOri">
            mdi-format-color-fill
          </v-icon>
          <v-icon @click="showOri = true" title="查看原图" v-else>mdi-magnify</v-icon>
          <v-icon @click="onCopy" title="复制到剪贴板" v-if="format !== 'gif'">
            mdi-content-copy
          </v-icon>
          <v-icon @click="onDownload" title="下载到本地">mdi-download</v-icon>
          <v-icon @click="visible = false" title="关闭浮窗">mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import { copyToClipboard, getImageBuffer, saveCanvasImg } from "@utils/TGShare.js";
import { bytesToSize } from "@utils/toolFunc.js";
import { computed, nextTick, ref, shallowRef } from "vue";

import type { TpImage } from "./tp-image.vue";

type TpoImageProps = { image: TpImage };

const props = defineProps<TpoImageProps>();
const visible = defineModel<boolean>();
const localLink = defineModel<string>("link");
const showOri = defineModel<boolean>("ori");
const bgColor = defineModel<string>("bgColor", { default: "transparent" });
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
  if (bgMode.value === 0) {
    bgColor.value = "transparent";
  } else if (bgMode.value === 1) {
    bgColor.value = "black";
  } else {
    bgColor.value = "white";
  }
}

async function onCopy(): Promise<void> {
  if (!showOri.value) {
    showOri.value = true;
    await nextTick();
  }
  await showLoading.start("正在复制图片到剪贴板");
  const image = props.image.insert.image;
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  await copyToClipboard(buffer.value);
  await showLoading.end();
  showSnackbar.success(`图片已复制到剪贴板，大小：${size}`);
}

async function onDownload(): Promise<void> {
  if (!showOri.value) {
    showOri.value = true;
    await nextTick();
  }
  const image = props.image.insert.image;
  await showLoading.start("正在下载图片到本地", image);
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  if (buffer.value.byteLength > 80000000) {
    showSnackbar.warn("图片过大，无法下载到本地");
    return;
  }
  let fileName = image.split("/").pop()?.split(".")[0];
  if (fileName === undefined) fileName = Date.now().toString();
  await saveCanvasImg(buffer.value, fileName, format.value);
  await showLoading.end();
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
  row-gap: 12px;
  transition: all 0.5s;
}

.tpoi-top {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 70%;
  box-sizing: border-box;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--tgc-od-white);
  border-radius: 4px;
  cursor: zoom-in;
  overflow-y: auto;

  img {
    max-width: 100%;
    max-height: 100%;
    border-radius: 4px;
    background: v-bind(bgColor);
    object-fit: contain;
  }
}

.tpoi-top-ori {
  position: relative;
  overflow: auto;
  max-width: 100%;
  max-height: 70%;
  cursor: zoom-out;

  img {
    background: v-bind(bgColor);
  }
}

.tpoi-bottom {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.tpoi-info {
  padding: 8px;
  border: 1px solid var(--tgc-od-white);
  border-radius: 4px;
  background-color: var(--common-shadow-2);
  color: #ffffff;
}

.tpoi-info-item {
  position: relative;
  display: flex;
  flex-wrap: wrap;
}

.tpoi-tools {
  display: flex;
  padding: 8px;
  border: 1px solid var(--tgc-od-white);
  border-radius: 4px;
  background-color: var(--common-shadow-2);
  color: white;
  gap: 4px;
}

.tpoi-tools v-icon {
  cursor: pointer;
}
</style>
