<!-- 图片浮窗 -->
<template>
  <TOverlay v-model="visible" :outer-close="outerClose" blur-val="10px">
    <div class="tpoi-box">
      <div
        :class="{ 'tpoi-top-scroll': !isDragMode && !isResetting }"
        class="tpoi-top"
        @click="onBoxClick"
        @mousedown="onBoxMouseDown"
        @mousemove="onBoxMouseMove"
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
          @mousedown="onImgMouseDown"
          @mousemove="onImgMouseMove"
          @mouseup="onImgMouseUp"
        />
        <div :class="showScaleHint ? 'show' : 'hide'" class="tpoi-scale-hint">
          {{ Math.round(scale * 100) }}%
        </div>
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
            <span class="tpoi-info-item">
              <span>缩放：</span>
              <span>{{ Math.round(scale * 100) }}%</span>
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
import { copyToClipboard, saveBufferFile } from "@utils/TGShare.js";
import { bytesToSize } from "@utils/toolFunc.js";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  type StyleValue,
  useTemplateRef,
  watch,
} from "vue";

import type { TpImage } from "./tp-image.vue";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";

type TpoImageProps = { image: TpImage };
type VpoiSize = { width: number; height: number };
type VpoiPos = { x: number; y: number };

const BG_LABELS: ReadonlyArray<string> = ["透明", "黑色", "白色"];
const FMT_ARR: ReadonlyArray<string> = ["png", "jpg", "jpeg", "webp"];
const DRAG_THRESHOLD: Readonly<number> = 5;
const MIN_SCALE: Readonly<number> = 0.1;
const MAX_SCALE: Readonly<number> = 10;
const ZOOM_STEP: Readonly<number> = 0.1;
const MAX_FILE_SIZE: Readonly<number> = 80000000;
const SCALE_HINT_DURATION: Readonly<number> = 1500;
const OUTER_CLOSE_DELAY: Readonly<number> = 100;

const props = defineProps<TpoImageProps>();
const visible = defineModel<boolean>();
const localLink = defineModel<string>("link");
const showOri = defineModel<boolean>("ori");
const bgColor = defineModel<string>("bgColor", { default: "transparent" });
const format = defineModel<string>("format", { default: "png" });

let scaleHintTimer: number | null = null;
let scaleHintPending: boolean = false;

const bgMode = ref<number>(0);
const scale = ref<number>(1);
const isDragging = ref<boolean>(false);
const isDragMode = ref<boolean>(false);
const isResetting = ref<boolean>(false);
const hasDragged = ref<boolean>(false);
const showScaleHint = ref<boolean>(false);
const outerClose = ref<boolean>(true);

const buffer = shallowRef<ArrayBuffer | null>(null);
const imgPos = shallowRef<VpoiPos>({ x: 0, y: 0 });
const clickPos = shallowRef<VpoiPos>({ x: 0, y: 0 });
const dragPos = shallowRef<VpoiPos>({ x: 0, y: 0 });
const imgOriSize = shallowRef<VpoiSize>({ width: 0, height: 0 });
const imgEl = useTemplateRef<HTMLImageElement>("VpOiRef");

const oriLink = computed<string>(() => miniImgUrl());
const showCopy = computed<boolean>(() => FMT_ARR.includes(format.value.toLowerCase()));
const imgStyle = computed<StyleValue>(() => {
  const baseStyle: Array<StyleValue> = [
    `transform: translate(${imgPos.value.x}px, ${imgPos.value.y}px) scale(${scale.value});`,
    "transformOrigin: center center;",
    `transition: ${isDragging.value ? "none" : "transform 0.3s ease"};`,
    `cursor: ${isDragMode.value ? (isDragging.value ? "grabbing" : "grab") : "zoom-in"};`,
  ];
  if (isDragMode.value && imgOriSize.value.width > 0 && imgOriSize.value.height > 0) {
    baseStyle.push(
      `width: ${imgOriSize.value.width}px;`,
      `height: ${imgOriSize.value.height}px;`,
      "maxWidth: none;",
      "maxHeight: none;",
    );
  }
  return baseStyle;
});

