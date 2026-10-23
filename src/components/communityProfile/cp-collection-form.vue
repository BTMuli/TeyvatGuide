<!-- 米游社合集创建与编辑对话框 -->
<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    class="cpcf-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    :persistent="saving || uploading"
    :width="560"
    z-index="80"
  >
    <section class="cpcf-panel">
      <header class="cpcf-header">
        <div class="cpcf-heading">
          <h2 :id="titleId">{{ isEditing ? "编辑合集" : "创建合集" }}</h2>
          <p>
            {{
              isEditing
                ? "修改合集标题、描述和封面，保存后立即生效。"
                : "创建合集后可整理自己的作品，标题最多 15 字，描述最多 80 字。"
            }}
          </p>
        </div>
        <v-btn
          :aria-label="isEditing ? '关闭编辑合集' : '关闭创建合集'"
          :disabled="saving || uploading"
          icon="mdi-close"
          size="32"
          title="关闭"
          type="button"
          variant="text"
          @click="visible = false"
        />
      </header>

      <form class="cpcf-form" @submit.prevent="handleSubmit">
        <div class="cpcf-body">
          <div class="cpcf-cover-row">
            <button
              :aria-label="hasCover ? '更换合集封面' : '添加合集封面'"
              :disabled="saving || uploading"
              class="cpcf-cover"
              type="button"
              @click="chooseCover"
            >
              <TMiImg v-if="coverUrl" :src="coverUrl" alt="合集封面预览" />
              <v-icon v-else aria-hidden="true" size="36">mdi-image-plus-outline</v-icon>
              <span v-if="uploading" aria-hidden="true" class="cpcf-cover-mask">
                <v-progress-circular indeterminate size="24" />
              </span>
            </button>
            <div class="cpcf-cover-actions">
              <h3>{{ uploading ? "正在上传封面…" : hasCover ? "合集封面" : "添加封面" }}</h3>
              <p>可选，建议使用 1:1 图片，支持 PNG、JPEG、GIF、WebP。</p>
              <div class="cpcf-cover-buttons">
                <v-btn
                  :disabled="saving || uploading"
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
                  :disabled="saving"
                  size="small"
                  type="button"
                  variant="text"
                  @click="clearCover"
                >
                  移除
                </v-btn>
              </div>
            </div>
            <input
              ref="fileInput"
              :disabled="saving || uploading"
              accept="image/jpeg,image/png,image/gif,image/webp"
              hidden
              type="file"
              @change="handleCoverChange"
            />
          </div>
          <div v-if="coverError" aria-live="assertive" class="cpcf-error" role="alert">
            <v-icon size="18">mdi-alert-circle-outline</v-icon>
            <span>{{ coverError }}</span>
          </div>

          <v-text-field
            v-model="draft.title"
            :counter="15"
            :disabled="saving"
            :error-messages="titleError ? [titleError] : []"
            :maxlength="15"
            autocomplete="off"
            density="comfortable"
            hide-details="auto"
            label="合集标题"
            placeholder="给合集起一个标题"
            variant="outlined"
          />
          <v-textarea
            v-model="draft.desc"
            :counter="80"
            :disabled="saving"
            :maxlength="80"
            auto-grow
            density="comfortable"
            hide-details="auto"
            label="合集描述（可选）"
            placeholder="简要介绍这个合集"
            :rows="3"
            variant="outlined"
          />

          <div v-if="error" aria-live="assertive" class="cpcf-error" role="alert">
            <v-icon size="18">mdi-alert-circle-outline</v-icon>
            <span>{{ error }}</span>
          </div>
        </div>

        <footer class="cpcf-footer">
          <v-btn
            :disabled="saving || uploading"
            type="button"
            variant="text"
            @click="visible = false"
          >
            取消
          </v-btn>
          <v-btn
            :disabled="saving || uploading"
            :loading="saving"
            class="cpcf-confirm"
            type="submit"
            variant="flat"
          >
            {{ isEditing ? "保存" : "创建" }}
          </v-btn>
        </footer>
      </form>
    </section>
  </v-dialog>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import communityReq from "@req/communityReq.js";
