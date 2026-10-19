<!-- 回复扩展工具：默认表情、图片和用户提及 -->
<template>
  <div class="vprt-tools">
    <div aria-label="回复扩展工具" class="vprt-toolbar" role="group">
      <button
        :aria-expanded="panel === 'emoji'"
        :disabled
        aria-label="插入表情"
        class="vprt-tool"
        title="插入表情"
        type="button"
        @click="toggleEmoji"
      >
        <v-icon size="18">mdi-emoticon-happy-outline</v-icon>
        <span>表情</span>
      </button>
      <button
        :disabled="disabled || !replyAssetCapabilities.imageUpload"
        aria-label="添加图片"
        :title="replyAssetCapabilities.imageUpload ? '添加图片' : '图片暂不可用'"
        class="vprt-tool"
        type="button"
        @click="openImagePicker"
      >
        <v-icon size="18">mdi-image-outline</v-icon>
        <span>图片</span>
      </button>
      <button
        :aria-expanded="panel === 'mention'"
        :disabled="disabled || !replyAssetCapabilities.mention"
        aria-label="提及用户"
        class="vprt-tool"
        title="提及用户"
        type="button"
        @click="toggleMention"
      >
        <v-icon size="18">mdi-at</v-icon>
        <span>提及</span>
      </button>
      <!-- TODO：确认 APP 发布 game_user_info 的必填字段后启用。
           角色选择和预览复用现有绑定角色接口及 tp-uid.vue，展示配置继续沿用组件。 -->
      <button
        aria-label="插入 UID 卡片"
        class="vprt-tool"
        disabled
        title="UID 卡片暂不可用"
        type="button"
      >
        <v-icon size="18">mdi-card-account-details-outline</v-icon>
        <span>UID 卡片</span>
      </button>
      <input
        ref="fileInput"
        :disabled="disabled || !replyAssetCapabilities.imageUpload"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        type="file"
        @cancel="clearImagePicker"
        @change="selectImage"
      />
    </div>
    <div v-if="uploading" aria-live="polite" class="vprt-status" role="status">
      <span>正在上传图片…</span>
      <button class="vprt-action" type="button" @click="cancelUpload">取消上传</button>
    </div>
    <div v-if="panel === 'emoji'" aria-label="表情面板" class="vprt-panel" role="region">
      <div class="vprt-heading">
        <span class="vprt-panel-title">选择表情</span>
        <button
          aria-label="收起表情"
          class="vprt-action"
          title="收起表情"
          type="button"
          @click="closePanel"
        >
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <div aria-label="表情系列" class="vprt-series">
        <!-- TODO：用户收藏表情使用独立的 custom_emoticon 节点。
             待确认 APP 收藏列表接口、登录凭据和分页契约后接入，不能用默认系列代替。 -->
        <button class="vprt-series-item" disabled title="收藏表情暂不可用" type="button">
          <v-icon size="24">mdi-star-outline</v-icon>
          <span>收藏</span>
        </button>
        <button
          v-for="series in emojiSeries"
          :key="series.id"
          :aria-pressed="selectedSeries === series.id"
          :disabled
          :title="series.name"
          class="vprt-series-item"
          type="button"
          @click="selectedSeries = series.id"
        >
          <img :alt="series.name" :src="series.icon" loading="lazy" />
          <span>{{ series.name }}</span>
        </button>
      </div>
      <div v-if="emojiLoading" aria-live="polite" class="vprt-status" role="status">
        正在加载表情…
      </div>
      <div v-else-if="emojiError" class="vprt-status" role="alert">
        <span>{{ emojiError }}</span>
        <button :disabled class="vprt-action" type="button" @click="loadEmoji">重试</button>
      </div>
      <div v-else-if="emojiItems.length === 0" class="vprt-status">暂无可用表情</div>
      <div v-else aria-label="表情列表" class="vprt-grid">
        <button
          v-for="emoji in emojiItems"
          :key="emoji.id"
          :aria-label="emoji.name"
          :disabled
          :title="emoji.name"
          class="vprt-emoji"
          type="button"
          @click="emits('insertText', `_(${emoji.name})`)"
        >
          <img :alt="emoji.name" :src="emoji.icon" loading="lazy" />
        </button>
      </div>
    </div>
    <div v-else-if="panel === 'mention'" aria-label="提及用户面板" class="vprt-panel" role="region">
      <div class="vprt-heading">
        <span class="vprt-panel-title">提及用户</span>
        <button
          aria-label="收起用户查找"
          class="vprt-action"
          title="收起用户查找"
          type="button"
          @click="closePanel"
        >
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <div class="vprt-lookup">
        <v-text-field
          v-model="mentionQuery"
          :disabled="disabled || mentionLoading"
          density="compact"
          hide-details
          label="米游社完整昵称"
          variant="outlined"
          @keydown.enter.prevent="lookupMention"
        />
        <v-btn
          :disabled="disabled || !mentionQuery.trim()"
          :loading="mentionLoading"
          size="small"
          variant="tonal"
          @click="lookupMention"
          >查找</v-btn
        >
      </div>
      <div v-if="mentionError" class="vprt-status" role="alert">
        {{ mentionError }}
      </div>
      <div v-if="mentionResult" class="vprt-result">
        <span>{{ mentionResult.nickname }} · UID {{ mentionResult.uid }}</span>
        <v-btn :disabled size="small" variant="tonal" @click="insertMention">插入 @</v-btn>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import bbsReq from "@req/bbsReq.js";
