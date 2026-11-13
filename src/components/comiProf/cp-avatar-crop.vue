<!-- 自定义头像选择与裁切面板 -->
<template>
  <div class="cpac-scroll">
    <section aria-label="自定义头像" class="cpac-custom" role="group">
      <div class="cpac-custom-visual">
        <div v-if="sourceFile && previewUrl" class="cpac-crop">
          <div
            ref="cropStage"
            :aria-describedby="cropHintId"
            :aria-label="`自定义头像裁切预览：${sourceFile.name}`"
            :class="{ 'is-dragging': cropDragging }"
            class="cpac-crop-stage"
            role="group"
            :tabindex="props.disabled || preparing ? -1 : 0"
            @keydown="handleCropKeydown"
            @pointercancel="handleCropPointerUp"
            @pointerdown="handleCropPointerDown"
            @pointermove="handleCropPointerMove"
            @pointerup="handleCropPointerUp"
          >
            <img
              :alt="`${sourceFile.name} 裁切预览`"
              class="cpac-crop-image"
              decoding="async"
              draggable="false"
              :src="previewUrl"
              @load="handleCropImageLoad"
            />
            <div aria-hidden="true" class="cpac-crop-window" :style="cropWindowStyle" />
          </div>
          <p :id="cropHintId" class="cpac-crop-hint">拖动圆形选框调整裁切位置，方向键可微调。</p>
        </div>
        <button
          v-else
          :disabled="props.disabled || loading || preparing"
          aria-label="上传自定义头像"
          class="cpac-custom-preview"
          title="选择图片"
          type="button"
          @click="chooseFile"
        >
          <v-icon size="48">mdi-image-plus-outline</v-icon>
        </button>
      </div>
      <div class="cpac-custom-info">
        <div class="cpac-custom-copy">
          <h3 :title="sourceFile?.name">{{ sourceFile?.name || "上传自定义头像" }}</h3>
          <p>支持原始 PNG、JPEG、GIF、WebP，文件大小不超过 20 MiB。</p>
          <p>图片会保存为静态头像，并随资料提交米游社审核。</p>
        </div>
        <div class="cpac-custom-actions">
          <v-btn
            :disabled="props.disabled || loading || preparing"
            prepend-icon="mdi-upload"
            type="button"
            variant="tonal"
            @click="chooseFile"
          >
            {{ sourceFile ? "重新选择图片" : "选择图片" }}
          </v-btn>
          <v-btn
            v-if="sourceFile"
            :disabled="props.disabled || preparing"
            prepend-icon="mdi-image-filter-center-focus"
            type="button"
            variant="text"
            @click="resetCrop"
          >
            居中
          </v-btn>
        </div>
        <div v-if="loading" aria-live="polite" class="cpac-custom-state" role="status">
          正在读取图片…
        </div>
        <div v-else-if="preparing" aria-live="polite" class="cpac-custom-state" role="status">
          正在生成头像…
        </div>
        <div v-if="error" aria-live="assertive" class="cpac-custom-state is-error" role="alert">
          {{ error }}
        </div>
      </div>
    </section>
    <input
      ref="fileInput"
      :disabled="props.disabled || loading || preparing"
      accept="image/jpeg,image/png,image/gif,image/webp"
      hidden
      type="file"
      @cancel="clearInput"
      @change="handleFileChange"
    />
  </div>
</template>

<script lang="ts" setup>
import { prepareCustomAvatar } from "@utils/bbs/avatarImage.js";
import { prepareReplyImage } from "@utils/bbs/replyImage.js";
import type { CSSProperties } from "vue";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from "vue";

/**
 * 自定义头像裁切面板参数。
 * @since Beta v0.13.1
 */
type AvatarCropProps = {
  /** 是否禁用操作 */
  disabled?: boolean;
  /** 待保存的自定义头像源文件 */
  file?: File;
  /** 自定义头像裁切位置 */
  initialCrop?: TGApp.BBS.CommunitySettings.AvatarCrop;
};

