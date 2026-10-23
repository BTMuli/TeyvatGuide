<!-- 米游社头像选择对话框 -->
<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    class="cpap-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    :width="720"
    z-index="80"
  >
    <section class="cpap-panel">
      <header class="cpap-header">
        <div class="cpap-heading">
          <h2 :id="titleId">选择头像</h2>
          <p>从米游社预设头像或已拥有的动态头像中选择，也可以上传自定义头像。</p>
        </div>
        <v-btn
          aria-label="关闭头像选择"
          icon="mdi-close"
          size="32"
          title="关闭"
          type="button"
          variant="text"
          @click="visible = false"
        />
      </header>

      <v-tabs
        v-model="activeTab"
        aria-label="头像来源"
        class="cpap-tabs"
        color="var(--common-text-title)"
        density="compact"
        show-arrows
      >
        <v-tab value="preset">预设头像</v-tab>
        <v-tab value="dynamic">动态头像</v-tab>
        <v-tab value="custom">自定义头像</v-tab>
      </v-tabs>
      <div class="cpap-body">
        <template v-if="activeTab === 'custom'">
          <div class="cpap-scroll">
            <section aria-label="自定义头像" class="cpap-custom" role="group">
              <div class="cpap-custom-visual">
                <div v-if="customSourceFile && customPreviewUrl" class="cpap-crop">
                  <div
                    ref="cropStage"
                    :aria-describedby="cropHintId"
                    :aria-label="`自定义头像裁切预览：${customSourceFile.name}`"
                    :class="{ 'is-dragging': cropDragging }"
                    class="cpap-crop-stage"
                    role="group"
                    :tabindex="props.disabled || customPreparing ? -1 : 0"
                    @keydown="handleCropKeydown"
                    @pointercancel="handleCropPointerUp"
                    @pointerdown="handleCropPointerDown"
                    @pointermove="handleCropPointerMove"
                    @pointerup="handleCropPointerUp"
                  >
                    <img
                      :alt="`${customSourceFile.name} 裁切预览`"
                      class="cpap-crop-image"
                      decoding="async"
                      draggable="false"
                      :src="customPreviewUrl"
                      @load="handleCropImageLoad"
                    />
                    <div aria-hidden="true" class="cpap-crop-window" :style="cropWindowStyle" />
                  </div>
                  <p :id="cropHintId" class="cpap-crop-hint">
                    拖动圆形选框调整裁切位置，方向键可微调。
                  </p>
                </div>
                <button
                  v-else
                  :disabled="props.disabled || customLoading || customPreparing"
                  aria-label="上传自定义头像"
                  class="cpap-custom-preview"
                  title="选择图片"
                  type="button"
                  @click="chooseCustomFile"
                >
                  <v-icon size="48">mdi-image-plus-outline</v-icon>
                </button>
              </div>
              <div class="cpap-custom-info">
                <div class="cpap-custom-copy">
                  <h3 :title="customSourceFile?.name">
                    {{ customSourceFile?.name || "上传自定义头像" }}
                  </h3>
                  <p>支持原始 PNG、JPEG、GIF、WebP，文件大小不超过 20 MiB。</p>
                  <p>图片会保存为静态头像，并随资料提交米游社审核。</p>
                </div>
                <div class="cpap-custom-actions">
                  <v-btn
                    :disabled="props.disabled || customLoading || customPreparing"
                    prepend-icon="mdi-upload"
                    type="button"
                    variant="tonal"
                    @click="chooseCustomFile"
                  >
                    {{ customSourceFile ? "重新选择图片" : "选择图片" }}
                  </v-btn>
                  <v-btn
                    v-if="customSourceFile"
                    :disabled="props.disabled || customPreparing"
                    prepend-icon="mdi-image-filter-center-focus"
                    type="button"
                    variant="text"
                    @click="resetCrop"
                  >
                    居中
                  </v-btn>
                </div>
                <div
                  v-if="customLoading"
                  aria-live="polite"
                  class="cpap-custom-state"
                  role="status"
                >
                  正在读取图片…
                </div>
                <div
                  v-else-if="customPreparing"
                  aria-live="polite"
                  class="cpap-custom-state"
                  role="status"
                >
                  正在生成头像…
                </div>
                <div
                  v-if="customError"
                  aria-live="assertive"
                  class="cpap-custom-state is-error"
                  role="alert"
                >
                  {{ customError }}
                </div>
              </div>
            </section>
          </div>
          <input
            ref="customInput"
            :disabled="props.disabled || customLoading || customPreparing"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            type="file"
            @cancel="clearCustomInput"
            @change="handleCustomFileChange"
          />
        </template>
        <template v-else-if="activeTab === 'dynamic'">
          <div class="cpap-scroll">
            <div v-if="props.dynamicLoading" aria-live="polite" class="cpap-state" role="status">
              <v-progress-circular indeterminate size="28" />
              <p>正在加载动态头像…</p>
            </div>
            <div
              v-else-if="props.dynamicError"
              aria-live="assertive"
              class="cpap-state"
              role="alert"
            >
              <v-icon size="32">mdi-alert-circle-outline</v-icon>
              <p>{{ props.dynamicError }}</p>
              <v-btn
                :disabled="props.disabled"
                type="button"
                variant="tonal"
                @click="emits('retryDynamic')"
              >
                重新加载
              </v-btn>
            </div>
            <div v-else-if="props.dynamicAvatars.length === 0" class="cpap-state" role="status">
              <v-icon size="32">mdi-account-box-outline</v-icon>
              <p>暂无可用的动态头像</p>
            </div>
            <div v-else aria-label="可选动态头像" class="cpap-grid" role="group">
              <button
                v-for="avatar in props.dynamicAvatars"
                :key="avatar.id"
                :aria-label="`选择动态头像 ${avatar.name || avatar.id}`"
                :aria-pressed="selectedDynamicId === avatar.id"
                :class="{ 'is-selected': selectedDynamicId === avatar.id }"
                class="cpap-avatar"
                :disabled="props.disabled"
                :title="avatar.name"
                type="button"
                @click="selectedDynamicId = avatar.id"
              >
                <img :alt="avatar.name" decoding="async" loading="lazy" :src="avatar.url" />
                <span v-if="selectedDynamicId === avatar.id" aria-hidden="true" class="cpap-check">
                  <v-icon size="14">mdi-check</v-icon>
                </span>
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <v-tabs
            v-if="!loading && !error && groups.length > 0"
            v-model="activeGroupName"
            aria-label="头像分组"
            class="cpap-group-tabs"
            color="var(--common-text-title)"
            density="compact"
            show-arrows
          >
            <v-tab v-for="group in groups" :key="group.name" :value="group.name">
              {{ group.name }}
            </v-tab>
          </v-tabs>
          <div class="cpap-scroll">
            <div v-if="loading" aria-live="polite" class="cpap-state" role="status">
              <v-progress-circular indeterminate size="28" />
              <p>正在加载头像列表…</p>
            </div>
            <div v-else-if="error" aria-live="assertive" class="cpap-state" role="alert">
              <v-icon size="32">mdi-alert-circle-outline</v-icon>
              <p>{{ error }}</p>
              <v-btn
                :disabled="props.disabled"
                type="button"
                variant="tonal"
                @click="emits('retry')"
              >
                重新加载
              </v-btn>
            </div>
            <div v-else-if="groups.length === 0" class="cpap-state" role="status">
              <v-icon size="32">mdi-image-off-outline</v-icon>
              <p>暂无可选头像</p>
            </div>
            <div v-else-if="activeGroup" aria-label="可选头像" class="cpap-grid" role="group">
              <button
                v-for="avatar in activeGroup.list"
                :key="avatar.id"
                :aria-label="`选择头像 ${avatar.name || avatar.id}`"
                :aria-pressed="selectedId === String(avatar.id)"
                :class="{ 'is-selected': selectedId === String(avatar.id) }"
                class="cpap-avatar"
                :disabled="props.disabled"
                :title="avatar.name"
                type="button"
                @click="selectedId = String(avatar.id)"
              >
                <img :alt="avatar.name" decoding="async" loading="lazy" :src="avatar.icon" />
                <span v-if="selectedId === String(avatar.id)" aria-hidden="true" class="cpap-check">
                  <v-icon size="14">mdi-check</v-icon>
                </span>
              </button>
            </div>
          </div>
        </template>
      </div>

      <footer class="cpap-footer">
        <v-btn type="button" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          :disabled="!canConfirm"
          class="cpap-confirm"
          type="button"
          variant="flat"
          @click="handleConfirm"
        >
          {{ activeTab === "custom" ? "使用自定义头像" : "使用该头像" }}
        </v-btn>
      </footer>
    </section>
  </v-dialog>
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
 * 头像选择对话框参数。
 * @since Beta v0.13.0
 */