import replyAssetReq, { replyAssetCapabilities } from "@req/replyAssetReq.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

type ReplyToolsProps = {
  disabled: boolean;
  contextId: number;
  gid: number;
  cookie?: Record<string, string>;
};

/**
 * 打开图片选择器时的账号与帖子上下文
 * @since Beta v0.12.6
 */
type ImagePickerContext = {
  version: number;
  gid: number;
  cookie: Record<string, string>;
};

const props = defineProps<ReplyToolsProps>();
const emits = defineEmits<{
  insertText: [text: string];
  mention: [user: TGApp.BBS.ReplyAsset.Mention];
  image: [image: TGApp.BBS.ReplyAsset.UploadedImage];
}>();
const interaction = useReplyInteraction();
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const panel = ref<"emoji" | "mention">();
const emojiSeries = ref<Array<TGApp.BBS.Emoji.Series>>([]);
const selectedSeries = ref<number>();
const emojiLoading = ref<boolean>(false);
const emojiError = ref<string>("");
const mentionQuery = ref<string>("");
const mentionResult = ref<TGApp.BBS.ReplyAsset.Mention>();
const mentionLoading = ref<boolean>(false);
const mentionError = ref<string>("");
const uploading = ref<boolean>(false);
let mentionController: AbortController | undefined;
let uploadController: AbortController | undefined;
let imagePickerContext: ImagePickerContext | undefined;
let contextVersion = 0;
let mounted = true;

const emojiItems = computed<Array<TGApp.BBS.Emoji.Item>>(() =>
  (emojiSeries.value.find((series) => series.id === selectedSeries.value)?.list ?? [])
    .filter((emoji) => emoji.is_available && !!emoji.icon)
    .toSorted((a, b) => a.sort_order - b.sort_order),
);

watch(mentionQuery, () => {
  cancelMention();
  mentionResult.value = undefined;
  mentionError.value = "";
});

watch(() => props.contextId, resetContext, { flush: "sync" });
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closePanel();
  },
);

onBeforeUnmount(() => {
  mounted = false;
  resetContext();
});

function resetContext(): void {
  contextVersion += 1;
  closePanel();
  cancelUpload();
  clearImagePicker();
  mentionQuery.value = "";
  mentionResult.value = undefined;
  mentionError.value = "";
  emojiLoading.value = false;
}

