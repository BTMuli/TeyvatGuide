<!-- 帖子评论与定向回复输入框 -->
<template>
  <form
    aria-label="回复编辑器"
    class="vpr-composer"
    :class="{ 'has-context': !!$slots.context }"
    @submit.prevent="publishReply"
  >
    <div
      v-if="target && props.showTarget !== false"
      aria-live="polite"
      class="vpr-target"
      role="status"
    >
      <div class="vpr-target-copy">
        <v-icon size="16">mdi-reply-outline</v-icon>
        <span
          >回复 <strong>{{ target.user.nickname }}</strong></span
        >
      </div>
      <v-btn
        :disabled="busy || !canWrite"
        aria-label="取消定向回复"
        class="vpr-target-cancel"
        icon="mdi-close"
        size="24"
        variant="text"
        @click="cancelReply"
      />
    </div>
    <div class="vpr-actions">
      <VpReplyTools
        ref="tools"
        :contextId="toolContext"
        :cookie="toolCookie"
        :disabled="busy || !canWrite"
        :gid="props.gid"
        @custom-emoticon="addCustomEmoticon"
        @game-uid="addGameUid"
        @image="addImage"
        @emoticon="insertEmoticon"
        @mention="insertMention"
        @upload-end="handleUploadEnd"
        @upload-start="handleUploadStart"
      />
      <div v-if="$slots.context" class="vpr-context">
        <slot name="context" />
      </div>
      <v-btn
        :disabled="!canWrite || !hasContent || busy"
        class="vpr-submit"
        :loading="publishing"
        color="var(--tgc-btn-1)"
        size="small"
        type="submit"
        variant="flat"
      >
        {{ target ? "回复" : "发布" }}
      </v-btn>
    </div>
    <div class="vpr-content">
      <div class="vpr-editor">
        <VpReplyEditor
          :key="toolContext"
          ref="replyEditor"
          v-model="draft.content"
          :disabled="busy || !canWrite"
          :label="target ? '回复内容' : '评论内容'"
          @error="handleEditorError"
        />
      </div>
      <aside v-if="hasAttachments" aria-label="待发布附件" class="vpr-attachments" role="list">
        <div v-if="draft.gameUid" class="vpr-uid-card" role="listitem">
          <TpUid :key="draft.gameUid.game_uid" :data="getGameUidPreview()" />
          <button
            aria-label="移除 UID 卡片"
            :disabled="busy || !canWrite"
            class="vpr-image-remove"
            type="button"
            @click="removeGameUid"
          >
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>
        <div v-if="draft.customEmoticon" class="vpr-image vpr-custom-emoticon" role="listitem">
          <img alt="待发布收藏表情" :src="draft.customEmoticon.url" />
          <button
            aria-label="移除收藏表情"
            :disabled="busy || !canWrite"
            class="vpr-image-remove"
            type="button"
            @click="removeCustomEmoticon"
          >
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>
        <div v-for="(image, index) in draft.images" :key="index" class="vpr-image" role="listitem">
          <img :alt="`待发布图片 ${index + 1}`" :src="image.url" />
          <button
            :aria-label="`移除图片 ${index + 1}`"
            :disabled="busy || !canWrite"
            class="vpr-image-remove"
            type="button"
            @click="draft.images.splice(index, 1)"
          >
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>
        <div
          v-if="imageUploading"
          aria-label="正在上传图片"
          class="vpr-image vpr-image-pending"
          role="listitem"
        >
          <v-progress-circular indeterminate size="20" />
          <button
            aria-label="取消图片上传"
            class="vpr-image-remove"
            type="button"
            @click="cancelImageUpload"
          >
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>
      </aside>
    </div>
  </form>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { createReplyDraft } from "@hooks/useReplyDraft.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import postReq from "@req/postReq.js";