type AvatarPickerProps = {
  /** 可选预设头像分组 */
  groups: Array<TGApp.BBS.CommunitySettings.AvatarGroup>;
  /** 已拥有的动态头像 */
  dynamicAvatars: Array<TGApp.BBS.CommunitySettings.DynamicAvatar>;
  /** 当前预设头像编号 */
  currentId: string;
  /** 当前动态头像资源编号 */
  currentAssetId: string;
  /** 当前待保存的自定义头像源文件 */
  currentCustomSource?: File;
  /** 当前自定义头像裁切位置 */
  currentCrop?: TGApp.BBS.CommunitySettings.AvatarCrop;
  /** 是否正在加载预设头像 */
  loading: boolean;
  /** 预设头像加载错误 */
  error: string;
  /** 是否正在加载动态头像 */
  dynamicLoading: boolean;
  /** 动态头像加载错误 */
  dynamicError: string;
  /** 是否禁用操作 */
  disabled?: boolean;
};

type AvatarPickerTab = "preset" | "dynamic" | "custom";

const props = withDefaults(defineProps<AvatarPickerProps>(), {
  disabled: false,
});
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{
  confirm: [avatar: TGApp.BBS.CommunitySettings.Avatar];
  confirmDynamic: [avatar: TGApp.BBS.CommunitySettings.DynamicAvatar];
  confirmCustom: [selection: TGApp.BBS.CommunitySettings.CustomAvatarSelection];
  retry: [];
  retryDynamic: [];
}>();

