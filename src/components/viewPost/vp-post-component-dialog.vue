<template>
  <Teleport to="body">
    <TopOverlay
      v-model="visible"
      :closeDisabled="locked"
      :showShare="false"
      :titleId="titleId"
      blurVal="10px"
      closeAriaLabel="关闭组件编辑器"
      contentMaxHeight="none"
      panelMaxHeight="calc(100dvh - 48px)"
      panelWidth="800px"
    >
      <template #header>
        <h2 :id="titleId" class="post-component-title">
          {{ kind === "vote" ? "投票" : "折叠内容" }}
        </h2>
      </template>
      <div class="post-component-body">
        <div v-if="error || errorMessage" class="post-component-error" role="alert">
          <v-icon size="18">mdi-alert-circle-outline</v-icon>
          <span>{{ error || errorMessage }}</span>
        </div>
        <VpPostVoteEditor
          v-if="kind === 'vote'"
          :key="session"
          ref="voteEditor"
          :disabled
          :loading
          :vote
          :voteCreated
          @error="error = $event"
          @save="emits('saveVote', $event)"
        />
        <div v-else class="post-component-fold">
          <VpPostFoldEditor
            :key="`title-${session}`"
            v-model="foldTitle"
            :contextId="session"
            :cookie
            :disabled="disabled || loading"
            :gid
            label="折叠标题"
            variant="title"
            @error="error = $event"
            @validity-change="titleValid = $event"
            @upload-busy="titleUploading = $event"
          />
          <VpPostFoldEditor
            :key="`content-${session}`"
            v-model="foldContent"
            :contextId="session"
            :cookie
            :disabled="disabled || loading"
            :gid
            label="展开后的内容"
            variant="content"
            @error="error = $event"
            @validity-change="contentValid = $event"
            @upload-busy="contentUploading = $event"
          />
        </div>
      </div>
      <template #footer>
        <div class="post-component-actions">
          <v-btn
            v-if="vote || fold"
            :disabled="locked"
            class="post-component-remove"
            color="var(--post-component-danger-text)"
            variant="text"
            @click="emits('remove')"
          >
            移除组件
          </v-btn>
          <v-btn :disabled="locked" variant="text" @click="visible = false">取消</v-btn>
          <v-btn
            v-if="kind === 'vote' && !vote"
            :disabled="locked"
            :loading
            class="post-component-submit"
            color="var(--tgc-btn-1)"
            variant="flat"
            @click="voteEditor?.submit()"
          >
            {{ voteCreated ? "插入已创建的投票" : "创建并插入" }}
          </v-btn>
          <v-btn
            v-else-if="kind === 'fold'"
            :disabled="locked || !titleValid || !contentValid"
            class="post-component-submit"
            color="var(--tgc-btn-1)"
            variant="flat"
            @click="saveFold"
          >
            {{ fold ? "保存" : "插入" }}
          </v-btn>
        </div>
      </template>
    </TopOverlay>
  </Teleport>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import {
  assertPostDocumentContent,
  assertPostFoldTitle,
  buildPostDocument,
} from "@utils/bbs/postDocument.js";
import { computed, ref, useId, useTemplateRef, watch } from "vue";

import VpPostFoldEditor from "./vp-post-fold-editor.vue";
import VpPostVoteEditor from "./vp-post-vote-editor.vue";

/**
 * 帖子组件编辑器参数。
 * @since Beta v0.13.1
 */
type PostComponentDialogProps = {
  /** 组件类型 */
  kind: "vote" | "fold";
  /** 是否禁用操作 */
  disabled: boolean;
  /** 是否正在保存 */
  loading: boolean;
  /** 版块 ID */
  gid: number;
  /** 编辑凭据 */
  cookie?: TGApp.App.Account.EditorCookie;
  /** 编辑器上下文版本 */
  contextId: number;
  /** 待编辑的折叠内容 */
  fold?: TGApp.BBS.PostEdit.Fold;
  /** 待编辑的投票 */
  vote?: TGApp.BBS.PostEdit.Vote;
  /** 外部错误信息 */
  errorMessage?: string;
  /** 投票是否已创建 */
  voteCreated?: boolean;
};