import useUserStore from "@store/user.js";
import { parseCustomEmoticon } from "@utils/bbs/customEmoticon.js";
import { validateGameUidInfo } from "@utils/bbs/gameUid.js";
import { executeReplyForCurrentAccount } from "@utils/bbs/replyAccount.js";
import { buildReplyDocument } from "@utils/bbs/replyDocument.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import TpUid from "./tp-uid.vue";
import VpReplyEditor from "./vp-reply-editor.vue";
import VpReplyTools from "./vp-reply-tools.vue";

/**
 * 评论输入框参数。
 * @since Beta v0.13.0
 */
type ReplyComposerProps = {
  postId: string;
  gid: number;
  target?: TGApp.BBS.Reply.ReplyFull;
  showTarget?: boolean;
};

/**
 * 评论输入框插槽。
 * @since Beta v0.13.1
 */
type ReplyComposerSlots = {
  /** 与工具栏同行的上下文（回复时间线），提供时工具栏与提交按钮分列两侧 */
  context?: () => unknown;
};

const props = defineProps<ReplyComposerProps>();
const emits = defineEmits<{ cancel: []; published: [] }>();
const interaction = useReplyInteraction();
const busy = interaction.busy;
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const draft = defineModel<TGApp.BBS.Reply.Draft>("draft", { required: true });
const replyEditor = useTemplateRef<InstanceType<typeof VpReplyEditor>>("replyEditor");
const tools = useTemplateRef<{ cancelUpload: () => void }>("tools");
const imageUploading = ref<boolean>(false);
const toolContext = ref<number>(0);
const publishing = ref<boolean>(false);
let contextVersion = 0;
let mounted = true;

const hasContent = computed<boolean>(
  () =>
    !!draft.value.content.trim() ||
    draft.value.images.length > 0 ||
    draft.value.customEmoticon !== undefined ||
    draft.value.gameUid !== undefined,
);
const hasAttachments = computed<boolean>(
  () =>
    draft.value.customEmoticon !== undefined ||
    draft.value.gameUid !== undefined ||
    draft.value.images.length > 0 ||
    imageUploading.value,
);
const canWrite = computed<boolean>(
  () => !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken.trim(),
);
const toolCookie = computed<TGApp.App.Account.Cookie | undefined>(() => {
  if (!canWrite.value || !cookie.value) return undefined;
  return {
    ltoken: cookie.value.ltoken,
    ltuid: cookie.value.ltuid,
    account_id: cookie.value.account_id,
    cookie_token: cookie.value.cookie_token,
    stoken: cookie.value.stoken,
    stuid: cookie.value.stuid,
    mid: cookie.value.mid,
  };
});
const accountHint = computed<string>(() => {
  if (!canWrite.value) return "请先登录米游社账号";
  return `当前账号：${briefInfo.value.nickname || "当前账号"}`;
});
const gameUidPreview = computed<TGApp.BBS.GameUid.Node | undefined>(() => {
  if (draft.value.gameUid === undefined) return undefined;
  return { insert: { game_user_info: draft.value.gameUid } };
});

watch(
  () => [
    props.postId,
    props.gid,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
    cookie.value?.account_id,
    cookie.value?.cookie_token,
  ],
  () => {
    contextVersion += 1;
    resetDraft();
  },
  { flush: "sync" },
);

watch(
  () => props.target?.reply.reply_id,
  () => {
    contextVersion += 1;
    imageUploading.value = false;
    toolContext.value += 1;
  },
  { flush: "sync" },
);

onBeforeUnmount(() => {
  mounted = false;
  contextVersion += 1;
});

function resetDraft(): void {
  draft.value = createReplyDraft();
  imageUploading.value = false;
  toolContext.value += 1;
}

function cancelReply(): void {
  if (busy.value) return;
  resetDraft();
  emits("cancel");
}

async function focusEditor(): Promise<void> {
  if (busy.value || !canWrite.value) return;
  await nextTick();
  if (busy.value || !canWrite.value) return;
  await replyEditor.value?.focusEditor();
}

async function insertText(text: string): Promise<void> {
  if (busy.value || !canWrite.value) return;
  await replyEditor.value?.insertText(text);
}

