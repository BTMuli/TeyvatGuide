<!-- 帖子与回复共用的收藏表情选择面板 -->
<template>
  <div class="custom-emoticons">
    <div class="custom-emoticons-heading">
      <div class="custom-emoticons-label">
        <span class="custom-emoticons-title">收藏表情</span>
        <span v-if="!loading && !error && items.length" class="custom-emoticons-count">
          {{ items.length }} 个
        </span>
      </div>
      <div class="custom-emoticons-actions">
        <button
          ref="addButton"
          :disabled="disabled || busy"
          aria-label="添加收藏表情"
          class="custom-emoticons-action custom-emoticons-icon-action"
          title="添加收藏表情"
          type="button"
          @click="chooseImage"
        >
          <v-progress-circular
            v-if="adding"
            aria-hidden="true"
            indeterminate
            :size="16"
            :width="2"
          />
          <v-icon v-else size="18">mdi-plus</v-icon>
        </button>
        <button
          :disabled="disabled || busy"
          aria-label="刷新收藏表情"
          class="custom-emoticons-action custom-emoticons-icon-action"
          title="刷新收藏表情"
          type="button"
          @click="load"
        >
          <v-icon size="18">mdi-refresh</v-icon>
        </button>
      </div>
    </div>
    <div v-if="adding" aria-live="polite" class="custom-emoticons-busy" role="status">
      <v-progress-circular aria-hidden="true" indeterminate :size="14" :width="2" />
      <span>正在上传并添加收藏表情…</span>
    </div>
    <div v-if="actionError" class="custom-emoticons-action-error" role="alert">
      {{ actionError }}
    </div>
    <div v-if="loading" aria-live="polite" class="custom-emoticons-status" role="status">
      <v-progress-circular aria-hidden="true" indeterminate :size="24" :width="2" />
      <span>正在加载收藏表情…</span>
    </div>
    <div v-else-if="error" class="custom-emoticons-status" role="alert">
      <v-icon aria-hidden="true" size="28">mdi-alert-circle-outline</v-icon>
      <span>{{ error }}</span>
      <button :disabled="disabled" class="custom-emoticons-action" type="button" @click="load">
        重新加载
      </button>
    </div>
    <div v-else-if="items.length === 0" class="custom-emoticons-status">
      <v-icon aria-hidden="true" size="32">mdi-emoticon-outline</v-icon>
      <span role="status">暂无收藏表情</span>
      <button
        :disabled="disabled || busy"
        class="custom-emoticons-action"
        type="button"
        @click="chooseImage"
      >
        添加表情
      </button>
    </div>
    <div v-else aria-label="收藏表情列表" class="custom-emoticons-grid">
      <div v-for="(item, index) in items" :key="item.id" class="custom-emoticons-cell">
        <button
          :aria-label="`插入收藏表情 ${index + 1}`"
          :disabled="disabled || busy"
          :title="`收藏表情 ${index + 1}`"
          class="custom-emoticons-item"
          type="button"
          @click="select(item)"
        >
          <img :src="item.url" alt="" draggable="false" loading="lazy" />
        </button>
        <button
          v-if="pendingDeleteId !== item.id"
          :ref="(element) => setDeleteButton(item.id, element)"
          :disabled="disabled || adding || deletingId !== undefined"
          :aria-label="`删除收藏表情 ${index + 1}`"
          class="custom-emoticons-delete"
          title="删除收藏表情"
          type="button"
          @click.stop="requestDelete(item)"
        >
          <v-icon size="14">mdi-delete-outline</v-icon>
        </button>
        <div
          v-else
          class="custom-emoticons-confirm"
          @click.stop
          @keydown.esc.stop.prevent="cancelDelete(item.id)"
        >
          <span class="custom-emoticons-confirm-text">删除？</span>
          <div class="custom-emoticons-confirm-actions">
            <button
              :ref="setConfirmDeleteButton"
              :aria-label="`确认删除收藏表情 ${index + 1}`"
              :disabled="deletingId !== undefined"
              class="custom-emoticons-confirm-button is-danger"
              title="确认删除"
              type="button"
              @click.stop="confirmDelete(item)"
            >
              <v-progress-circular
                v-if="deletingId === item.id"
                aria-hidden="true"
                indeterminate
                :size="12"
                :width="2"
              />
              <span v-else>删除</span>
            </button>
            <button
              :aria-label="`取消删除收藏表情 ${index + 1}`"
              :disabled="deletingId !== undefined"
              class="custom-emoticons-confirm-button"
              title="取消"
              type="button"
              @click.stop="cancelDelete(item.id)"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="notice" class="custom-emoticons-hint" role="status">{{ notice }}</p>
    <p v-else-if="!loading && !error && items.length" class="custom-emoticons-hint">
      点击插入，每条内容最多 1 个
    </p>
    <input
      ref="imageInput"
      accept="image/gif,image/png,image/jpeg,image/webp"
      hidden
      type="file"
      @change="addFavorite"
    />
  </div>