type AvatarCropEmits = {
  /** 确认自定义头像 */
  confirm: [selection: TGApp.BBS.CommunitySettings.CustomAvatarSelection];
  /** 生成头像中 */
  busy: [busy: boolean];
  /** 是否可以确认 */
  ready: [ready: boolean];
};

const props = withDefaults(defineProps<AvatarCropProps>(), {
  disabled: false,
});
const emits = defineEmits<AvatarCropEmits>();

const cropHintId = useId();
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const cropStage = useTemplateRef<HTMLElement>("cropStage");
const sourceFile = shallowRef<File>();
const previewUrl = ref<string>("");
const sourceWidth = ref<number>(0);
const sourceHeight = ref<number>(0);
const crop = ref<TGApp.BBS.CommunitySettings.AvatarCrop>({ x: 0.5, y: 0.5 });
const cropStageSize = ref<{ width: number; height: number }>({ width: 0, height: 0 });
const error = ref<string>("");
const loading = ref<boolean>(false);
const preparing = ref<boolean>(false);
const cropDragging = ref<boolean>(false);
let objectUrl: string | undefined;
let requestVersion = 0;
let controller: AbortController | undefined;
let pickerRequestVersion: number | undefined;
let cropPointerId: number | undefined;
let cropStartX = 0;
let cropStartY = 0;
let cropStartPosition: TGApp.BBS.CommunitySettings.AvatarCrop = { x: 0.5, y: 0.5 };
let mounted = true;
let cropStageObserver: ResizeObserver | undefined;
const ready = computed<boolean>(() => {
  return (
    sourceFile.value !== undefined &&
    previewUrl.value !== "" &&
    sourceWidth.value > 0 &&
    sourceHeight.value > 0 &&
    !loading.value &&
    !preparing.value
  );
});
const cropWindowStyle = computed<CSSProperties>(() => {
  const stage = cropStageSize.value;
  const width = sourceWidth.value;
  const height = sourceHeight.value;
  if (stage.width <= 0 || stage.height <= 0 || width <= 0 || height <= 0) {
    return { display: "none" };
  }
  const scale = Math.min(stage.width / width, stage.height / height);
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  const square = Math.min(imageWidth, imageHeight);
  return {
    width: `${square}px`,
    height: `${square}px`,
    left: `${(stage.width - imageWidth) / 2 + (imageWidth - square) * crop.value.x}px`,
    top: `${(stage.height - imageHeight) / 2 + (imageHeight - square) * crop.value.y}px`,
  };
});

watch(
  () => props.file,
  (file) => syncSource(file, props.initialCrop),
  { immediate: true },
);

watch(ready, (value) => emits("ready", value));
watch(preparing, (value) => emits("busy", value));
watch(
  cropStage,
  (stage) => {
    cropStageObserver?.disconnect();
    cropStageObserver = undefined;
    if (!stage) return;
    cropStageObserver = new ResizeObserver(updateCropStageSize);
    cropStageObserver.observe(stage);
  },
  { flush: "post" },
);

onMounted(() => {
  emits("ready", ready.value);
  emits("busy", preparing.value);
  window.addEventListener("resize", updateCropStageSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateCropStageSize);
  cropStageObserver?.disconnect();
  cropStageObserver = undefined;
  mounted = false;
  requestVersion += 1;
  controller?.abort();
  controller = undefined;
  releaseObjectUrl();
});

function syncSource(
  file: File | undefined,
  cropPosition: TGApp.BBS.CommunitySettings.AvatarCrop | undefined,
): void {
  requestVersion += 1;
  controller?.abort();
  controller = undefined;
  loading.value = false;
  preparing.value = false;
  invalidatePicker();
  releaseObjectUrl();
  sourceFile.value = file;
  sourceWidth.value = 0;
  sourceHeight.value = 0;
  crop.value = normalizeCrop(cropPosition);
  error.value = "";
  if (file === undefined) return;
  const url = URL.createObjectURL(file);
  objectUrl = url;
  previewUrl.value = url;
}