/**
 * 帖子组件编辑器事件。
 * @since Beta v0.13.1
 */
type PostComponentDialogEmits = {
  /** 请求创建投票 */
  saveVote: [request: TGApp.BBS.Vote.CreateRequest];
  /** 请求保存折叠内容 */
  saveFold: [value: TGApp.BBS.PostEdit.Fold];
  /** 请求移除当前组件 */
  remove: [];
  /** 编辑错误信息 */
  error: [message: string];
};

const {
  kind,
  disabled,
  loading,
  gid,
  cookie,
  contextId,
  fold,
  vote,
  errorMessage,
  voteCreated = false,
} = defineProps<PostComponentDialogProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<PostComponentDialogEmits>();
const titleId = useId();
const voteEditor = useTemplateRef<InstanceType<typeof VpPostVoteEditor>>("voteEditor");
const foldTitle = ref<Array<TGApp.BBS.SctPost.Base>>([{ insert: "\n" }]);
const foldContent = ref<Array<TGApp.BBS.SctPost.Base>>([{ insert: "\n" }]);
const titleValid = ref<boolean>(true);
const contentValid = ref<boolean>(true);
const titleUploading = ref<boolean>(false);
const contentUploading = ref<boolean>(false);
const session = ref<number>(0);
const error = ref<string>("");
const locked = computed<boolean>(
  () => disabled || loading || titleUploading.value || contentUploading.value,
);

watch(
  () => [visible.value, contextId],
  () => {
    if (!visible.value) return;
    session.value += 1;
    error.value = "";
    titleUploading.value = false;
    contentUploading.value = false;
    titleValid.value = true;
    contentValid.value = true;
    try {
      foldTitle.value = fold ? buildPostDocument(JSON.parse(fold.title)).nodes : [{ insert: "\n" }];
      foldContent.value = fold
        ? buildPostDocument(JSON.parse(fold.content)).nodes
        : [{ insert: "\n" }];
    } catch {
      error.value = "折叠内容无法载入，请关闭后重试";
      titleValid.value = false;
      contentValid.value = false;
    }
  },
  { immediate: true },
);

function saveFold(): void {
  if (locked.value || !titleValid.value || !contentValid.value) return;
  try {
    const title = buildPostDocument(foldTitle.value);
    const content = buildPostDocument(foldContent.value);
    assertPostDocumentContent(title);
    assertPostDocumentContent(content);
    assertPostFoldTitle(title);
    const value: TGApp.BBS.PostEdit.Fold = {
      id: fold?.id ?? crypto.randomUUID(),
      size: String(
        title.text.length + content.text.length + title.images.length + content.images.length,
      ),
      title: JSON.stringify(title.nodes),
      content: JSON.stringify(content.nodes),
    };
    error.value = "";
    emits("saveFold", value);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "请检查折叠标题和内容";
  }
}
</script>

<style lang="scss" scoped>
.post-component-body,
.post-component-actions {
  --post-component-danger-text: color-mix(in srgb, var(--tgc-od-red) 65%, var(--app-page-content));
  --post-component-error-text: color-mix(in srgb, var(--tgc-od-red) 40%, var(--app-page-content));
}

.post-component-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 26px;
}

.post-component-body {
  padding: 0;
}

.post-component-fold {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.post-component-body :deep(.v-field) {
  background: var(--app-page-bg);
}

.post-component-submit {
  border-radius: 4px;
  color: var(--btn-text);
}

.post-component-error {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  margin-bottom: 16px;
  background: var(--box-bg-4);
  color: var(--post-component-error-text);
  font-size: 13px;
  gap: 8px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.post-component-actions {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.post-component-remove {
  margin-right: auto;
}

@media (width <= 600px) {
  .post-component-fold {
    gap: 12px;
  }
}
</style>
