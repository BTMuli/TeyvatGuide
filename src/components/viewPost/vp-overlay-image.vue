<!-- 图片浮窗 -->
<template>
  <TOverlay v-model="visible" :outer-close="outerClose" blur-val="10px">
    <div class="tpoi-box">
      <div
        :class="{ 'tpoi-top-scroll': !isDragMode && !isResetting }"
        class="tpoi-top"
        @click="onBoxClick"
        @mousedown="onBoxMouseDown"
        @mouseup="onBoxMouseUp"
        @wheel="onWheel"
      >
        <img
          ref="VpOiRef"
          :draggable="false"
          :src="localLink"
          :style="imgStyle"
          alt="图片"
          @click="onImgClick"
          @load="onImageLoad"
          @mousedown="onImgMouseDown"
          @mouseleave="onImgMouseUp"
          @mousemove="onImgMouseMove"
          @mouseup="onImgMouseUp"
        />
        <div v-if="showScaleHint" class="tpoi-scale-hint">{{ Math.round(scale * 100) }}%</div>
      </div>
      <div class="tpoi-bottom">
        <template v-if="typeof props.image.insert.image !== 'string'">
          <div class="tpoi-info">
            <span class="tpoi-info-item">
              <span>大小：</span>
              <span>{{ bytesToSize(Number(props.image.insert.image.size) ?? 0) }}</span>
            </span>
            <span class="tpoi-info-item">
              <span>尺寸：</span>
              <span>
                {{ props.image.insert.image.width }}x{{ props.image.insert.image.height }}
              </span>
            </span>
            <span class="tpoi-info-item">
              <span>格式：</span>
              <span>{{ format }}</span>
            </span>
          </div>
        </template>
        <template v-else-if="props.image.attributes">
          <div class="tpoi-info">
            <span v-if="props.image.attributes.size" class="tpoi-info-item">
              <span>大小：</span>
              <span>{{ bytesToSize(props.image.attributes.size ?? 0) }}</span>
            </span>
            <span
              v-if="props.image.attributes?.width && props.image.attributes?.height"
              class="tpoi-info-item"
            >
              <span>尺寸：</span>
              <span>{{ props.image.attributes.width }}x{{ props.image.attributes.height }}</span>
            </span>
            <span class="tpoi-info-item">
              <span>格式：</span>
              <span>{{ format }}</span>
            </span>
            <span class="tpoi-info-item">
              <span>缩放：</span>
              <span>{{ Math.round(scale * 100) }}%</span>
            </span>
          </div>
        </template>
        <div class="tpoi-tools">
          <v-icon v-if="!showOri" title="查看原图" @click="showOri = true">mdi-magnify</v-icon>
          <v-icon v-else title="切换背景色" @click="setBlackBg">mdi-format-color-fill</v-icon>
          <v-icon v-if="showCopy" title="复制到剪贴板" @click="onCopy">mdi-content-copy</v-icon>
          <v-icon title="下载到本地" @click="onDownload">mdi-download</v-icon>
          <v-icon title="关闭浮窗" @click="visible = false">mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import { copyToClipboard, getImageBuffer, saveCanvasImg } from "@utils/TGShare.js";
import { bytesToSize } from "@utils/toolFunc.js";
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from "vue";

import type { TpImage } from "./tp-image.vue";

type TpoImageProps = { image: TpImage };
type ImageNaturalSize = { width: number; height: number };
type ImageStyle = {
  transform: string;
  transformOrigin: string;
  transition: string;
  cursor: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
};

const BG_LABELS: ReadonlyArray<string> = ["透明", "黑色", "白色"];
const RESET_DELAY: Readonly<number> = 800;
const SCALE_HINT_DELAY: Readonly<number> = 1000;
const OUTER_CLOSE_DELAY: Readonly<number> = 800;
const DRAG_THRESHOLD: Readonly<number> = 5;
const MIN_SCALE: Readonly<number> = 0.1;
const MAX_SCALE: Readonly<number> = 10;
const ZOOM_STEP: Readonly<number> = 0.1;

const props = defineProps<TpoImageProps>();
const visible = defineModel<boolean>();
const localLink = defineModel<string>("link");
const showOri = defineModel<boolean>("ori");
const bgColor = defineModel<string>("bgColor", { default: "transparent" });
const format = defineModel<string>("format", { default: "png" });

const bgMode = ref<number>(0);
const buffer = shallowRef<ArrayBuffer | null>(null);

const scale = ref<number>(1);
const positionX = ref<number>(0);
const positionY = ref<number>(0);
const isDragging = ref<boolean>(false);
const isDragMode = ref<boolean>(false);
const isResetting = ref<boolean>(false);
const hasDragged = ref<boolean>(false);
const showScaleHint = ref<boolean>(false);
const outerClose = ref<boolean>(true);
const dragStartX = ref<number>(0);
const dragStartY = ref<number>(0);
const clickStartX = ref<number>(0);
const clickStartY = ref<number>(0);

let scaleHintTimer: number | null = null;

const imgOriSize = shallowRef<ImageNaturalSize>({ width: 0, height: 0 });
const imgEl = useTemplateRef<HTMLImageElement>("VpOiRef");
const oriLink = computed<string>(() => miniImgUrl());
const showCopy = computed<boolean>(() => {
  return ["png", "jpg", "jpeg", "webp"].includes(format.value.toLowerCase());
});

onMounted(() => {
  document.addEventListener("mouseup", onDocumentMouseUp);
});