watch(
  () => visible.value,
  (newVal) => {
    if (!newVal) {
      if (scaleHintTimer !== null) {
        clearTimeout(scaleHintTimer);
        scaleHintTimer = null;
      }
      scale.value = 1;
      imgPos.value = { x: 0, y: 0 };
      dragPos.value = { x: 0, y: 0 };
      isDragging.value = false;
      isDragMode.value = false;
      isResetting.value = false;
      hasDragged.value = false;
      showScaleHint.value = false;
      outerClose.value = true;
    }
  },
);

onMounted(() => {
  document.addEventListener("mouseup", onDocumentMouseUp);
});

onUnmounted(() => {
  document.removeEventListener("mouseup", onDocumentMouseUp);
  if (scaleHintTimer !== null) {
    clearTimeout(scaleHintTimer);
    scaleHintTimer = null;
  }
});

function getImgOriSize(): VpoiSize {
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
  if (imgEl.value) {
    return { width: imgEl.value.naturalWidth, height: imgEl.value.naturalHeight };
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

function resetTransform(): void {
  isResetting.value = true;
  scale.value = 1;
  imgPos.value = { x: 0, y: 0 };
  dragPos.value = { x: 0, y: 0 };
  imgOriSize.value = { width: 0, height: 0 };
  isDragMode.value = false;
  hasDragged.value = false;
}

function enterDragMode(): void {
  isDragMode.value = true;
  imgOriSize.value = getImgOriSize();
  scale.value = 1;
  imgPos.value = { x: 0, y: 0 };
  showOri.value = true;
}

function handleClick(): void {
  if (hasDragged.value) return;
  if (!isDragMode.value) {
    enterDragMode();
  } else {
    resetTransform();
  }
}

function onBoxClick(event: MouseEvent): void {
  if (event.button !== 0) return;
  handleClick();
}

function onBoxMouseDown(event: MouseEvent): void {
  outerClose.value = false;
  clickPos.value = { x: event.clientX, y: event.clientY };
  if (isDragMode.value) {
    dragPos.value = { x: imgPos.value.x, y: imgPos.value.y };
    isDragging.value = true;
    hasDragged.value = false;
  } else {
    hasDragged.value = false;
  }
}

function handleMouseMove(event: MouseEvent): void {
  if (!isDragging.value && !isDragMode.value) {
    const dx = event.clientX - clickPos.value.x;
    const dy = event.clientY - clickPos.value.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasDragged.value = true;
    }
    return;
  }
  if (!isDragMode.value || !isDragging.value) return;
  const dx = event.clientX - clickPos.value.x;
  const dy = event.clientY - clickPos.value.y;
  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
    hasDragged.value = true;
  }
  imgPos.value = { x: dragPos.value.x + dx, y: dragPos.value.y + dy };
}

function onBoxMouseMove(event: MouseEvent): void {
  handleMouseMove(event);
}

function onDocumentMouseUp(): void {
  if (isDragging.value) {
    isDragging.value = false;
  }
  setTimeout(() => {
    outerClose.value = true;
  }, OUTER_CLOSE_DELAY);
}

function onBoxMouseUp(): void {
  if (isDragging.value) {
    isDragging.value = false;
    if (hasDragged.value) {
      setTimeout(() => {
        outerClose.value = true;
      }, 100);
    }
  }
}

async function onImgClick(event: MouseEvent): Promise<void> {
  event.stopPropagation();
  if (event.button !== 0) return;
  const wasDragging = isDragging.value;
  if (!isDragMode.value) {
    if (wasDragging) return;
    if (hasDragged.value) {
      hasDragged.value = false;
      return;
    }
    enterDragMode();
  } else if (!hasDragged.value && !wasDragging) {
    resetTransform();
  }
  hasDragged.value = false;
}

