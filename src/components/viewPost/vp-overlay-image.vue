<template>
  <TOverlay v-model="visible" blur-val="10px">
    <div class="tpoi-box">
      <div :class="{ 'tpoi-top-ori': isOriSize, 'tpoi-top': !isOriSize }">
        <img :src="localLink" alt="图片" @click="isOriSize = !isOriSize" />
      </div>
      <div class="tpoi-bottom">
        <template v-if="typeof props.image.insert.image !== 'string'">
          <div class="tpoi-info">
            <p class="tpoi-info-item">
              <span>大小：</span>
              <span>{{ bytesToSize(Number(props.image.insert.image.size) ?? 0) }}</span>
            </p>
            <p class="tpoi-info-item">
              <span>尺寸：</span>
              <span>
                {{ props.image.insert.image.width }}x{{ props.image.insert.image.height }}
              </span>
            </p>
            <p class="tpoi-info-item">
              <span>格式：</span>
              <span>{{ format }}</span>
            </p>
          </div>
        </template>
        <template v-else-if="props.image.attributes">
          <div class="tpoi-info">
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
        </template>
        <div class="tpoi-tools">
          <v-icon @click="setBlackBg" title="切换背景色" v-if="showOri">
            mdi-format-color-fill
          </v-icon>
          <v-icon @click="showOri = true" title="查看原图" v-else>mdi-magnify</v-icon>
          <v-icon @click="onCopy" title="复制到剪贴板" v-if="showCopy">mdi-content-copy</v-icon>
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
const format = defineModel<string>("format", { default: "png" });
const bgMode = ref<number>(0); // 0: transparent, 1: black, 2: white
const isOriSize = ref<boolean>(false);
const buffer = shallowRef<Uint8Array | null>(null);
const oriLink = computed<string>(() => miniImgUrl());
const showCopy = computed<boolean>(() => {
  // 只能显示 png/jpg/jpeg/webp 格式的复制按钮
  return ["png", "jpg", "jpeg", "webp"].includes(format.value.toLowerCase());
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
  if (buffer.value === null) buffer.value = await getImageBuffer(oriLink.value);
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
  await showLoading.start("正在下载图片到本地", oriLink.value);
  if (buffer.value === null) buffer.value = await getImageBuffer(oriLink.value);
  if (buffer.value.byteLength > 80000000) {
    showSnackbar.warn("图片过大，无法下载到本地");
    return;
  }
  let fileName = oriLink.value.split("/").pop()?.split(".")[0];
  if (fileName === undefined) fileName = Date.now().toString();
  await saveCanvasImg(buffer.value, fileName, format.value);
  await showLoading.end();
}

function miniImgUrl(): string {
  let url: string;
  if (typeof props.image.insert.image === "string") {
    url = props.image.insert.image;
  } else {
    url = props.image.insert.image.url;
  }
  const link = new URL(url);
  return `${link.origin}${link.pathname}`;
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
    background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
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
    background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
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
  color: #ffffffff;
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