async function validateFile(file: File): Promise<void> {
  const version = ++requestVersion;
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  releaseObjectUrl();
  sourceFile.value = undefined;
  sourceWidth.value = 0;
  sourceHeight.value = 0;
  crop.value = { x: 0.5, y: 0.5 };
  error.value = "";
  loading.value = true;
  try {
    const prepared = await prepareReplyImage(file, currentController.signal);
    if (!mounted || version !== requestVersion || currentController.signal.aborted) return;
    sourceFile.value = file;
    sourceWidth.value = prepared.width;
    sourceHeight.value = prepared.height;
    const url = URL.createObjectURL(file);
    objectUrl = url;
    previewUrl.value = url;
  } catch (cause) {
    if (!mounted || version !== requestVersion || currentController.signal.aborted) return;
    error.value = cause instanceof Error ? cause.message : "图片处理失败，请重新选择图片";
  } finally {
    if (controller === currentController) {
      controller = undefined;
      loading.value = false;
    }
  }
}

function handleCropImageLoad(event: Event): void {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
  sourceWidth.value = image.naturalWidth;
  sourceHeight.value = image.naturalHeight;
  updateCropStageSize();
}

/**
 * 记录裁切舞台尺寸，供圆形选框定位使用。
 * @since Beta v0.13.1
 */
function updateCropStageSize(): void {
  const stage = cropStage.value;
  if (!stage) return;
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (width === cropStageSize.value.width && height === cropStageSize.value.height) return;
  cropStageSize.value = { width, height };
}

function handleCropKeydown(event: KeyboardEvent): void {
  if (props.disabled || preparing.value) return;
  const step = event.shiftKey ? 0.1 : 0.02;
  let x = crop.value.x;
  let y = crop.value.y;
  switch (event.key) {
    case "ArrowLeft":
      x -= step;
      break;
    case "ArrowRight":
      x += step;
      break;
    case "ArrowUp":
      y -= step;
      break;
    case "ArrowDown":
      y += step;
      break;
    case "Home":
      x = 0.5;
      y = 0.5;
      break;
    default:
      return;
  }
  event.preventDefault();
  crop.value = {
    x: normalizeCropPosition(x),
    y: normalizeCropPosition(y),
  };
}

function handleCropPointerDown(event: PointerEvent): void {
  if (props.disabled || preparing.value || event.button !== 0 || !event.isPrimary) return;
  const stage = cropStage.value;
  if (!stage) return;
  updateCropStageSize();
  cropDragging.value = true;
  cropPointerId = event.pointerId;
  cropStartX = event.clientX;
  cropStartY = event.clientY;
  cropStartPosition = { ...crop.value };
  stage.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleCropPointerMove(event: PointerEvent): void {
  if (!cropDragging.value || event.pointerId !== cropPointerId) return;
  updateCropStageSize();
  const stage = cropStageSize.value;
  if (stage.width <= 0 || stage.height <= 0 || sourceWidth.value <= 0 || sourceHeight.value <= 0) {
    return;
  }
  const scale = Math.min(stage.width / sourceWidth.value, stage.height / sourceHeight.value);
  const imageWidth = sourceWidth.value * scale;
  const imageHeight = sourceHeight.value * scale;
  const square = Math.min(imageWidth, imageHeight);
  const overflowX = imageWidth - square;
  const overflowY = imageHeight - square;
  const deltaX = event.clientX - cropStartX;
  const deltaY = event.clientY - cropStartY;
  crop.value = {
    x: overflowX > 0 ? normalizeCropPosition(cropStartPosition.x + deltaX / overflowX) : 0.5,
    y: overflowY > 0 ? normalizeCropPosition(cropStartPosition.y + deltaY / overflowY) : 0.5,
  };
}

function handleCropPointerUp(event: PointerEvent): void {
  if (event.pointerId !== cropPointerId) return;
  const stage = cropStage.value;
  cropDragging.value = false;
  cropPointerId = undefined;
  if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
}

function resetCrop(): void {
  if (props.disabled || preparing.value) return;
  crop.value = { x: 0.5, y: 0.5 };
}

function normalizeCropPosition(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function normalizeCrop(
  cropPosition: TGApp.BBS.CommunitySettings.AvatarCrop | undefined,
): TGApp.BBS.CommunitySettings.AvatarCrop {
  return {
    x: normalizeCropPosition(cropPosition?.x),
    y: normalizeCropPosition(cropPosition?.y),
  };
}

function releaseObjectUrl(): void {
  if (objectUrl !== undefined) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = undefined;
  }
  previewUrl.value = "";
}

function invalidatePicker(): void {
  pickerRequestVersion = undefined;
}

function clearInput(): void {
  invalidatePicker();
  if (fileInput.value) fileInput.value.value = "";
}

function chooseFile(): void {
  if (props.disabled || loading.value || preparing.value) return;
  pickerRequestVersion = requestVersion;
  fileInput.value?.click();
}

function handleFileChange(event: Event): void {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input !== fileInput.value) return;
  const pickerVersion = pickerRequestVersion;
  pickerRequestVersion = undefined;
  const file = input.files?.[0];
  input.value = "";
  if (!file || props.disabled || pickerVersion !== requestVersion) return;
  void validateFile(file);
}

