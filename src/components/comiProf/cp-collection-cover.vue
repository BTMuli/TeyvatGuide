<!-- 合集封面选择与上传 -->
<template>
  <div class="cpcc-cover-row">
    <div
      :aria-disabled="coverDisabled ? 'true' : undefined"
      :aria-label="hasCover ? '更换合集封面' : '添加合集封面'"
      :tabindex="coverDisabled ? -1 : 0"
      class="cpcc-cover"
      role="button"
      @click="chooseCover"
      @keydown.enter.prevent="chooseCover"
      @keydown.space.prevent="chooseCover"
    >
      <TMiImg v-if="coverUrl" :src="coverUrl" alt="合集封面预览" />
      <v-icon v-else aria-hidden="true" size="36">mdi-image-plus-outline</v-icon>
      <span v-if="uploading" aria-hidden="true" class="cpcc-cover-mask">
        <v-progress-circular indeterminate size="24" tag="span" />
      </span>
    </div>
    <div class="cpcc-cover-actions">
      <h3>{{ uploading ? "正在上传封面…" : hasCover ? "合集封面" : "添加封面" }}</h3>
      <p>可选，建议使用 1:1 图片，支持 PNG、JPEG、GIF、WebP。</p>
      <div class="cpcc-cover-buttons">
        <v-btn
          :disabled="props.disabled || uploading"
          :prepend-icon="hasCover ? 'mdi-image-edit-outline' : 'mdi-upload'"
          size="small"
          type="button"
          variant="tonal"
          @click="chooseCover"
        >
          {{ hasCover ? "更换封面" : "选择封面" }}
        </v-btn>
        <v-btn
          v-if="hasCover && !uploading"
          :disabled="props.disabled"
          color="var(--tgc-od-red)"
          size="small"
          type="button"
          variant="tonal"
          @click="clearCover"
        >
          移除
        </v-btn>
      </div>
    </div>
    <input
      ref="fileInput"
      :disabled="props.disabled || uploading"
      accept="image/jpeg,image/png,image/gif,image/webp"
      hidden
      type="file"
      @change="handleCoverChange"
    />
  </div>
  <div v-if="error" aria-live="assertive" class="cpcc-error" role="alert">
    <v-icon size="18">mdi-alert-circle-outline</v-icon>
    <span>{{ error }}</span>
  </div>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import replyAssetReq from "@req/replyAssetReq.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";

/**
 * 封面上传凭据。
 * @since Beta v0.13.1
 */
type CollectionCoverCookie = {
  /** 米游社登录令牌 */
  ltoken: string;
  /** 米游社账号 ID */
  ltuid: string;
};

/**
 * 合集封面参数。
 * @since Beta v0.13.1
 */
type CollectionCoverProps = {
  /** 上传凭据，缺失时禁止上传 */
  cookie?: CollectionCoverCookie;
  /** 是否禁用操作 */
  disabled?: boolean;
};

type CollectionCoverEmits = {
  /** 上传状态变化 */
  busy: [busy: boolean];
};

const props = withDefaults(defineProps<CollectionCoverProps>(), {
  disabled: false,
});
const cover = defineModel<string>({ required: true });
const emits = defineEmits<CollectionCoverEmits>();

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const uploading = ref<boolean>(false);
const error = ref<string>("");
const previewUrl = ref<string>("");
let previewObjectUrl: string | undefined;
let uploadController: AbortController | undefined;
let uploadVersion = 0;
let active = true;
const coverUrl = computed<string>(() => previewUrl.value || cover.value);
const hasCover = computed<boolean>(() => coverUrl.value !== "");
const coverDisabled = computed<boolean>(() => props.disabled || uploading.value);

watch(cover, () => releasePreview());
watch(uploading, (value) => emits("busy", value));

onMounted(() => emits("busy", uploading.value));

onBeforeUnmount(() => {
  active = false;
  uploadVersion += 1;
  uploadController?.abort();
  releasePreview();
});

function releasePreview(): void {
  if (previewObjectUrl !== undefined) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = undefined;
  }
  previewUrl.value = "";
}

function chooseCover(): void {
  if (props.disabled || uploading.value) return;
  fileInput.value?.click();
}

function clearCover(): void {
  if (props.disabled || uploading.value) return;
  uploadVersion += 1;
  uploadController?.abort();
  uploadController = undefined;
  uploading.value = false;
  error.value = "";
  cover.value = "";
  releasePreview();
  if (fileInput.value) fileInput.value.value = "";
}

async function handleCoverChange(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  if (!file || props.disabled) return;
  if (!props.cookie) {
    error.value = "当前账号凭据不可用，请重新登录米游社账号。";
    return;
  }
  uploadController?.abort();
  const controller = new AbortController();
  uploadController = controller;
  const version = ++uploadVersion;
  releasePreview();
  const objectUrl = URL.createObjectURL(file);
  previewObjectUrl = objectUrl;
  previewUrl.value = objectUrl;
  uploading.value = true;
  error.value = "";
  try {
    const image = await replyAssetReq.uploadImage(
      file,
      { ltoken: props.cookie.ltoken, ltuid: props.cookie.ltuid },
      2,
      controller.signal,
    );
    if (!active || version !== uploadVersion || controller.signal.aborted) return;
    cover.value = image.url;
    releasePreview();
  } catch (cause) {
    if (!active || version !== uploadVersion || controller.signal.aborted) return;
    releasePreview();
    error.value = `封面上传失败：${TGHttps.getErrMsg(cause)}`;
  } finally {
    if (uploadController === controller) {
      uploadController = undefined;
      uploading.value = false;
    }
  }
}
</script>

<style lang="scss" scoped>
.cpcc-cover-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cpcc-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 96px;
  height: 96px;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: default;
    opacity: 0.6;
  }

  &:hover:not([aria-disabled="true"]) {
    border-color: var(--common-text-title);
    color: var(--common-text-title);
  }

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cpcc-cover-mask {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 48%);
  inset: 0;
}

.cpcc-cover-actions {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
  }
}

.cpcc-cover-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cpcc-error {
  display: flex;
  align-items: flex-start;
  color: var(--tgc-od-red);
  font-size: 12px;
  gap: 6px;
  line-height: 18px;
  overflow-wrap: anywhere;

  :deep(.v-icon) {
    flex: none;
  }
}

@media (width <= 640px) {
  .cpcc-cover-row {
    align-items: flex-start;
    gap: 12px;
  }

  .cpcc-cover {
    width: 80px;
    height: 80px;
  }
}
</style>