onUnmounted(() => {
  document.removeEventListener("mouseup", onDocumentMouseUp);
});

function getImageNaturalSize(): ImageNaturalSize {
  if (typeof props.image.insert.image !== "string") {
    return {
      width: props.image.insert.image.width ?? 0,
      height: props.image.insert.image.height ?? 0,
    };
  }
  if (props.image.attributes?.width && props.image.attributes?.height) {
    return {
      width: props.image.attributes.width,
      height: props.image.attributes.height,
    };
  }
  return { width: 0, height: 0 };
}

function miniImgUrl(): string {
  const url =
    typeof props.image.insert.image === "string"
      ? props.image.insert.image
      : props.image.insert.image.url;
  const link = new URL(url);
  return `${link.origin}${link.pathname}`;
}

const imgStyle = computed<ImageStyle>(() => {
  const baseStyle: ImageStyle = {
    transform: `translate(${positionX.value}px, ${positionY.value}px) scale(${scale.value})`,
    transformOrigin: "center center",
    transition: isDragging.value ? "none" : "transform 0.3s ease",
    cursor: isDragMode.value ? (isDragging.value ? "grabbing" : "grab") : "zoom-in",
  };

  if (isDragMode.value && imgOriSize.value.width > 0 && imgOriSize.value.height > 0) {
    return {
      ...baseStyle,
      width: `${imgOriSize.value.width}px`,
      height: `${imgOriSize.value.height}px`,
      maxWidth: "none",
      maxHeight: "none",
    };
  }

  return baseStyle;
});

function showScaleHintTimer(): void {
  showScaleHint.value = true;
  if (scaleHintTimer !== null) {
    clearTimeout(scaleHintTimer);
  }
  scaleHintTimer = window.setTimeout(() => {
    showScaleHint.value = false;
    scaleHintTimer = null;
  }, SCALE_HINT_DELAY);
}

async function resetTransform(): Promise<void> {
  isResetting.value = true;
  showScaleHintTimer();
  scale.value = 1;
  positionX.value = 0;
  positionY.value = 0;
  await nextTick();
  isDragMode.value = false;
  await new Promise((resolve) => setTimeout(resolve, RESET_DELAY));
  isResetting.value = false;
}

function onDocumentMouseUp(): void {
  isDragging.value = false;
}

function onBoxClick(event: MouseEvent): void {
  if (event.button !== 0) return;
  if (event.target === imgEl.value) return;
  if (isDragMode.value && !hasDragged.value) {
    resetTransform();
  }
  hasDragged.value = false;
}

function onBoxMouseDown(): void {
  outerClose.value = false;
}

async function onBoxMouseUp(): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => window.setTimeout(resolve, OUTER_CLOSE_DELAY));
  outerClose.value = true;
}

async function onImgClick(event: MouseEvent): Promise<void> {
  if (event.button !== 0) return;
  if (!isDragMode.value) {
    if (!showOri.value) {
      showOri.value = true;
      return;
    }
    isDragMode.value = true;
    imgOriSize.value = getImageNaturalSize();
    scale.value = 1;
    positionX.value = 0;
    positionY.value = 0;
    showScaleHintTimer();
  } else if (!hasDragged.value) {
    await resetTransform();
  }
  hasDragged.value = false;
}

function onImageLoad(): void {
  if (imgEl.value) {
    imgOriSize.value = {
      width: imgEl.value.naturalWidth,
      height: imgEl.value.naturalHeight,
    };
  }
}

function onImgMouseDown(event: MouseEvent): void {
  if (event.button !== 0 || !isDragMode.value) return;
  event.preventDefault();
  clickStartX.value = event.clientX;
  clickStartY.value = event.clientY;
  isDragging.value = true;
  hasDragged.value = false;
  dragStartX.value = event.clientX - positionX.value;
  dragStartY.value = event.clientY - positionY.value;
}

function onImgMouseMove(event: MouseEvent): void {
  if (!isDragging.value || !isDragMode.value) return;
  event.preventDefault();
  const dx = event.clientX - clickStartX.value;
  const dy = event.clientY - clickStartY.value;
  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
    hasDragged.value = true;
  }
  positionX.value = event.clientX - dragStartX.value;
  positionY.value = event.clientY - dragStartY.value;
}

function onImgMouseUp(event: MouseEvent): void {
  if (!isDragging.value) return;
  event.stopPropagation();
  isDragging.value = false;
}

function onWheel(event: WheelEvent): void {
  if (!isDragMode.value) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value + delta));
  if (newScale !== scale.value) {
    scale.value = newScale;
    showScaleHintTimer();
  }
}

function setBlackBg(): void {
  bgMode.value = (bgMode.value + 1) % 3;
  showSnackbar.success(`背景已切换为${BG_LABELS[bgMode.value]}`);
  bgColor.value = bgMode.value === 0 ? "transparent" : bgMode.value === 1 ? "black" : "white";
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
  transition: all 0.8s ease;
}

.tpoi-top {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  max-height: 70%;
  box-sizing: border-box;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--tgc-od-white);
  border-radius: 4px;
  background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
}

.tpoi-top-scroll {
  overflow: auto;
}

.tpoi-top img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  object-fit: contain;
  user-select: none;
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

.tpoi-scale-hint {
  position: absolute;
  z-index: 10;
  top: 50%;
  left: 50%;
  padding: 8px 16px;
  border-radius: 4px;
  background: rgb(0 0 0 / 70%);
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
</style>
