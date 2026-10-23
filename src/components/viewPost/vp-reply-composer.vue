<!-- 帖子评论与定向回复输入框 -->
<template>
  <form aria-label="回复编辑器" class="vpr-composer" @submit.prevent="publishReply">
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
    <div class="vpr-editor">
      <VpReplyEditor
        :key="toolContext"
        ref="replyEditor"
        v-model="content"
        :disabled="busy || !canWrite"
        :label="target ? '回复内容' : '评论内容'"
        @error="handleEditorError"
      />
      <div class="vpr-tools-wrap">
        <VpReplyTools
          :contextId="toolContext"
          :cookie="toolCookie"
          :disabled="busy || !canWrite"
          :gid="props.gid"
          @custom-emoticon="addCustomEmoticon"
          @game-uid="addGameUid"
          @image="addImage"
          @emoticon="insertEmoticon"
          @mention="insertMention"
        />
      </div>
    </div>
    <div
      v-if="gameUid || customEmoticon || images.length"
      aria-label="待发布附件"
      class="vpr-images"
      role="list"
    >
      <div v-if="gameUid" class="vpr-uid-card" role="listitem">
        <TpUid :key="gameUid.game_uid" :data="getGameUidPreview()" />
        <button
          aria-label="移除 UID 卡片"
          :disabled="busy || !canWrite"
          class="vpr-image-remove"
          type="button"
          @click="removeGameUid"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
      <div v-if="customEmoticon" class="vpr-image vpr-custom-emoticon" role="listitem">
        <img alt="待发布收藏表情" :src="customEmoticon.url" />
        <button
          aria-label="移除收藏表情"
          :disabled="busy || !canWrite"
          class="vpr-image-remove"
          type="button"
          @click="removeCustomEmoticon"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
      <div v-for="(image, index) in images" :key="index" class="vpr-image" role="listitem">
        <img :alt="`待发布图片 ${index + 1}`" :src="image.url" />
        <button
          :aria-label="`移除图片 ${index + 1}`"
          :disabled="busy || !canWrite"
          class="vpr-image-remove"
          type="button"
          @click="images.splice(index, 1)"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
    </div>
    <div class="vpr-footer">
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
  </form>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
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

const props = defineProps<ReplyComposerProps>();
const emits = defineEmits<{ cancel: []; published: [] }>();
const interaction = useReplyInteraction();
const busy = interaction.busy;
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const content = ref<string>("");
const mentions = ref<Array<TGApp.BBS.ReplyAsset.Mention>>([]);
const images = ref<Array<TGApp.BBS.ReplyAsset.UploadedImage>>([]);
const customEmoticon = ref<TGApp.BBS.CustomEmoticon.Value>();
const gameUid = ref<TGApp.BBS.GameUid.Info>();
const replyEditor = useTemplateRef<InstanceType<typeof VpReplyEditor>>("replyEditor");
const toolContext = ref<number>(0);
const publishing = ref<boolean>(false);
let contextVersion = 0;
let mounted = true;

const hasContent = computed<boolean>(
  () =>
    !!content.value.trim() ||
    images.value.length > 0 ||
    customEmoticon.value !== undefined ||
    gameUid.value !== undefined,
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
  if (gameUid.value === undefined) return undefined;
  return { insert: { game_user_info: gameUid.value } };
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
    resetDraft();
  },
  { flush: "sync" },
);

onBeforeUnmount(() => {
  mounted = false;
  contextVersion += 1;
});

function resetDraft(): void {
  content.value = "";
  mentions.value = [];
  images.value = [];
  customEmoticon.value = undefined;
  gameUid.value = undefined;
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
  const previous = mentions.value.find((item) => item.nickname === user.nickname);
  if (previous && previous.uid !== user.uid && content.value.includes(`@${previous.nickname}`)) {
    showSnackbar.warn("该昵称对应的用户已变化，请移除已有提及后重新选择");
    return;
  }
  mentions.value = [
    ...mentions.value.filter((item) => item.nickname !== user.nickname),
    { ...user },
  ];
  await insertText(`@${user.nickname} `);
}

function addImage(image: TGApp.BBS.ReplyAsset.UploadedImage): void {
  if (busy.value || !canWrite.value) return;
  images.value.push({ ...image });
}

function addCustomEmoticon(value: TGApp.BBS.CustomEmoticon.Value): void {
  if (busy.value || !canWrite.value) return;
  try {
    const parsed = parseCustomEmoticon(value);
    if (parsed.is_available === false) throw new TypeError("自定义表情已失效");
    customEmoticon.value = parsed;
  } catch {
    showSnackbar.warn("该收藏表情不可用，请重新选择");
  }
}

function addGameUid(value: TGApp.BBS.GameUid.Info): void {
  if (busy.value || !canWrite.value) return;
  try {
    gameUid.value = validateGameUidInfo(value);
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
  gameUid.value = undefined;
}

function removeCustomEmoticon(): void {
  if (busy.value || !canWrite.value) return;
  customEmoticon.value = undefined;
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
      content.value,
      mentions.value,
      images.value,
      customEmoticon.value,
      gameUid.value,
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
  const requestCookie = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  const title = props.target ? "发布回复" : "发布评论";
  const targetLabel = props.target ? `回复 ${props.target.user.nickname}` : "评论当前帖子";
  await interaction.run(async () => {
    publishing.value = true;
    try {
      const confirmed = await showDialog.checkF({
        title,
        text: `以 ${briefInfo.value.nickname || "当前账号"} ${targetLabel}：\n${document.preview}`,
        confirmLabel: title,
        cancelLabel: "继续编辑",
      });
      if (!confirmed) return;
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
        showSnackbar.error("评论未确认成功，请先刷新回复列表核对后再重试");
      }
    } finally {
      publishing.value = false;
    }
  });
}

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
  padding-top: 8px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.vpr-target,
.vpr-editor,
.vpr-footer {
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

.vpr-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vpr-tools-wrap {
  padding-top: 4px;
}

.vpr-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vpr-image {
  position: relative;
  width: 72px;
  height: 72px;
}

.vpr-uid-card {
  position: relative;
  overflow: hidden;
  width: min(260px, 100%);
  min-height: 72px;
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

.vpr-custom-emoticon img {
  background: var(--box-bg-4);
  object-fit: contain;
}

.vpr-image-remove {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: var(--app-page-bg);
  color: var(--common-text-title);
  cursor: pointer;
  place-items: center;
}

.vpr-uid-card > .vpr-image-remove {
  right: auto;
  left: 0;
}

.vpr-image-remove:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.vpr-image-remove:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.vpr-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 4px;
}

.vpr-submit {
  min-width: 92px;
  border-radius: 4px;
  color: var(--btn-text);
}

@media (width <= 480px) {
  .vpr-composer {
    max-height: min(340px, 48vh);
  }

  .vpr-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .vpr-submit {
    width: 100%;
  }
}
</style>