function closePanel(): void {
  panel.value = undefined;
  cancelMention();
}

function cancelMention(): void {
  mentionController?.abort();
  mentionController = undefined;
  mentionLoading.value = false;
}

function cancelUpload(): void {
  uploadController?.abort();
}

function openImagePicker(): void {
  if (props.disabled || !replyAssetCapabilities.imageUpload || !props.cookie) return;
  const cookie = { ltoken: props.cookie.ltoken, ltuid: props.cookie.ltuid };
  if (!matchesCurrentAccount({ uid: cookie.ltuid, cookie })) {
    clearImagePicker();
    showSnackbar.warn("账号状态已变化，请重新打开帖子窗口");
    return;
  }
  imagePickerContext = {
    version: contextVersion,
    gid: props.gid,
    cookie,
  };
  fileInput.value?.click();
}

function clearImagePicker(): void {
  imagePickerContext = undefined;
  if (fileInput.value) fileInput.value.value = "";
}

async function toggleEmoji(): Promise<void> {
  if (props.disabled) return;
  if (panel.value === "emoji") {
    closePanel();
    return;
  }
  closePanel();
  panel.value = "emoji";
  if (emojiSeries.value.length === 0) await loadEmoji();
}

function toggleMention(): void {
  if (props.disabled || !replyAssetCapabilities.mention) return;
  if (panel.value === "mention") {
    closePanel();
    return;
  }
  closePanel();
  panel.value = "mention";
}

async function loadEmoji(): Promise<void> {
  if (emojiLoading.value || props.disabled) return;
  const version = contextVersion;
  emojiLoading.value = true;
  emojiError.value = "";
  try {
    const response = await bbsReq.emojis();
    if (!mounted || version !== contextVersion) return;
    if (response.retcode !== 0) throw new Error("加载失败");
    emojiSeries.value = response.data.list
      .filter((series) => series.is_available && series.list.some((item) => item.is_available))
      .toSorted((a, b) => a.sort_order - b.sort_order);
    if (!emojiSeries.value.some((series) => series.id === selectedSeries.value)) {
      selectedSeries.value = emojiSeries.value[0]?.id;
    }
  } catch {
    if (mounted && version === contextVersion) emojiError.value = "表情加载失败，请重试";
  } finally {
    if (mounted && version === contextVersion) emojiLoading.value = false;
  }
}

async function lookupMention(): Promise<void> {
  const nickname = mentionQuery.value.trim();
  if (props.disabled || mentionLoading.value || !nickname || !props.cookie) return;
  const requestCookie = { ...props.cookie };
  const version = contextVersion;
  const controller = new AbortController();
  mentionController = controller;
  mentionResult.value = undefined;
  mentionError.value = "";
  mentionLoading.value = true;
  try {
    const execution = await executeReplyForCurrentAccount(
      {
        uid: requestCookie.ltuid,
        cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
      },
      () => replyAssetReq.resolveMention(nickname, requestCookie, props.gid, controller.signal),
    );
    if (!mounted || version !== contextVersion || controller.signal.aborted) return;
    if (!execution.allowed) {
      mentionError.value = "账号状态已变化，请重新打开帖子窗口";
      return;
    }
    mentionResult.value = execution.data;
  } catch {
    if (mounted && version === contextVersion && !controller.signal.aborted) {
      mentionError.value = "查找失败，请检查完整昵称或稍后重试";
    }
  } finally {
    if (mentionController === controller) {
      mentionController = undefined;
      mentionLoading.value = false;
    }
  }
}

function insertMention(): void {
  if (props.disabled || !mentionResult.value) return;
  emits("mention", { ...mentionResult.value });
  closePanel();
}