const titleId = useId();
const cropHintId = useId();
const customInput = useTemplateRef<HTMLInputElement>("customInput");
const cropStage = useTemplateRef<HTMLElement>("cropStage");
const activeTab = ref<AvatarPickerTab>("preset");
const activeGroupName = ref<string>("");
const selectedId = ref<string>("");
const selectedDynamicId = ref<string>("");
const customSourceFile = shallowRef<File>();
const customPreviewUrl = ref<string>("");
const customSourceWidth = ref<number>(0);
const customSourceHeight = ref<number>(0);
const customCrop = ref<TGApp.BBS.CommunitySettings.AvatarCrop>({ x: 0.5, y: 0.5 });
const cropStageSize = ref<{ width: number; height: number }>({ width: 0, height: 0 });
const customError = ref<string>("");
const customLoading = ref<boolean>(false);
const customPreparing = ref<boolean>(false);
const cropDragging = ref<boolean>(false);
let customObjectUrl: string | undefined;
let customRequestVersion = 0;
let customController: AbortController | undefined;
let customPickerRequestVersion: number | undefined;
let cropPointerId: number | undefined;
let cropStartX = 0;
let cropStartY = 0;
let cropStartPosition: TGApp.BBS.CommunitySettings.AvatarCrop = { x: 0.5, y: 0.5 };
let mounted = true;
const activeGroup = computed<TGApp.BBS.CommunitySettings.AvatarGroup | undefined>(() => {
  return props.groups.find((group) => group.name === activeGroupName.value) ?? props.groups[0];
});
const selectedAvatar = computed<TGApp.BBS.CommunitySettings.Avatar | undefined>(() => {
  if (!selectedId.value) return undefined;
  for (const group of props.groups) {
    const avatar = group.list.find((item) => String(item.id) === selectedId.value);
    if (avatar) return avatar;
  }
  return undefined;
});
const selectedDynamic = computed<TGApp.BBS.CommunitySettings.DynamicAvatar | undefined>(() => {
  return props.dynamicAvatars.find((avatar) => avatar.id === selectedDynamicId.value);
});
const cropWindowStyle = computed<CSSProperties>(() => {
  const stage = cropStageSize.value;
  const sourceWidth = customSourceWidth.value;
  const sourceHeight = customSourceHeight.value;
  if (stage.width <= 0 || stage.height <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return { display: "none" };
  }
  const scale = Math.min(stage.width / sourceWidth, stage.height / sourceHeight);
  const imageWidth = sourceWidth * scale;
  const imageHeight = sourceHeight * scale;
  const square = Math.min(imageWidth, imageHeight);
  return {
    width: `${square}px`,
    height: `${square}px`,
    left: `${(stage.width - imageWidth) / 2 + (imageWidth - square) * customCrop.value.x}px`,
    top: `${(stage.height - imageHeight) / 2 + (imageHeight - square) * customCrop.value.y}px`,
  };
});
const canConfirm = computed<boolean>(() => {
  if (props.disabled) return false;
  if (activeTab.value === "custom") {
    return (
      customSourceFile.value !== undefined &&
      customPreviewUrl.value !== "" &&
      customSourceWidth.value > 0 &&
      customSourceHeight.value > 0 &&
      !customLoading.value &&
      !customPreparing.value
    );
  }
  if (activeTab.value === "dynamic") {
    if (props.dynamicLoading || props.dynamicError) return false;
    return selectedDynamic.value !== undefined && selectedDynamicId.value !== props.currentAssetId;
  }
  if (props.loading || props.error) return false;
  return selectedAvatar.value !== undefined && selectedId.value !== props.currentId;
});