</template>
<script lang="ts" setup>
import customEmoticonReq from "@req/customEmoticonReq.js";
import replyAssetReq from "@req/replyAssetReq.js";
import { parseCustomEmoticon } from "@utils/bbs/customEmoticon.js";
import { matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

const props = defineProps<{
  cookie?: TGApp.App.Account.EditorCookie;
  contextId: number;
  disabled: boolean;
  gid: number;
}>();
const emits = defineEmits<{
  select: [value: TGApp.BBS.CustomEmoticon.Value];
}>();
const items = ref<Array<TGApp.BBS.CustomEmoticon.Item>>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
const actionError = ref<string>("");
const notice = ref<string>("");
const adding = ref<boolean>(false);
const deletingId = ref<string>();
const pendingDeleteId = ref<string>();
const imageInput = useTemplateRef<HTMLInputElement>("imageInput");
const addButton = useTemplateRef<HTMLButtonElement>("addButton");
let confirmDeleteButton: HTMLButtonElement | undefined;
const deleteButtons = new Map<string, HTMLButtonElement>();
const busy = computed<boolean>(
  () =>
    loading.value ||
    adding.value ||
    deletingId.value !== undefined ||
    pendingDeleteId.value !== undefined,
);
let controller: AbortController | undefined;
let addController: AbortController | undefined;
let deleteController: AbortController | undefined;
let version = 0;
let mounted = true;

watch(
  () => [
    props.contextId,
    props.cookie?.ltuid,
    props.cookie?.ltoken,
    props.cookie?.stuid,
    props.cookie?.stoken,
    props.cookie?.mid,
    props.disabled,
  ],
  () => void load(),
  { immediate: true, flush: "sync" },
);
watch(pendingDeleteId, async (id) => {
  if (id === undefined) return;
  await nextTick();
  confirmDeleteButton?.focus();
});

onBeforeUnmount(() => {
  mounted = false;
  version += 1;
  controller?.abort();
  cancelMutations();
});

function cancelMutations(): void {
  addController?.abort();
  addController = undefined;
  deleteController?.abort();
  deleteController = undefined;
  adding.value = false;
  deletingId.value = undefined;
  pendingDeleteId.value = undefined;
}

function setDeleteButton(id: string, element: unknown): void {
  if (element instanceof HTMLButtonElement) deleteButtons.set(id, element);
  else deleteButtons.delete(id);
}

function setConfirmDeleteButton(element: unknown): void {
  confirmDeleteButton = element instanceof HTMLButtonElement ? element : undefined;
}

function getCookie(): TGApp.App.Account.EditorCookie {
  const cookie = props.cookie;
  if (!cookie?.ltoken || !cookie.ltuid) throw new Error("请先登录米游社账号");
  const snapshot = {
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
    stoken: cookie.stoken,
    stuid: cookie.stuid,
    mid: cookie.mid,
  };
  if (!matchesCurrentAccount({ uid: snapshot.ltuid, cookie: snapshot })) {
    throw new Error("账号状态已变化，请重新打开编辑器");
  }
  return snapshot;
}

async function load(): Promise<boolean> {
  const current = ++version;
  controller?.abort();
  controller = undefined;
  cancelMutations();
  items.value = [];
  error.value = "";
  actionError.value = "";
  notice.value = "";
  loading.value = false;
  if (props.disabled) return false;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  try {
    const cookie = getCookie();
    const response = await customEmoticonReq.list(cookie, request.signal);
    if (!mounted || current !== version || request.signal.aborted) return false;
    getCookie();
    items.value = response;
    return true;
  } catch (cause) {
    if (mounted && current === version && !request.signal.aborted) {
      error.value = cause instanceof Error ? cause.message : "收藏表情加载失败，请重试";
    }
    return false;
  } finally {
    if (controller === request) {
      controller = undefined;
      loading.value = false;
    }
  }
}

function chooseImage(): void {
  if (props.disabled || busy.value) return;
  try {
    getCookie();
    actionError.value = "";
    notice.value = "";
    if (imageInput.value) imageInput.value.value = "";
    imageInput.value?.click();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : "无法添加收藏表情";
  }
}

async function addFavorite(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  if (!file || props.disabled || busy.value) return;
  const current = version;
  const request = new AbortController();
  addController = request;
  adding.value = true;
  actionError.value = "";
  notice.value = "";
  let uploadedUrl = "";
  let succeeded = false;
  try {
    const cookie = getCookie();
    const image = await replyAssetReq.uploadImage(
      file,
      { ltoken: cookie.ltoken, ltuid: cookie.ltuid },
      props.gid,
      request.signal,
    );
    if (!mounted || current !== version || request.signal.aborted) return;
    getCookie();
    await customEmoticonReq.add(
      cookie,
      {
        url: image.url,
        width: image.width,
        height: image.height,
        fileSize: file.size,
      },
      request.signal,
    );
    if (!mounted || current !== version || request.signal.aborted) return;
    uploadedUrl = image.url;
    succeeded = true;
  } catch (cause) {
    if (mounted && current === version && !request.signal.aborted) {
      actionError.value = cause instanceof Error ? cause.message : "收藏表情添加失败，请重试";
    }
  } finally {
    if (addController === request) {
      addController = undefined;
      adding.value = false;
    }
  }
  if (!succeeded || !mounted) return;
  const refreshed = await load();
  if (refreshed && mounted) {
    notice.value = items.value.some((item) => item.url === uploadedUrl)
      ? "收藏表情已添加"
      : "收藏表情已提交，稍后刷新查看";
  }
}

function requestDelete(item: TGApp.BBS.CustomEmoticon.Item): void {
  if (props.disabled || busy.value) return;
  actionError.value = "";
  notice.value = "";
  pendingDeleteId.value = item.id;
}

function cancelDelete(id: string): void {
  pendingDeleteId.value = undefined;
  void nextTick(() => deleteButtons.get(id)?.focus());
}

async function confirmDelete(item: TGApp.BBS.CustomEmoticon.Item): Promise<void> {
  if (props.disabled || adding.value || deletingId.value !== undefined) return;
  const current = version;
  const request = new AbortController();
  deleteController = request;
  deletingId.value = item.id;
  actionError.value = "";
  notice.value = "";
  let succeeded = false;
  try {
    const cookie = getCookie();
    await customEmoticonReq.remove(cookie, item.id, request.signal);
    if (!mounted || current !== version || request.signal.aborted) return;
    getCookie();
    items.value = items.value.filter((entry) => entry.id !== item.id);
    succeeded = true;
  } catch (cause) {
    if (mounted && current === version && !request.signal.aborted) {
      actionError.value = cause instanceof Error ? cause.message : "收藏表情删除失败，请重试";
    }
  } finally {
    if (deleteController === request) {
      deleteController = undefined;
      deletingId.value = undefined;
      pendingDeleteId.value = undefined;
    }
  }
  if (!mounted) return;
  if (succeeded) {
    notice.value = "收藏表情已删除";
    await nextTick();
    addButton.value?.focus();
  } else if (current === version) {
    void nextTick(() => deleteButtons.get(item.id)?.focus());
  }
}

function select(item: TGApp.BBS.CustomEmoticon.Item): void {
  if (props.disabled || busy.value || !item.is_available) return;
  try {
    getCookie();
    emits("select", parseCustomEmoticon(item));
  } catch (cause) {
    items.value = [];
    error.value = cause instanceof Error ? cause.message : "无法插入收藏表情";
  }
}
</script>
<style lang="scss" scoped>
.custom-emoticons {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
}

.custom-emoticons-heading {
  display: flex;
  min-height: 32px;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.custom-emoticons-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.custom-emoticons-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.custom-emoticons-title {
  color: var(--app-page-content);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.custom-emoticons-count,
.custom-emoticons-hint {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.custom-emoticons-action,
.custom-emoticons-confirm-button {
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-4);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    background: var(--box-bg-3);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}

.custom-emoticons-action {
  min-width: 32px;
  min-height: 32px;
  flex: none;
  padding: 4px 8px;
}

.custom-emoticons-icon-action {
  display: inline-flex;
  width: 32px;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.custom-emoticons-busy {
  display: flex;
  flex: none;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 6px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.custom-emoticons-action-error {
  color: var(--tgc-od-red);
}

.custom-emoticons-status {
  display: flex;
  min-height: 96px;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  color: var(--box-text-2);
  font-size: 14px;
  gap: 12px;
  line-height: 20px;
  overflow-wrap: anywhere;
  text-align: center;
}

.custom-emoticons-grid {
  display: grid;
  overflow: hidden auto;
  min-height: 0;
  max-height: 260px;
  flex: 1 1 auto;
  align-content: start;
  padding: 4px;
  gap: 8px;
  grid-auto-rows: max-content;
  grid-template-columns: repeat(auto-fill, minmax(min(72px, 100%), 1fr));
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.custom-emoticons-cell {
  position: relative;
  overflow: hidden;
  min-width: 0;
  border-radius: 8px;
  aspect-ratio: 1;
}

.custom-emoticons-item {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }

  &:active:not(:disabled) {
    background: var(--box-bg-3);
  }
}

.custom-emoticons-item img {
  position: absolute;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  inset: 0;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.custom-emoticons-delete {
  position: absolute;
  z-index: 1;
  top: 2px;
  right: 2px;
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 50%;
  background: var(--box-bg-2);
  color: var(--tgc-od-red);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;

  &:focus-visible {
    opacity: 1;
    outline: 2px solid var(--common-text-title);
    outline-offset: 1px;
    pointer-events: auto;
  }

  &:disabled {
    cursor: default;
  }

  &:hover:not(:disabled) {
    background: var(--box-bg-3);
  }
}

.custom-emoticons-cell:hover .custom-emoticons-delete,
.custom-emoticons-cell:focus-within .custom-emoticons-delete {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .custom-emoticons-delete {
    opacity: 1;
    pointer-events: auto;
  }
}

.custom-emoticons-confirm {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 4px;
  inset: 0;
  text-align: center;
}

.custom-emoticons-confirm-text {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 14px;
}

.custom-emoticons-confirm-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.custom-emoticons-confirm-button {
  display: inline-flex;
  min-width: 32px;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-color: var(--common-shadow-1);
  background: var(--box-bg-2);
  font-size: 12px;
  line-height: 16px;

  &:hover:not(:disabled) {
    background: var(--box-bg-3);
  }

  &.is-danger {
    color: var(--tgc-od-red);
  }
}

.custom-emoticons-hint {
  flex: none;
  padding: 0 4px;
  margin: 0;
}
</style>