async function insertEmoticon(emoji: TGApp.BBS.Emoji.Item): Promise<void> {
  if (busy.value || !canWrite.value) return;
  await replyEditor.value?.insertEmoticon(emoji);
}

function handleEditorError(message: string): void {
  showSnackbar.error(message);
}

async function insertMention(user: TGApp.BBS.ReplyAsset.Mention): Promise<void> {
  if (busy.value || !canWrite.value) return;
  const previous = draft.value.mentions.find((item) => item.nickname === user.nickname);
  if (
    previous &&
    previous.uid !== user.uid &&
    draft.value.content.includes(`@${previous.nickname}`)
  ) {
    showSnackbar.warn("该昵称对应的用户已变化，请移除已有提及后重新选择");
    return;
  }
  draft.value.mentions = [
    ...draft.value.mentions.filter((item) => item.nickname !== user.nickname),
    { ...user },
  ];
  await insertText(`@${user.nickname} `);
}

function addImage(image: TGApp.BBS.ReplyAsset.UploadedImage): void {
  if (busy.value || !canWrite.value) return;
  draft.value.images.push({ ...image });
}

function handleUploadStart(): void {
  imageUploading.value = true;
}

function handleUploadEnd(): void {
  imageUploading.value = false;
}

function cancelImageUpload(): void {
  tools.value?.cancelUpload();
}

function addCustomEmoticon(value: TGApp.BBS.CustomEmoticon.Value): void {
  if (busy.value || !canWrite.value) return;
  try {
    const parsed = parseCustomEmoticon(value);
    if (parsed.is_available === false) throw new TypeError("自定义表情已失效");
    draft.value.customEmoticon = parsed;
  } catch {
    showSnackbar.warn("该收藏表情不可用，请重新选择");
  }
}

function addGameUid(value: TGApp.BBS.GameUid.Info): void {
  if (busy.value || !canWrite.value) return;
  try {
    draft.value.gameUid = validateGameUidInfo(value);
  } catch {
    showSnackbar.warn("该 UID 卡片不可用，请重新选择游戏账号");
  }
}

/**
 * 获取 UID 卡片预览节点
 * @since Beta v0.13.0
 * @returns UID 卡片节点
 */
function getGameUidPreview(): TGApp.BBS.GameUid.Node {
  if (gameUidPreview.value === undefined) throw new Error("UID 卡片预览不可用");
  return gameUidPreview.value;
}

function removeGameUid(): void {
  if (busy.value || !canWrite.value) return;
  draft.value.gameUid = undefined;
}

function removeCustomEmoticon(): void {
  if (busy.value || !canWrite.value) return;
  draft.value.customEmoticon = undefined;
}

async function publishReply(): Promise<void> {
  if (busy.value) return;
  if (!canWrite.value || !cookie.value) {
    showSnackbar.warn(accountHint.value);
    return;
  }
  if (!hasContent.value) {
    showSnackbar.warn("请输入评论内容");
    return;
  }
  if (!Number.isSafeInteger(props.gid) || props.gid <= 0) {
    showSnackbar.warn("请选择游戏");
    return;
  }
  let document: ReturnType<typeof buildReplyDocument>;
  try {
    document = buildReplyDocument(
      draft.value.content,
      draft.value.mentions,
      draft.value.images,
      draft.value.customEmoticon,
      draft.value.gameUid,
    );
  } catch {
    showSnackbar.warn("回复内容无效，请检查后重试");
    return;
  }
  const version = contextVersion;
  const request: TGApp.BBS.Reply.CreateParams = {
    postId: props.postId,
    gid: props.gid,
    content: document.content,
    structuredContent: document.structuredContent,
    replyId: props.target?.reply.reply_id,
  };
  const requestCookie = {
    ltoken: cookie.value.ltoken,
    ltuid: cookie.value.ltuid,
  };
  const title = props.target ? "发布回复" : "发布评论";
  await interaction.run(async () => {
    publishing.value = true;
    try {
      if (!mounted || version !== contextVersion || !canWrite.value) {
        showSnackbar.warn("账号或回复目标已变化，请重新确认");
        return;
      }
      const execution = await executeReplyForCurrentAccount(
        { uid: requestCookie.ltuid, cookie: requestCookie },
        () => postReq.reply.create(request, requestCookie),
      );
      if (!mounted || version !== contextVersion) return;
      if (execution.allowed === false) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口后再操作");
        return;
      }
      const response = execution.data;
      if (response.retcode !== 0) {
        showSnackbar.error(`[${response.retcode}] ${response.message}`);
        return;
      }
      resetDraft();
      showSnackbar.success(`${title}成功`);
      emits("published");
    } catch {
      if (mounted && version === contextVersion) {
        showSnackbar.error("评论发布失败，请刷新回复列表核对后再重试");
      }
    } finally {
      publishing.value = false;
    }
  });
}