watch(
  visible,
  (isOpen) => {
    if (isOpen) initializeSelection();
    else clearCustomSelection();
  },
  { immediate: true },
);

watch(
  () => props.groups,
  () => {
    if (visible.value) initializePresetSelection();
  },
);

watch(
  () => props.currentCustomSource,
  (file) => {
    if (visible.value) syncCurrentCustomSource(file, props.currentCrop);
  },
);

onMounted(() => {
  window.addEventListener("resize", updateCropStageSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateCropStageSize);
  mounted = false;
  clearCustomSelection();
});

function initializeSelection(): void {
  initializePresetSelection();
  selectedDynamicId.value = props.currentAssetId;
  if (props.currentCustomSource) {
    activeTab.value = "custom";
    syncCurrentCustomSource(props.currentCustomSource, props.currentCrop);
    return;
  }
  clearCustomSelection();
  activeTab.value = props.currentAssetId ? "dynamic" : "preset";
}

function initializePresetSelection(): void {
  const matchedGroup = props.groups.find((group) => {
    return group.list.some((item) => String(item.id) === props.currentId);
  });
  activeGroupName.value = matchedGroup?.name ?? props.groups[0]?.name ?? "";
  selectedId.value = matchedGroup ? props.currentId : "";
}

function syncCurrentCustomSource(
  file: File | undefined,
  crop: TGApp.BBS.CommunitySettings.AvatarCrop | undefined,
): void {
  customRequestVersion += 1;
  customController?.abort();
  customController = undefined;
  customLoading.value = false;
  customPreparing.value = false;
  invalidateCustomPicker();
  releaseCustomObjectUrl();
  customSourceFile.value = file;
  customSourceWidth.value = 0;
  customSourceHeight.value = 0;
  customCrop.value = normalizeCrop(crop);
  customError.value = "";
  if (file === undefined) return;
  const objectUrl = URL.createObjectURL(file);
  customObjectUrl = objectUrl;
  customPreviewUrl.value = objectUrl;
}

async function validateCustomFile(file: File): Promise<void> {
  const version = ++customRequestVersion;
  customController?.abort();
  const controller = new AbortController();
  customController = controller;
  releaseCustomObjectUrl();
  customSourceFile.value = undefined;
  customSourceWidth.value = 0;
  customSourceHeight.value = 0;
  customCrop.value = { x: 0.5, y: 0.5 };
  customError.value = "";
  customLoading.value = true;
  try {
    const prepared = await prepareReplyImage(file, controller.signal);
    if (!mounted || version !== customRequestVersion || controller.signal.aborted) return;
    customSourceFile.value = file;
    customSourceWidth.value = prepared.width;
    customSourceHeight.value = prepared.height;
    const objectUrl = URL.createObjectURL(file);
    customObjectUrl = objectUrl;
    customPreviewUrl.value = objectUrl;
  } catch (cause) {
    if (!mounted || version !== customRequestVersion || controller.signal.aborted) return;
    customError.value = cause instanceof Error ? cause.message : "图片处理失败，请重新选择图片";
  } finally {
    if (customController === controller) {
      customController = undefined;
      customLoading.value = false;
    }
  }
}