import replyAssetReq from "@req/replyAssetReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import TGHttps from "@utils/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, reactive, ref, useId, useTemplateRef, watch } from "vue";

/**
 * 合集信息对话框参数。
 * @since Beta v0.13.0
 */
type CollectionFormProps = {
  /** 待编辑的合集；未提供时为创建合集 */
  collection?: TGApp.BBS.Collection.Collection;
};

/**
 * 合集信息草稿。
 * @since Beta v0.13.0
 */
type CollectionDraft = {
  /** 合集标题 */
  title: string;
  /** 合集描述 */
  desc: string;
  /** 合集封面 */
  cover: string;
};

/**
 * 合集管理的登录账户快照。
 * @since Beta v0.13.0
 */
type AccountSnapshot = {
  /** 当前登录 UID */
  uid: string;
  /** 当前账户 Cookie */
  cookie: TGApp.App.Account.Cookie;
};

const props = withDefaults(defineProps<CollectionFormProps>(), { collection: undefined });
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{ saved: [] }>();
const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());
const titleId = useId();
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const draft = reactive<CollectionDraft>({ title: "", desc: "", cover: "" });
const submitted = ref<boolean>(false);
const saving = ref<boolean>(false);
const uploading = ref<boolean>(false);
const error = ref<string>("");
const coverError = ref<string>("");
const previewUrl = ref<string>("");
const isEditing = computed<boolean>(() => props.collection !== undefined);
const coverUrl = computed<string>(() => previewUrl.value || draft.cover);
const hasCover = computed<boolean>(() => coverUrl.value !== "");
const titleError = computed<string>(() => {
  if (!submitted.value) return "";
  return draft.title.trim() === "" ? "请填写合集标题。" : "";
});
let active = true;
let requestVersion = 0;
let uploadVersion = 0;
let previewObjectUrl: string | undefined;
let uploadController: AbortController | undefined;

watch(
  visible,
  (isOpen) => {
    if (isOpen) initializeForm();
    else cleanupForm();
  },
  { immediate: true },
);

watch(
  () => props.collection?.id,
  () => {
    if (visible.value) initializeForm();
  },
);

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
  uploadVersion += 1;
  uploadController?.abort();
  releasePreview();
});

function initializeForm(): void {
  requestVersion += 1;
  uploadVersion += 1;
  uploadController?.abort();
  uploadController = undefined;
  saving.value = false;
  uploading.value = false;
  submitted.value = false;
  error.value = "";
  coverError.value = "";
  releasePreview();
  clearFileInput();
  draft.title = props.collection?.title ?? "";
  draft.desc = props.collection?.desc ?? "";
  draft.cover = props.collection?.cover ?? "";
}

function cleanupForm(): void {
  requestVersion += 1;
  uploadVersion += 1;
  uploadController?.abort();
  uploadController = undefined;
  saving.value = false;
  uploading.value = false;
  submitted.value = false;
  error.value = "";
  coverError.value = "";
  releasePreview();
  clearFileInput();
}

function getSnapshot(): AccountSnapshot | undefined {
  const loginUid = uid.value?.trim() ?? "";
  const currentCookie = cookie.value;
  if (!isLogin.value || !loginUid || !currentCookie) return undefined;
  if (
    currentCookie.ltuid !== loginUid ||
    !currentCookie.ltoken.trim() ||
    !currentCookie.cookie_token.trim() ||
    !currentCookie.account_id.trim()
  )
    return undefined;
  return { uid: loginUid, cookie: { ...currentCookie } };
}

function isCurrent(snapshot: AccountSnapshot, version: number): boolean {
  const current = getSnapshot();
  return (
    active &&
    version === requestVersion &&
    current?.uid === snapshot.uid &&
    current.cookie.account_id === snapshot.cookie.account_id &&
    current.cookie.cookie_token === snapshot.cookie.cookie_token &&
    current.cookie.ltuid === snapshot.cookie.ltuid &&
    current.cookie.ltoken === snapshot.cookie.ltoken
  );
}