async function onImgMouseDown(event: MouseEvent): Promise<void> {
  event.stopPropagation();
  clickPos.value = { x: event.clientX, y: event.clientY };
  if (isDragMode.value) {
    event.preventDefault();
    dragPos.value = { x: imgPos.value.x, y: imgPos.value.y };
    isDragging.value = true;
    hasDragged.value = false;
  } else {
    hasDragged.value = false;
  }
  outerClose.value = false;
}

function onImgMouseMove(event: MouseEvent): void {
  if (isDragMode.value && isDragging.value) {
    event.preventDefault();
  }
  handleMouseMove(event);
}

function onImgMouseUp(event: MouseEvent): void {
  if (!isDragging.value) return;
  event.stopPropagation();
  isDragging.value = false;
  if (hasDragged.value) {
    setTimeout(() => {
      outerClose.value = true;
    }, OUTER_CLOSE_DELAY);
  }
}

function onWheel(event: WheelEvent): void {
  if (!isDragMode.value) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value + delta));
  if (newScale !== scale.value) {
    const rect = imgEl.value?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const imgX = (mouseX - imgPos.value.x) / scale.value;
    const imgY = (mouseY - imgPos.value.y) / scale.value;
    imgPos.value = {
      x: mouseX - imgX * newScale,
      y: mouseY - imgY * newScale,
    };
    scale.value = newScale;
    showScaleHint.value = true;
    if (!scaleHintPending) {
      scaleHintPending = true;
      if (scaleHintTimer !== null) {
        clearTimeout(scaleHintTimer);
      }
      scaleHintTimer = window.setTimeout(() => {
        showScaleHint.value = false;
        scaleHintTimer = null;
        scaleHintPending = false;
      }, SCALE_HINT_DURATION);
    }
  }
}

function setBlackBg(): void {
  bgMode.value = (bgMode.value + 1) % 3;
  showSnackbar.success(`背景已切换为${BG_LABELS[bgMode.value]}`);
  bgColor.value = bgMode.value === 0 ? "transparent" : bgMode.value === 1 ? "black" : "white";
}

async function loadImageBuffer(): Promise<void> {
  if (buffer.value !== null) return;
  try {
    buffer.value = await TGHttps.buffer(oriLink.value);
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取图像Buffer失败：${errMsg}`);
    await TGLogger.Error(`[VpOverlayImage][loadImageBuffer] 获取图像Buffer失败：${oriLink.value}`);
    await TGLogger.Error(`[VpOverlayImage][loadImageBuffer] ${e}`);
  }
}

async function onCopy(): Promise<void> {
  if (!showOri.value) {
    showOri.value = true;
    await nextTick();
  }
  await showLoading.start("正在复制图片到剪贴板");
  await loadImageBuffer();
  if (buffer.value === null) {
    await showLoading.end();
    return;
  }
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
  await loadImageBuffer();
  if (buffer.value === null) {
    await showLoading.end();
    return;
  }
  if (buffer.value.byteLength > MAX_FILE_SIZE) {
    await showLoading.end();
    showSnackbar.warn("图片过大，无法下载到本地");
    return;
  }
  let fileName = oriLink.value.split("/").pop()?.split(".")[0];
  if (fileName === undefined) fileName = Date.now().toString();
  await saveBufferFile(buffer.value, fileName, format.value);
  await showLoading.end();
}
</script>
<style lang="scss" scoped>
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
  user-select: none;
}

.tpoi-top-scroll {
  overflow: auto;
}

.tpoi-top:not(.tpoi-top-scroll) {
  overflow: hidden;
  cursor: grab;
}

.tpoi-top:not(.tpoi-top-scroll):active {
  cursor: grabbing;
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
  transition: opacity 0.3s ease-in-out;

  &.hide {
    opacity: 0;
  }

  &.show {
    opacity: 1;
  }
}
</style>
