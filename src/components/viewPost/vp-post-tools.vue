<!-- 图文帖的图片、表情与提及工具 -->
<template>
  <div v-if="!hideToolbar || uploading || error || emojiOpen || mentionOpen" class="post-tools">
    <div v-if="!hideToolbar" aria-label="帖子插入工具" class="post-tools-bar" role="group">
      <button
        :disabled="disabled || uploading"
        aria-label="添加图片"
        class="post-tools-tool"
        title="添加图片"
        type="button"
        @click="chooseImage"
      >
        <v-icon size="20">mdi-image-outline</v-icon>
      </button>
      <button
        :aria-expanded="emojiOpen"
        :disabled="disabled || uploading"
        aria-haspopup="true"
        aria-label="插入表情"
        class="post-tools-tool"
        title="插入表情"
        type="button"
        @click="openEmoji($event)"
      >
        <v-icon size="20">mdi-emoticon-happy-outline</v-icon>
      </button>
      <button
        :aria-expanded="mentionOpen"
        :disabled="disabled || uploading"
        aria-haspopup="true"
        aria-label="提及用户"
        class="post-tools-tool"
        title="提及用户"
        type="button"
        @click="openMention($event)"
      >
        <v-icon size="20">mdi-at</v-icon>
      </button>
    </div>
    <v-menu
      v-model="emojiOpen"
      :activator="emojiActivator"
      :close-on-content-click="false"
      :disabled="disabled"
      :open-on-click="false"
      location="start top"
      offset="8"
      origin="end top"
      @update:model-value="handleEmojiOpen"
    >
      <div aria-label="表情面板" class="post-tools-panel post-tools-panel--emoji" role="region">
        <div class="post-tools-heading">
          <span class="post-tools-panel-title">选择表情</span>
          <button
            aria-label="收起表情"
            class="post-tools-action"
            title="收起表情"
            type="button"
            @click="closePanel"
          >
            <v-icon size="18">mdi-close</v-icon>
          </button>
        </div>
        <div class="post-tools-body">
          <div aria-label="表情系列" class="post-tools-series">
            <button
              :aria-pressed="favoriteSelected"
              :disabled="disabled || uploading || !allowCustomEmoticon"
              :title="allowCustomEmoticon ? '收藏表情' : '图片帖暂不支持收藏表情'"
              aria-label="收藏表情"
              class="post-tools-series-item"
              type="button"
              @click="favoriteSelected = true"
            >
              <v-icon size="24">mdi-star-outline</v-icon>
            </button>
            <v-tooltip v-for="item in emojiSeries" :key="item.id" :text="item.name" location="end">
              <template #activator="{ props: tooltipProps }">
                <button
                  v-bind="tooltipProps"
                  :aria-label="item.name"
                  :aria-pressed="!favoriteSelected && selectedSeries === item.id"
                  :disabled="disabled"
                  class="post-tools-series-item"
                  type="button"
                  @click="selectSeries(item.id)"
                >
                  <img :alt="item.name" :src="item.icon" loading="lazy" />
                </button>
              </template>
            </v-tooltip>
          </div>
          <div class="post-tools-content">
            <VpCustomEmoticons
              v-if="favoriteSelected && emojiOpen && allowCustomEmoticon"
              :contextId
              :cookie
              :disabled="disabled || uploading"
              @select="insertCustomEmoticon"
            />
            <div
              v-else-if="emojiLoading"
              aria-live="polite"
              class="post-tools-status"
              role="status"
            >
              正在加载表情…
            </div>
            <div v-else-if="emojiError" class="post-tools-status" role="alert">
              <span>{{ emojiError }}</span>
              <button
                :disabled="emojiLoading"
                class="post-tools-action"
                type="button"
                @click="loadEmoji"
              >
                重试
              </button>
            </div>
            <div v-else-if="emojiItems.length === 0" class="post-tools-status">暂无可用表情</div>
            <div v-else aria-label="表情列表" class="post-tools-emoji-list">
              <button
                v-for="emoji in emojiItems"
                :key="emoji.id"
                :aria-label="emoji.name"
                :disabled="disabled || uploading"
                :title="emoji.name"
                class="post-tools-emoji"
                type="button"
                @click="insertEmoji(emoji.name)"
              >
                <img :alt="emoji.name" :src="emoji.icon" loading="lazy" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </v-menu>
    <v-menu
      v-model="mentionOpen"
      :activator="mentionActivator"
      :close-on-content-click="false"
      :disabled="disabled"
      :open-on-click="false"
      location="start top"
      offset="8"
      origin="end top"
      @update:model-value="handleMentionOpen"
    >
      <div
        aria-label="提及用户面板"
        class="post-tools-panel post-tools-panel--mention"
        role="region"
      >
        <div class="post-tools-heading">
          <span class="post-tools-panel-title">提及用户</span>
          <button
            aria-label="收起用户查找"
            class="post-tools-action"
            title="收起用户查找"
            type="button"
            @click="closePanel"
          >
            <v-icon size="18">mdi-close</v-icon>
          </button>
        </div>
        <div class="post-tools-lookup">
          <v-text-field
            v-model="nickname"
            :disabled="disabled || mentionLoading"
            density="compact"
            hide-details
            label="米游社完整昵称"
            variant="outlined"
            @keydown.enter.prevent="findUser"
          />
          <v-btn
            :disabled="disabled || !nickname.trim()"
            :loading="mentionLoading"
            size="small"
            variant="tonal"
            @click="findUser"
            >查找</v-btn
          >
        </div>
        <div v-if="mentionError" class="post-tools-status" role="alert">
          {{ mentionError }}
        </div>
        <div v-if="mention" class="post-tools-result">
          <span>{{ mention.nickname }} · UID {{ mention.uid }}</span>
          <v-btn
            :disabled="disabled || uploading"
            size="small"
            variant="tonal"
            @click="insertMention"
          >
            插入提及
          </v-btn>
        </div>
      </div>
    </v-menu>
    <div
      v-if="uploading"
      aria-live="polite"
      class="post-tools-status post-tools-upload-status"
      role="status"
    >
      <span>正在上传图片…</span>
      <button class="post-tools-action" type="button" @click="cancelUpload">取消上传</button>
    </div>
    <div v-if="error" class="post-tools-error" role="alert">{{ error }}</div>
  </div>
  <input
    ref="imageInput"
    accept="image/jpeg,image/png,image/gif,image/webp"
    hidden
    type="file"
    @cancel="clearImagePicker"
    @change="uploadImage"
  />