function handleCropImageLoad(event: Event): void {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
  customSourceWidth.value = image.naturalWidth;
  customSourceHeight.value = image.naturalHeight;
  updateCropStageSize();
}

/**
 * 记录裁切舞台尺寸，供圆形选框定位使用。
 * @since Beta v0.13.0
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
  if (props.disabled || customPreparing.value) return;
  const step = event.shiftKey ? 0.1 : 0.02;
  let x = customCrop.value.x;
  let y = customCrop.value.y;
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
  customCrop.value = {
    x: normalizeCropPosition(x),
    y: normalizeCropPosition(y),
  };
}

function handleCropPointerDown(event: PointerEvent): void {
  if (props.disabled || customPreparing.value || event.button !== 0 || !event.isPrimary) return;
  const stage = cropStage.value;
  if (!stage) return;
  updateCropStageSize();
  cropDragging.value = true;
  cropPointerId = event.pointerId;
  cropStartX = event.clientX;
  cropStartY = event.clientY;
  cropStartPosition = { ...customCrop.value };
  stage.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleCropPointerMove(event: PointerEvent): void {
  if (!cropDragging.value || event.pointerId !== cropPointerId) return;
  updateCropStageSize();
  const stage = cropStageSize.value;
  if (
    stage.width <= 0 ||
    stage.height <= 0 ||
    customSourceWidth.value <= 0 ||
    customSourceHeight.value <= 0
  ) {
    return;
  }
  const scale = Math.min(
    stage.width / customSourceWidth.value,
    stage.height / customSourceHeight.value,
  );
  const imageWidth = customSourceWidth.value * scale;
  const imageHeight = customSourceHeight.value * scale;
  const square = Math.min(imageWidth, imageHeight);
  const overflowX = imageWidth - square;
  const overflowY = imageHeight - square;
  const deltaX = event.clientX - cropStartX;
  const deltaY = event.clientY - cropStartY;
  customCrop.value = {
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
  if (props.disabled || customPreparing.value) return;
  customCrop.value = { x: 0.5, y: 0.5 };
}

function normalizeCropPosition(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function normalizeCrop(
  crop: TGApp.BBS.CommunitySettings.AvatarCrop | undefined,
): TGApp.BBS.CommunitySettings.AvatarCrop {
  return {
    x: normalizeCropPosition(crop?.x),
    y: normalizeCropPosition(crop?.y),
  };
}

function releaseCustomObjectUrl(): void {
  if (customObjectUrl !== undefined) {
    URL.revokeObjectURL(customObjectUrl);
    customObjectUrl = undefined;
  }
  customPreviewUrl.value = "";
}

function invalidateCustomPicker(): void {
  customPickerRequestVersion = undefined;
}

function clearCustomInput(): void {
  invalidateCustomPicker();
  if (customInput.value) customInput.value.value = "";
}

function clearCustomSelection(): void {
  customRequestVersion += 1;
  customController?.abort();
  customController = undefined;
  customLoading.value = false;
  customPreparing.value = false;
  cropDragging.value = false;
  cropPointerId = undefined;
  releaseCustomObjectUrl();
  customSourceFile.value = undefined;
  customSourceWidth.value = 0;
  customSourceHeight.value = 0;
  customCrop.value = { x: 0.5, y: 0.5 };
  customError.value = "";
  clearCustomInput();
}

function chooseCustomFile(): void {
  if (props.disabled || customLoading.value || customPreparing.value) return;
  customPickerRequestVersion = customRequestVersion;
  customInput.value?.click();
}

function handleCustomFileChange(event: Event): void {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input !== customInput.value) return;
  const pickerRequestVersion = customPickerRequestVersion;
  customPickerRequestVersion = undefined;
  const file = input.files?.[0];
  input.value = "";
  if (!file || props.disabled || !visible.value || pickerRequestVersion !== customRequestVersion)
    return;
  void validateCustomFile(file);
}

async function handleConfirm(): Promise<void> {
  if (!canConfirm.value) return;
  if (activeTab.value === "custom") {
    const sourceFile = customSourceFile.value;
    if (!sourceFile) return;
    const version = ++customRequestVersion;
    customController?.abort();
    const controller = new AbortController();
    customController = controller;
    customError.value = "";
    customPreparing.value = true;
    const crop = { ...customCrop.value };
    try {
      const file = await prepareCustomAvatar(sourceFile, {
        crop,
        signal: controller.signal,
      });
      if (!mounted || version !== customRequestVersion || controller.signal.aborted) return;
      emits("confirmCustom", { file, sourceFile, crop });
    } catch (cause) {
      if (!mounted || version !== customRequestVersion || controller.signal.aborted) return;
      customError.value = cause instanceof Error ? cause.message : "图片处理失败，请重新选择图片";
    } finally {
      if (customController === controller) {
        customController = undefined;
        customPreparing.value = false;
      }
    }
    return;
  }
  if (activeTab.value === "dynamic") {
    if (selectedDynamic.value) emits("confirmDynamic", selectedDynamic.value);
    return;
  }
  if (selectedAvatar.value) emits("confirm", selectedAvatar.value);
}
</script>

<style lang="scss" scoped>
.cpap-panel {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 600px;
  max-height: calc(100dvh - 48px);
  box-sizing: border-box;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
}

.cpap-header {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.cpap-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cpap-tabs {
  flex: none;
  padding: 0 16px;
  border-bottom: 1px solid var(--common-shadow-1);

  :deep(.v-tab) {
    font-size: 13px;
    letter-spacing: 0;
    text-transform: none;
  }
}

.cpap-group-tabs {
  flex: none;
  padding: 0 16px;
  border-bottom: 1px solid var(--common-shadow-1);

  :deep(.v-tab) {
    font-size: 13px;
    letter-spacing: 0;
    text-transform: none;
  }
}

.cpap-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.cpap-scroll {
  overflow: hidden auto;
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  padding: 16px;
  overscroll-behavior: contain;
}

.cpap-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
}

.cpap-custom {
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

.cpap-custom-visual {
  display: flex;
  max-width: 100%;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.cpap-custom-info {
  display: flex;
  min-width: 0;
  max-width: 420px;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.cpap-crop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cpap-crop-stage {
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

.cpap-crop-window {
  position: absolute;
  border: 2px solid var(--common-text-title);
  border-radius: 50%;
  background: transparent;
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 35%);
  pointer-events: none;
}

.cpap-crop-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.cpap-crop-hint {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 18px;
}

.cpap-custom-preview {
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

.cpap-custom-copy {
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

.cpap-custom-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cpap-custom-state {
  max-width: 420px;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;

  &.is-error {
    color: var(--common-text-title);
  }
}

.cpap-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 50%;
  margin: 0;
  aspect-ratio: 1;
  background: var(--box-bg-2);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--common-text-title);
    background: var(--box-bg-3);
  }
}

.cpap-check {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--common-text-title);
  color: var(--box-bg-1);
}

.cpap-state {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--box-text-4);
  gap: 8px;
  text-align: center;

  p {
    margin: 0;
  }
}

.cpap-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.cpap-confirm {
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--box-text-4);

  &:enabled {
    background: var(--common-text-title);
    color: var(--app-page-bg);
  }
}

@media (width <= 640px) {
  .cpap-header,
  .cpap-scroll,
  .cpap-footer {
    padding: 12px;
  }

  .cpap-grid {
    gap: 6px;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  }

  .cpap-custom {
    padding: 12px;
    gap: 10px;
  }

  .cpap-custom-info {
    max-width: 100%;
  }

  .cpap-crop-stage {
    width: 100%;
    height: 170px;
  }

  .cpap-crop-window {
    width: 140px;
    height: 140px;
  }

  .cpap-custom-preview {
    width: 150px;
    height: 150px;
  }

  .cpap-group-tabs {
    padding: 0 12px;
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.cpap-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