function matchesPersistedAccount(snapshot: AccountSnapshot): boolean {
  return matchesCurrentAccount({
    uid: snapshot.uid,
    cookie: { ltoken: snapshot.cookie.ltoken, ltuid: snapshot.cookie.ltuid },
  });
}

function releasePreview(): void {
  if (previewObjectUrl !== undefined) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = undefined;
  }
  previewUrl.value = "";
}

function clearFileInput(): void {
  if (fileInput.value) fileInput.value.value = "";
}

function chooseCover(): void {
  if (saving.value || uploading.value) return;
  fileInput.value?.click();
}

function clearCover(): void {
  if (saving.value || uploading.value) return;
  uploadVersion += 1;
  uploadController?.abort();
  uploadController = undefined;
  uploading.value = false;
  releasePreview();
  coverError.value = "";
  draft.cover = "";
  clearFileInput();
}

async function handleCoverChange(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  if (!file || saving.value) return;
  const snapshot = getSnapshot();
  if (!snapshot) {
    coverError.value = "当前账号凭据不可用，请重新登录米游社账号。";
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
  coverError.value = "";
  try {
    const image = await replyAssetReq.uploadImage(
      file,
      { ltoken: snapshot.cookie.ltoken, ltuid: snapshot.cookie.ltuid },
      2,
      controller.signal,
    );
    if (!active || version !== uploadVersion || controller.signal.aborted) return;
    draft.cover = image.url;
    releasePreview();
  } catch (cause) {
    if (!active || version !== uploadVersion || controller.signal.aborted) return;
    releasePreview();
    coverError.value = `封面上传失败：${TGHttps.getErrMsg(cause)}`;
  } finally {
    if (uploadController === controller) {
      uploadController = undefined;
      uploading.value = false;
    }
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value || uploading.value) return;
  submitted.value = true;
  error.value = "";
  const title = draft.title.trim();
  if (title === "") return;
  const snapshot = getSnapshot();
  if (!snapshot) {
    error.value = "当前账号凭据不可用，请重新登录米游社账号。";
    return;
  }
  if (!matchesPersistedAccount(snapshot)) {
    error.value = "登录账号已变化，请重新打开合集管理。";
    return;
  }
  const version = ++requestVersion;
  saving.value = true;
  error.value = "";
  try {
    const params = { title, desc: draft.desc.trim(), cover: draft.cover };
    const response = props.collection
      ? await communityReq.editCollection(snapshot.cookie, { id: props.collection.id, ...params })
      : await communityReq.createCollection(snapshot.cookie, params);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    emits("saved");
    visible.value = false;
  } catch (cause) {
    if (isCurrent(snapshot, version)) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.cpcf-panel {
  display: flex;
  overflow: hidden;
  width: 100%;
  max-height: calc(100dvh - 48px);
  box-sizing: border-box;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
}

.cpcf-header {
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
    line-height: 18px;
  }
}

.cpcf-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cpcf-form {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.cpcf-body {
  display: flex;
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cpcf-cover-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cpcf-cover {
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

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-text-title);
    color: var(--common-text-title);
  }

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cpcf-cover-mask {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 48%);
  inset: 0;
}

.cpcf-cover-actions {
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

.cpcf-cover-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cpcf-error {
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

.cpcf-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.cpcf-confirm {
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--box-text-4);

  &:enabled {
    background: var(--common-text-title);
    color: var(--app-page-bg);
  }
}

@media (width <= 640px) {
  .cpcf-header,
  .cpcf-body,
  .cpcf-footer {
    padding: 12px;
  }

  .cpcf-cover-row {
    align-items: flex-start;
    gap: 12px;
  }

  .cpcf-cover {
    width: 80px;
    height: 80px;
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.cpcf-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
