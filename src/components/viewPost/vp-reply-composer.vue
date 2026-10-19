<!-- 帖子评论与定向回复输入框 -->
<template>
  <form aria-label="回复编辑器" class="vpr-composer" @submit.prevent="publishReply">
    <div v-if="target" aria-live="polite" class="vpr-target" role="status">
      <div class="vpr-target-copy">
        <v-icon size="16">mdi-reply-outline</v-icon>
        <span
          >回复 <strong>{{ target.user.nickname }}</strong></span
        >
      </div>
      <v-btn
        :disabled="busy"
        aria-label="取消定向回复"
        class="vpr-target-cancel"
        icon="mdi-close"
        size="24"
        variant="text"
        @click="emits('cancel')"
      />
    </div>
    <div class="vpr-editor">
      <div
        ref="editorRoot"
        class="vpr-editor-root"
        @focusout="rememberSelection"
        @input="rememberSelection"
        @keyup="rememberSelection"
        @mouseup="rememberSelection"
        @select="rememberSelection"
      >
        <v-textarea
          v-model="content"
          :aria-label="target ? '回复内容' : '评论内容'"
          :disabled="busy || !canWrite"
          :label="target ? '回复内容' : '发表评论'"
          auto-grow
          class="vpr-textarea"
          hide-details
          max-rows="6"
          placeholder="输入内容…"
          rows="2"
          variant="outlined"
        />
      </div>
      <div class="vpr-tools-wrap">
        <VpReplyTools
          :contextId="toolContext"
          :cookie="toolCookie"
          :disabled="busy || !canWrite"
          :gid="props.gid"
          @image="addImage"
          @insert-text="insertText"
          @mention="insertMention"
        />
      </div>
    </div>
    <div v-if="images.length" aria-label="待发布图片" class="vpr-images" role="list">
      <div v-for="(image, index) in images" :key="index" class="vpr-image" role="listitem">
        <img :alt="`待发布图片 ${index + 1}`" :src="image.url" />
        <button
          :aria-label="`移除图片 ${index + 1}`"
          :disabled="busy"
          class="vpr-image-remove"
          type="button"
          @click="images.splice(index, 1)"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
    </div>
    <div class="vpr-footer">
      <div aria-live="polite" class="vpr-account-status" role="status">
        <v-icon size="16">mdi-account-circle-outline</v-icon>
        <span class="vpr-account">{{ accountHint }}</span>
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
        {{ target ? "发布回复" : "发布评论" }}
      </v-btn>
    </div>
  </form>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { executeReplyForCurrentAccount } from "@utils/bbsReplyAccount.js";
import { buildReplyDocument } from "@utils/bbsReplyDocument.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import VpReplyTools from "./vp-reply-tools.vue";

/**
 * 评论输入框参数。
 * @since Beta v0.12.6
 */
type ReplyComposerProps = {
  postId: string;
  gid: number;
  target?: TGApp.BBS.Reply.ReplyFull;
};

const props = defineProps<ReplyComposerProps>();
const emits = defineEmits<{ cancel: []; published: [] }>();
const interaction = useReplyInteraction();
const busy = interaction.busy;
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const { incognito } = storeToRefs(useAppStore());
const content = ref<string>("");
const mentions = ref<Array<TGApp.BBS.ReplyAsset.Mention>>([]);
const images = ref<Array<TGApp.BBS.ReplyAsset.UploadedImage>>([]);
const editorRoot = useTemplateRef<HTMLDivElement>("editorRoot");
const toolContext = ref<number>(0);
const publishing = ref<boolean>(false);
let selectionStart = 0;
let selectionEnd = 0;
let contextVersion = 0;
let mounted = true;

const hasContent = computed<boolean>(() => !!content.value.trim() || images.value.length > 0);
const canWrite = computed<boolean>(
  () =>
    !incognito.value &&
    !!uid.value &&
    cookie.value?.ltuid === uid.value &&
    !!cookie.value?.ltoken.trim(),
);
const toolCookie = computed<Record<string, string> | undefined>(() => {
  if (!canWrite.value || !cookie.value) return undefined;
  return { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
});
const accountHint = computed<string>(() => {
  if (incognito.value) return "无痕模式下仅可浏览";
  if (!canWrite.value) return "请先登录米游社账号";
  return `发布账号：${briefInfo.value.nickname || "当前账号"}`;
});

watch(
  () => [
    props.postId,
    props.gid,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
    incognito.value,
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
  selectionStart = 0;
  selectionEnd = 0;
  toolContext.value += 1;
}

function rememberSelection(): void {
  const textarea = editorRoot.value?.querySelector("textarea");
  if (!textarea) return;
  selectionStart = textarea.selectionStart;
  selectionEnd = textarea.selectionEnd;
}

async function insertText(text: string): Promise<void> {
  if (busy.value || !canWrite.value) return;
  const start = Math.min(selectionStart, content.value.length);
  const end = Math.max(start, Math.min(selectionEnd, content.value.length));
  content.value = content.value.slice(0, start) + text + content.value.slice(end);
  selectionStart = start + text.length;
  selectionEnd = selectionStart;
  await nextTick();
  const textarea = editorRoot.value?.querySelector("textarea");
  textarea?.focus();
  textarea?.setSelectionRange(selectionStart, selectionEnd);
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
  if (!canWrite.value) return;
  images.value.push({ ...image });
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
    document = buildReplyDocument(content.value, mentions.value, images.value);
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
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
  gap: 4px;
}

.vpr-editor-root {
  min-width: 0;
}

.vpr-textarea :deep(.v-field) {
  border-radius: 4px;
}

.vpr-textarea :deep(.v-field__input) {
  line-height: 20px;
}

.vpr-tools-wrap {
  padding-top: 4px;
  border-top: 1px solid var(--common-shadow-1);
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

.vpr-image img {
  width: 100%;
  height: 100%;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  object-fit: cover;
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  gap: 8px;
}

.vpr-account-status {
  display: flex;
  min-width: 0;
  align-items: center;
  color: var(--app-page-content);
  gap: 4px;
}

.vpr-account {
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.vpr-submit {
  min-width: 92px;
  border-radius: 4px;
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
