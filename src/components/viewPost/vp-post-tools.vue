<!-- 图文帖的图片、表情与提及工具 -->
<template>
  <div class="post-tools">
    <div v-if="!hideToolbar" aria-label="帖子插入工具" class="post-tools-bar">
      <v-btn
        :disabled="disabled || uploading"
        prepend-icon="mdi-image-outline"
        size="small"
        variant="text"
        @click="chooseImage"
        >图片</v-btn
      >
      <v-btn
        :disabled="disabled || uploading"
        prepend-icon="mdi-emoticon-happy-outline"
        size="small"
        variant="text"
        @click="openEmoji"
        >表情</v-btn
      >
      <v-btn
        :disabled="disabled || uploading"
        prepend-icon="mdi-at"
        size="small"
        variant="text"
        @click="openMention"
        >提及用户</v-btn
      >
    </div>
    <input
      ref="imageInput"
      accept="image/jpeg,image/png,image/gif,image/webp"
      hidden
      type="file"
      @cancel="picker = undefined"
      @change="uploadImage"
    />
    <div v-if="uploading" class="post-tools-status" role="status">
      <span>正在上传图片…</span>
      <v-btn size="small" variant="text" @click="controller?.abort()">取消上传</v-btn>
    </div>
    <div v-if="panel === 'emoji'" class="post-tools-panel">
      <v-select
        v-model="seriesId"
        :disabled="disabled || emojiLoading"
        :items="series"
        density="compact"
        hide-details
        item-title="name"
        item-value="id"
        label="表情系列"
        variant="outlined"
      />
      <div v-if="emojiLoading" role="status">正在加载表情…</div>
      <div v-else class="post-emoji-grid">
        <button
          v-for="emoji in emojiItems"
          :key="emoji.id"
          :aria-label="emoji.name"
          :disabled="disabled || uploading"
          :title="emoji.name"
          type="button"
          @click="insertEmoji(emoji.name)"
        >
          <img :alt="emoji.name" :src="emoji.icon" loading="lazy" />
        </button>
      </div>
    </div>
    <div v-else-if="panel === 'mention'" class="post-tools-panel">
      <div class="post-tools-bar">
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
      <div v-if="mention" class="post-tools-bar">
        <span>{{ mention.nickname }} · UID {{ mention.uid }}</span>
        <v-btn :disabled="disabled || uploading" size="small" variant="tonal" @click="insertMention"
          >插入提及</v-btn
        >
      </div>
    </div>
    <div v-if="error" class="post-tools-error" role="alert">{{ error }}</div>
  </div>
</template>
<script lang="ts" setup>
import bbsReq from "@req/bbsReq.js";
import replyAssetReq from "@req/replyAssetReq.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

const { disabled, cookie, gid, contextId } = defineProps<{
  disabled: boolean;
  cookie?: Record<string, string>;
  gid: number;
  contextId: number;
  hideToolbar?: boolean;
}>();
const emits = defineEmits<{
  emoticon: [emoticon: { src: string; name: string }];
  mention: [user: TGApp.BBS.ReplyAsset.Mention];
  image: [image: TGApp.BBS.ReplyAsset.UploadedImage];
  uploadBusy: [value: boolean];
}>();
const imageInput = useTemplateRef<HTMLInputElement>("imageInput");
const panel = ref<"emoji" | "mention">();
const series = ref<Array<TGApp.BBS.Emoji.Series>>([]);
const seriesId = ref<number>();
const emojiLoading = ref<boolean>(false);
const uploading = ref<boolean>(false);
const mentionLoading = ref<boolean>(false);
const nickname = ref<string>("");
const mention = ref<TGApp.BBS.ReplyAsset.Mention>();
const error = ref<string>("");
let controller: AbortController | undefined;
let mentionController: AbortController | undefined;
let picker: { version: number; cookie: Record<string, string>; gid: number } | undefined;
let version = 0;
const emojiItems = computed<Array<TGApp.BBS.Emoji.Item>>(() =>
  (series.value.find((item) => item.id === seriesId.value)?.list ?? []).filter(
    (item) => item.is_available,
  ),
);

watch(() => [contextId, gid, cookie?.ltuid, cookie?.ltoken], reset, { flush: "sync" });
watch(nickname, () => {
  mentionController?.abort();
  mention.value = undefined;
});
onBeforeUnmount(reset);

function reset(): void {
  version += 1;
  controller?.abort();
  mentionController?.abort();
  picker = undefined;
  panel.value = undefined;
  error.value = "";
  nickname.value = "";
  mention.value = undefined;
  if (imageInput.value) imageInput.value.value = "";
}

function getCookie(): Record<string, string> {
  if (!cookie || !matchesCurrentAccount({ uid: cookie.ltuid, cookie })) {
    throw new Error("账号状态已变化，请重新打开编辑器");
  }
  return { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
}

function chooseImage(): void {
  if (disabled || uploading.value) return;
  try {
    picker = { version, cookie: getCookie(), gid };
    imageInput.value?.click();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "无法选择图片";
  }
}

function openMention(): void {
  if (disabled || uploading.value) return;
  panel.value = panel.value === "mention" ? undefined : "mention";
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

async function openEmoji(): Promise<void> {
  if (disabled || uploading.value) return;
  panel.value = panel.value === "emoji" ? undefined : "emoji";
  if (series.value.length || emojiLoading.value || panel.value !== "emoji") return;
  const current = version;
  emojiLoading.value = true;
  error.value = "";
  try {
    const response = await bbsReq.emojis();
    if (current !== version) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    series.value = response.data.list
      .filter((item) => item.is_available)
      .toSorted((a, b) => a.sort_order - b.sort_order);
    seriesId.value = series.value[0]?.id;
  } catch (cause) {
    if (current === version)
      error.value = cause instanceof Error ? cause.message : "表情加载失败，请重试";
  } finally {
    emojiLoading.value = false;
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
  error.value = "";
  try {
    const requestCookie = getCookie();
    const user = await replyAssetReq.resolveMention(query, requestCookie, gid, request.signal);
    if (current !== version || request.signal.aborted) return;
    getCookie();
    mention.value = user;
  } catch (cause) {
    if (current === version && !request.signal.aborted)
      error.value = cause instanceof Error ? cause.message : "用户查找失败";
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
  panel.value = undefined;
}

defineExpose({ chooseImage, openEmoji, openMention });
</script>
<style lang="scss" scoped>
.post-tools {
  --post-tools-error-text: color-mix(in srgb, var(--tgc-od-red) 40%, var(--app-page-content));
}

.post-tools,
.post-tools-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-tools-panel {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.post-tools-bar,
.post-tools-status {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.post-tools-bar > .v-input {
  min-width: 0;
  flex: 1;
}

.post-emoji-grid {
  display: grid;
  overflow: auto;
  max-height: 176px;
  gap: 4px;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
}

.post-emoji-grid button {
  display: grid;
  min-width: 44px;
  min-height: 44px;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  place-items: center;
}

.post-emoji-grid button:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.post-emoji-grid button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.post-emoji-grid button:hover:not(:disabled) {
  border-color: var(--common-shadow-1);
  background: var(--box-bg-4);
}

.post-emoji-grid img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.post-tools-error,
.post-tools-status {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 20px;
}

.post-tools-status {
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
}

.post-tools-error {
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--post-tools-error-text);
  overflow-wrap: anywhere;
}
</style>