</template>
<script lang="ts" setup>
import bbsReq from "@req/bbsReq.js";
import replyAssetReq from "@req/replyAssetReq.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import VpCustomEmoticons from "./vp-custom-emoticons.vue";

const {
  disabled,
  cookie,
  gid,
  contextId,
  hideToolbar,
  allowCustomEmoticon = true,
} = defineProps<{
  disabled: boolean;
  cookie?: TGApp.App.Account.EditorCookie;
  gid: number;
  contextId: number;
  hideToolbar?: boolean;
  allowCustomEmoticon?: boolean;
}>();
const emits = defineEmits<{
  emoticon: [emoticon: { src: string; name: string }];
  customEmoticon: [value: TGApp.BBS.CustomEmoticon.Value];
  mention: [user: TGApp.BBS.ReplyAsset.Mention];
  image: [image: TGApp.BBS.ReplyAsset.UploadedImage];
  uploadBusy: [value: boolean];
}>();
const imageInput = useTemplateRef<HTMLInputElement>("imageInput");
const emojiOpen = ref<boolean>(false);
const mentionOpen = ref<boolean>(false);
const emojiActivator = ref<HTMLElement>();
const mentionActivator = ref<HTMLElement>();
const emojiSeries = ref<Array<TGApp.BBS.Emoji.Series>>([]);
const selectedSeries = ref<number>();
const favoriteSelected = ref<boolean>(false);
const emojiLoading = ref<boolean>(false);
const emojiError = ref<string>("");
const uploading = ref<boolean>(false);
const mentionLoading = ref<boolean>(false);
const nickname = ref<string>("");
const mention = ref<TGApp.BBS.ReplyAsset.Mention>();
const mentionError = ref<string>("");
const error = ref<string>("");
let controller: AbortController | undefined;
let mentionController: AbortController | undefined;
let picker: { version: number; cookie: TGApp.App.Account.LoginCookie; gid: number } | undefined;
let version = 0;

const emojiItems = computed<Array<TGApp.BBS.Emoji.Item>>(() =>
  (emojiSeries.value.find((item) => item.id === selectedSeries.value)?.list ?? [])
    .filter((item) => item.is_available && !!item.icon)
    .toSorted((a, b) => a.sort_order - b.sort_order),
);

watch(() => [contextId, gid, cookie?.ltuid, cookie?.ltoken], reset, { flush: "sync" });
watch(
  () => allowCustomEmoticon,
  (allowed) => {
    if (!allowed) favoriteSelected.value = false;
  },
);
watch(
  () => disabled,
  (isDisabled) => {
    if (isDisabled) closePanel();
  },
);
watch(nickname, () => {
  mentionController?.abort();
  mention.value = undefined;
  mentionError.value = "";
});
onBeforeUnmount(reset);

function reset(): void {
  version += 1;
  favoriteSelected.value = false;
  controller?.abort();
  mentionController?.abort();
  picker = undefined;
  emojiOpen.value = false;
  mentionOpen.value = false;
  emojiActivator.value = undefined;
  mentionActivator.value = undefined;
  emojiLoading.value = false;
  emojiError.value = "";
  mentionError.value = "";
  error.value = "";
  nickname.value = "";
  mention.value = undefined;
  if (imageInput.value) imageInput.value.value = "";
}