/**
 * 生成裁切后的头像并向外确认。
 * @since Beta v0.13.1
 * @returns 处理完成后的 Promise
 */
async function confirm(): Promise<void> {
  if (!ready.value) return;
  const file = sourceFile.value;
  if (!file) return;
  const version = ++requestVersion;
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  error.value = "";
  preparing.value = true;
  const cropPosition = { ...crop.value };
  try {
    const result = await prepareCustomAvatar(file, {
      crop: cropPosition,
      signal: currentController.signal,
    });
    if (!mounted || version !== requestVersion || currentController.signal.aborted) return;
    emits("confirm", { file: result, sourceFile: file, crop: cropPosition });
  } catch (cause) {
    if (!mounted || version !== requestVersion || currentController.signal.aborted) return;
    error.value = cause instanceof Error ? cause.message : "图片处理失败，请重新选择图片";
  } finally {
    if (controller === currentController) {
      controller = undefined;
      preparing.value = false;
    }
  }
}

defineExpose({
  confirm,
  get previewUrl(): string {
    return previewUrl.value;
  },
  get previewPosition(): string {
    return `${crop.value.x * 100}% ${crop.value.y * 100}%`;
  },
});
</script>

<style lang="scss" scoped>
.cpac-scroll {
  overflow: hidden auto;
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  padding: 16px;
  overscroll-behavior: contain;
}

.cpac-custom {
  display: flex;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  gap: 10px;
  text-align: center;
}

.cpac-custom-visual {
  display: flex;
  max-width: 100%;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.cpac-custom-info {
  display: flex;
  min-width: 0;
  max-width: 420px;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.cpac-crop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cpac-crop-stage {
  position: relative;
  overflow: hidden;
  width: 190px;
  max-width: 100%;
  height: 190px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--box-bg-1);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &.is-dragging {
    cursor: grabbing;
  }
}

.cpac-crop-window {
  position: absolute;
  border: 2px solid var(--common-text-title);
  border-radius: 50%;
  background: transparent;
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 35%);
  pointer-events: none;
}

.cpac-crop-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.cpac-crop-hint {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 18px;
}

.cpac-custom-preview {
  display: flex;
  width: 160px;
  height: 160px;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 50%;
  margin: 0;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  cursor: pointer;
  font: inherit;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-text-title);
    background: var(--box-bg-3);
  }
}

.cpac-custom-copy {
  display: flex;
  max-width: 100%;
  flex-direction: column;
  gap: 4px;
  text-align: center;

  h3,
  p {
    margin: 0;
  }

  h3 {
    overflow: hidden;
    max-width: 100%;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
  }
}

.cpac-custom-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cpac-custom-state {
  max-width: 420px;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;

  &.is-error {
    color: var(--common-text-title);
  }
}

@media (width <= 640px) {
  .cpac-custom {
    padding: 12px;
    gap: 10px;
  }

  .cpac-custom-info {
    max-width: 100%;
  }

  .cpac-crop-stage {
    width: 100%;
    height: 170px;
  }

  .cpac-custom-preview {
    width: 150px;
    height: 150px;
  }
}
</style>