async function selectImage(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  const picker = imagePickerContext;
  imagePickerContext = undefined;
  if (
    !file ||
    props.disabled ||
    !replyAssetCapabilities.imageUpload ||
    !picker ||
    picker.version !== contextVersion
  )
    return;
  const requestCookie = picker.cookie;
  const version = picker.version;
  const controller = new AbortController();
  await interaction.run(async () => {
    uploadController = controller;
    uploading.value = true;
    try {
      const execution = await executeReplyForCurrentAccount(
        {
          uid: requestCookie.ltuid,
          cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
        },
        () => replyAssetReq.uploadImage(file, requestCookie, picker.gid, controller.signal),
      );
      if (!mounted || version !== contextVersion || controller.signal.aborted) return;
      if (
        !execution.allowed ||
        !matchesCurrentAccount({
          uid: requestCookie.ltuid,
          cookie: requestCookie,
        })
      ) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口");
        return;
      }
      emits("image", execution.data);
    } catch (error) {
      if (mounted && version === contextVersion && !controller.signal.aborted) {
        showSnackbar.error(
          error instanceof Error ? error.message : "图片上传失败，请重新选择图片后重试",
        );
      }
    } finally {
      if (uploadController === controller) {
        uploadController = undefined;
        uploading.value = false;
      }
    }
  });
}
</script>
<style lang="scss" scoped>
.vprt-tools {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.vprt-toolbar,
.vprt-heading,
.vprt-status,
.vprt-lookup,
.vprt-result {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vprt-toolbar {
  flex-wrap: wrap;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  font-size: 12px;
  gap: 4px;
  line-height: 20px;
}

.vprt-tool,
.vprt-action,
.vprt-series-item,
.vprt-emoji {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
}

.vprt-tool {
  display: flex;
  min-height: 32px;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid transparent;
  color: var(--box-text-2);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
  gap: 4px;
}

.vprt-tool[aria-expanded="true"] {
  border-color: var(--common-shadow-2);
  background: var(--app-page-bg);
  box-shadow: inset 0 -2px var(--tgc-btn-1);
  color: var(--common-text-title);
}

.vprt-panel {
  display: flex;
  overflow: auto;
  min-width: 0;
  max-height: min(280px, 34vh);
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
  gap: 8px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.vprt-heading,
.vprt-result {
  justify-content: space-between;
}

.vprt-heading {
  min-height: 28px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--common-shadow-1);
}

.vprt-panel-title {
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
}

.vprt-series {
  display: flex;
  overflow: auto hidden;
  padding: 4px;
  gap: 4px;
  scrollbar-gutter: stable;
}

.vprt-series-item {
  display: flex;
  width: 60px;
  flex: 0 0 60px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid transparent;
  color: var(--app-page-content);
  gap: 4px;
}

.vprt-series-item[aria-pressed="true"] {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
  box-shadow: inset 0 -2px var(--tgc-btn-1);
}

.vprt-series-item img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.vprt-series-item span {
  overflow: hidden;
  width: 100%;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vprt-grid {
  display: grid;
  overflow: hidden auto;
  max-height: 160px;
  padding: 4px;
  gap: 4px;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  scrollbar-gutter: stable;
}

.vprt-emoji {
  display: grid;
  min-height: 44px;
  border: 1px solid transparent;
  place-items: center;
}

.vprt-emoji img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.vprt-action {
  min-width: 28px;
  min-height: 28px;
  padding: 4px 6px;
}

.vprt-status,
.vprt-result {
  min-width: 0;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.vprt-lookup > :first-child {
  min-width: 0;
  flex: 1;
}

.vprt-tool:focus-visible,
.vprt-action:focus-visible,
.vprt-series-item:focus-visible,
.vprt-emoji:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.vprt-tool:disabled,
.vprt-action:disabled,
.vprt-series-item:disabled,
.vprt-emoji:disabled {
  cursor: default;
  opacity: 0.45;
}

.vprt-tool:hover:not(:disabled),
.vprt-action:hover:not(:disabled),
.vprt-series-item:hover:not(:disabled),
.vprt-emoji:hover:not(:disabled) {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
}
</style>