function closePanel(): void {
  emojiOpen.value = false;
  mentionOpen.value = false;
  mentionController?.abort();
  mentionController = undefined;
  mentionLoading.value = false;
}

function cancelUpload(): void {
  controller?.abort();
}

function selectSeries(id: number): void {
  favoriteSelected.value = false;
  selectedSeries.value = id;
}

function insertCustomEmoticon(value: TGApp.BBS.CustomEmoticon.Value): void {
  if (disabled || uploading.value || !allowCustomEmoticon) return;
  try {
    getCookie();
    emits("customEmoticon", value);
    closePanel();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "无法插入收藏表情";
  }
}

function clearImagePicker(): void {
  picker = undefined;
  if (imageInput.value) imageInput.value.value = "";
}

function getCookie(): TGApp.App.Account.LoginCookie {
  if (!cookie || !matchesCurrentAccount({ uid: cookie.ltuid, cookie })) {
    throw new Error("账号状态已变化，请重新打开编辑器");
  }
  return { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
}

function resolveActivator(event?: MouseEvent): HTMLElement | undefined {
  const target = event?.currentTarget;
  return target instanceof HTMLElement ? target : undefined;
}

function chooseImage(): void {
  if (disabled || uploading.value) return;
  try {
    picker = { version, cookie: getCookie(), gid };
    closePanel();
    imageInput.value?.click();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "无法选择图片";
  }
}

function openEmoji(event?: MouseEvent): void {
  if (disabled || uploading.value) return;
  const activator = resolveActivator(event);
  if (activator) emojiActivator.value = activator;
  if (!emojiActivator.value) return;
  const open = !emojiOpen.value;
  emojiOpen.value = open;
  if (!open) return;
  mentionOpen.value = false;
  mentionController?.abort();
  mentionController = undefined;
  mentionLoading.value = false;
  if (emojiSeries.value.length === 0) void loadEmoji();
}

function openMention(event?: MouseEvent): void {
  if (disabled || uploading.value) return;
  const activator = resolveActivator(event);
  if (activator) mentionActivator.value = activator;
  if (!mentionActivator.value) return;
  const open = !mentionOpen.value;
  mentionOpen.value = open;
  if (!open) {
    mentionController?.abort();
    return;
  }
  emojiOpen.value = false;
}

function handleEmojiOpen(open: boolean): void {
  if (!open) return;
  if (disabled) {
    emojiOpen.value = false;
    return;
  }
  mentionOpen.value = false;
  if (emojiSeries.value.length === 0) void loadEmoji();
}

function handleMentionOpen(open: boolean): void {
  if (open) {
    if (disabled) mentionOpen.value = false;
    emojiOpen.value = false;
    return;
  }
  mentionController?.abort();
}

async function uploadImage(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  const selected = picker;
  picker = undefined;
  if (!file || !selected || selected.version !== version || disabled || uploading.value) return;
  const request = new AbortController();
  controller = request;
  uploading.value = true;
  emits("uploadBusy", true);
  error.value = "";
  try {
    // 网页帖子与回复都使用 community 上传签名；帖子图片节点由独立编辑器生成。
    const image = await replyAssetReq.uploadImage(
      file,
      selected.cookie,
      selected.gid,
      request.signal,
    );
    if (request.signal.aborted || selected.version !== version) return;
    getCookie();
    emits("image", image);
  } catch (cause) {
    if (!request.signal.aborted && selected.version === version) {
      error.value = cause instanceof Error ? cause.message : "图片上传失败，请重试";
    }
  } finally {
    if (controller === request) {
      controller = undefined;
      uploading.value = false;
      emits("uploadBusy", false);
    }
  }
}

async function loadEmoji(): Promise<void> {
  if (emojiLoading.value || disabled) return;
  const current = version;
  emojiLoading.value = true;
  emojiError.value = "";
  try {
    const response = await bbsReq.emojis();
    if (current !== version) return;
    if (response.retcode !== 0) throw new Error("加载失败");
    emojiSeries.value = response.data.list
      .filter((item) => item.is_available && item.list.some((emoji) => emoji.is_available))
      .toSorted((a, b) => a.sort_order - b.sort_order);
    if (!emojiSeries.value.some((item) => item.id === selectedSeries.value)) {
      selectedSeries.value = emojiSeries.value[0]?.id;
    }
  } catch {
    if (current === version) emojiError.value = "表情加载失败，请重试";
  } finally {
    if (current === version) emojiLoading.value = false;
  }
}

function insertEmoji(name: string): void {
  if (disabled || uploading.value) return;
  const emoji = emojiItems.value.find((item) => item.name === name);
  if (emoji) emits("emoticon", { src: emoji.icon, name });
}

async function findUser(): Promise<void> {
  if (disabled || uploading.value || mentionLoading.value || !nickname.value.trim()) return;
  const current = version;
  const query = nickname.value.trim();
  const request = new AbortController();
  mentionController = request;
  mentionLoading.value = true;
  mention.value = undefined;
  mentionError.value = "";
  try {
    const requestCookie = getCookie();
    const user = await replyAssetReq.resolveMention(query, requestCookie, gid, request.signal);
    if (current !== version || request.signal.aborted) return;
    getCookie();
    mention.value = user;
  } catch (cause) {
    if (current === version && !request.signal.aborted)
      mentionError.value = cause instanceof Error ? cause.message : "用户查找失败";
  } finally {
    if (mentionController === request) {
      mentionController = undefined;
      mentionLoading.value = false;
    }
  }
}

function insertMention(): void {
  if (disabled || uploading.value || !mention.value) return;
  emits("mention", { ...mention.value });
  closePanel();
}

defineExpose({ chooseImage, openEmoji, openMention });
</script>
<style lang="scss" scoped>
.post-tools {
  --post-tools-error-text: color-mix(in srgb, var(--tgc-od-red) 40%, var(--app-page-content));

  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.post-tools-bar,
.post-tools-heading,
.post-tools-status,
.post-tools-lookup,
.post-tools-result {
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-tools-bar {
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-self: flex-start;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 4px;
}

.post-tools-tool,
.post-tools-action,
.post-tools-series-item,
.post-tools-emoji {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
}

.post-tools-tool {
  display: flex;
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  color: var(--box-text-2);
}

.post-tools-tool[aria-expanded="true"] {
  border-color: var(--common-shadow-2);
  background: var(--app-page-bg);
  box-shadow: inset 0 -2px var(--tgc-btn-1);
  color: var(--common-text-title);
}

.post-tools-panel {
  display: flex;
  overflow: hidden;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: min(420px, 60vh);
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  gap: 8px;
  overscroll-behavior: contain;
}

.post-tools-panel--emoji {
  width: 380px;
}

.post-tools-panel--mention {
  overflow: auto;
  max-height: min(320px, 50vh);
}

.dark .post-tools-panel {
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.post-tools-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  max-height: 300px;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 8px;
}

.post-tools-content {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
}

.post-tools-heading,
.post-tools-result {
  justify-content: space-between;
}

.post-tools-heading {
  min-height: 28px;
  padding-bottom: 4px;
}

.post-tools-panel-title {
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
}

.post-tools-series {
  display: flex;
  overflow: hidden auto;
  width: 60px;
  max-height: 300px;
  box-sizing: border-box;
  flex: 0 0 60px;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  gap: 4px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    min-width: 0;
    min-height: 0;
    border: 0;
    border-radius: 3px;
    background: var(--common-shadow-2);
  }
}

.post-tools-series-item {
  display: flex;
  width: 44px;
  height: 44px;
  box-sizing: border-box;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid transparent;
  color: var(--app-page-content);
}

.post-tools-series-item[aria-pressed="true"] {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
  box-shadow: inset 0 -2px var(--tgc-btn-1);
}

.post-tools-series-item img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.post-tools-emoji-list {
  display: flex;
  overflow: hidden auto;
  min-height: 0;
  max-height: 300px;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 4px;
  gap: 4px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    min-width: 0;
    min-height: 0;
    border: 0;
    border-radius: 3px;
    background: var(--common-shadow-2);
  }
}

.post-tools-emoji {
  display: flex;
  width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid transparent;
}

.post-tools-emoji img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.post-tools-action {
  min-width: 28px;
  min-height: 28px;
  padding: 4px 6px;
}

.post-tools-status,
.post-tools-result {
  min-width: 0;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.post-tools-upload-status {
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  border-left: 3px solid var(--tgc-od-blue);
  background: var(--box-bg-3);
}

.post-tools-lookup > :first-child {
  min-width: 0;
  flex: 1;
}

.post-tools-result span {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-tools-tool:focus-visible,
.post-tools-action:focus-visible,
.post-tools-series-item:focus-visible,
.post-tools-emoji:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.post-tools-tool:disabled,
.post-tools-action:disabled,
.post-tools-series-item:disabled,
.post-tools-emoji:disabled {
  cursor: default;
  opacity: 0.45;
}

.post-tools-tool:hover:not(:disabled, [aria-expanded="true"]),
.post-tools-action:hover:not(:disabled),
.post-tools-series-item:hover:not(:disabled, [aria-pressed="true"]),
.post-tools-emoji:hover:not(:disabled) {
  opacity: 0.82;
}

.post-tools-error {
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--post-tools-error-text);
  font-size: 12px;
  line-height: 20px;
  overflow-wrap: anywhere;
}
</style>