defineSlots<ReplyComposerSlots>();
defineExpose({ focusEditor });
</script>
<style lang="scss" scoped>
.vpr-composer {
  display: flex;
  overflow: hidden auto;
  width: 100%;
  max-height: min(360px, 44vh);
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.vpr-composer.has-context {
  overflow: visible;
  max-height: none;
}

.vpr-target,
.vpr-content,
.vpr-actions {
  min-width: 0;
}

.vpr-target {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-4);
  color: var(--common-text-title);
  font-size: 12px;
  gap: 8px;
}

.vpr-target-copy {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.vpr-target-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vpr-target-copy strong {
  font-weight: 600;
}

.vpr-target-cancel {
  flex: 0 0 auto;
}

.vpr-content {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px;
}

.vpr-editor {
  display: flex;
  min-width: 240px;
  flex: 1 1 240px;
}

.vpr-editor :deep(.vpr-editor-shell) {
  display: flex;
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  flex-direction: column;
}

.vpr-editor :deep(.vpr-editor.ql-container) {
  flex: 1 1 auto;
}

.vpr-editor :deep(.ql-editor) {
  height: 100%;
  max-height: 72px;
}

.vpr-attachments {
  display: flex;
  overflow: auto hidden;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  flex: none;
  flex-flow: row nowrap;
  align-items: flex-start;
  padding: 12px 12px 0 0;
  gap: 12px;
  scrollbar-width: thin;
}

.vpr-image {
  position: relative;
  width: 72px;
  height: 72px;
  flex: none;
}

.vpr-uid-card {
  position: relative;
  overflow: visible;
  width: 240px;
  max-width: 100%;
  min-height: 72px;
  flex: none;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-4);
}

.vpr-uid-card :deep(.tpu-box) {
  min-height: 72px;
}

.vpr-image img {
  width: 100%;
  height: 100%;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  object-fit: cover;
}

.vpr-image-pending {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--box-text-4);
}

.vpr-custom-emoticon img {
  background: var(--box-bg-4);
  object-fit: contain;
}

.vpr-image-remove {
  position: absolute;
  top: -10px;
  right: -10px;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--box-bg-1);
  border-radius: 50%;
  background: var(--tgc-od-red);
  color: var(--tgc-white-1);
  cursor: pointer;
}

.vpr-image-remove:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.vpr-image-remove:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.vpr-image-remove:hover:not(:disabled) {
  opacity: 0.82;
}

.vpr-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  order: 1;
  gap: 8px;
}

.vpr-composer.has-context .vpr-actions {
  display: grid;
  align-items: end;
  order: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 360px) minmax(0, 1fr);
}

.vpr-actions :deep(.vprt-tools) {
  min-width: 0;
  flex: 1 1 auto;
}

.vpr-context {
  width: 100%;
  max-width: 360px;
  justify-self: center;
}

.vpr-submit {
  min-width: 92px;
  flex: none;
  border-radius: 4px;
  margin-left: auto;
  color: var(--btn-text);
}

.vpr-composer.has-context .vpr-submit {
  justify-self: end;
}

@media (width <= 480px) {
  .vpr-composer {
    max-height: min(340px, 48vh);
  }
}
</style>
