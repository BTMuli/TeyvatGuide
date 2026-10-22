<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    :persistent="locked"
    class="vpcd-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    width="800"
    z-index="80"
  >
    <section v-if="visible" class="post-component-panel">
      <header class="post-component-header">
        <h2 :id="titleId">{{ kind === "vote" ? "投票" : "折叠内容" }}</h2>
        <v-btn
          :disabled="locked"
          aria-label="关闭组件编辑器"
          icon="mdi-close"
          size="32"
          title="关闭"
          variant="text"
          @click="visible = false"
        />
      </header>
      <div class="post-component-body">
        <div v-if="error || errorMessage" class="post-component-error" role="alert">
          <v-icon size="18">mdi-alert-circle-outline</v-icon>
          <span>{{ error || errorMessage }}</span>
        </div>
        <div v-if="kind === 'vote' && vote" class="post-component-vote">
          <TpVote :data="{ insert: { vote } }" />
          <p class="post-component-hint">
            已有投票的设置保持不变。需要更换时，可移除此组件后创建新投票。
          </p>
        </div>
        <form
          v-else-if="kind === 'vote'"
          :id="formId"
          class="post-component-form"
          @submit.prevent="saveVote"
        >
          <div class="post-component-title-row">
            <v-text-field
              v-model="voteTitle"
              :disabled="voteFormLocked"
              hide-details
              label="投票标题"
              variant="outlined"
            />
            <v-text-field
              v-model="voteLimit"
              :disabled="voteFormLocked"
              :max="options.length"
              hide-details
              hide-spin-buttons
              label="每人最多可选"
              min="1"
              step="1"
              suffix="项"
              type="number"
              variant="outlined"
            />
          </div>
          <fieldset class="post-component-fieldset">
            <legend class="post-component-label">投票选项</legend>
            <div class="post-component-options-box">
              <div class="post-component-options">
                <div
                  v-for="(option, index) in options"
                  :key="option.id"
                  class="post-component-option"
                >
                  <v-text-field
                    v-model="option.text"
                    :disabled="voteFormLocked"
                    :label="`选项 ${index + 1}`"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                  <v-btn
                    :disabled="voteFormLocked || options.length <= 2"
                    :aria-label="`移除选项 ${index + 1}`"
                    icon="mdi-close"
                    size="32"
                    variant="text"
                    @click="removeOption(option.id)"
                  />
                </div>
              </div>
              <v-btn
                :disabled="voteFormLocked"
                class="post-component-add"
                prepend-icon="mdi-plus"
                size="small"
                variant="text"
                @click="addOption"
              >
                添加选项
              </v-btn>
            </div>
          </fieldset>
          <v-text-field
            v-model="endTime"
            :disabled="voteFormLocked"
            hide-details
            label="截止时间"
            type="datetime-local"
            variant="outlined"
          />
          <p class="post-component-hint">
            {{
              voteCreated
                ? "投票已创建，重新尝试会插入同一投票。"
                : "创建后会生成米游社投票并插入正文，帖子仍需单独发布。"
            }}
          </p>
        </form>
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
      <footer class="post-component-actions">
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
          :form="formId"
          class="post-component-submit"
          color="var(--tgc-btn-1)"
          type="submit"
          variant="flat"
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
      </footer>
    </section>
  </v-dialog>
</template>

<script lang="ts" setup>
import {
  assertPostDocumentContent,
  assertPostFoldTitle,
  buildPostDocument,
} from "@utils/bbsPostDocument.js";
import { computed, ref, useId, watch } from "vue";

import TpVote from "./tp-vote.vue";
import VpPostFoldEditor from "./vp-post-fold-editor.vue";

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
} = defineProps<{
  kind: "vote" | "fold";
  disabled: boolean;
  loading: boolean;
  gid: number;
  cookie?: TGApp.App.Account.EditorCookie;
  contextId: number;
  fold?: TGApp.BBS.PostEdit.Fold;
  vote?: TGApp.BBS.PostEdit.Vote;
  errorMessage?: string;
  voteCreated?: boolean;
}>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{
  saveVote: [request: TGApp.BBS.Vote.CreateRequest];
  saveFold: [value: TGApp.BBS.PostEdit.Fold];
  remove: [];
  error: [message: string];
}>();
const titleId = useId();
const formId = useId();
const voteTitle = ref<string>("");
const options = ref<Array<{ id: number; text: string }>>([]);
const voteLimit = ref<string>("1");
const endTime = ref<string>("");
const foldTitle = ref<Array<TGApp.BBS.SctPost.Base>>([{ insert: "\n" }]);
const foldContent = ref<Array<TGApp.BBS.SctPost.Base>>([{ insert: "\n" }]);
const titleValid = ref<boolean>(true);
const contentValid = ref<boolean>(true);
const titleUploading = ref<boolean>(false);
const contentUploading = ref<boolean>(false);
const session = ref<number>(0);
const error = ref<string>("");
let nextOptionId = 0;
const locked = computed<boolean>(
  () => disabled || loading || titleUploading.value || contentUploading.value,
);
const voteFormLocked = computed<boolean>(() => locked.value || voteCreated);

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
    voteTitle.value = "";
    options.value = [
      { id: nextOptionId++, text: "" },
      { id: nextOptionId++, text: "" },
    ];
    voteLimit.value = "1";
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    endTime.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

function addOption(): void {
  if (!locked.value) options.value.push({ id: nextOptionId++, text: "" });
}

function removeOption(id: number): void {
  if (locked.value || options.value.length <= 2) return;
  options.value = options.value.filter((option) => option.id !== id);
  const limit = Number(voteLimit.value);
  if (Number.isSafeInteger(limit) && limit > options.value.length) {
    voteLimit.value = String(options.value.length);
  }
}

function saveVote(): void {
  if (locked.value) return;
  const title = voteTitle.value.trim();
  const values = options.value.map((option) => option.text.trim());
  const end = Math.floor(new Date(endTime.value).getTime() / 1000);
  const limit = Number(voteLimit.value);
  if (!title || values.some((value) => !value)) {
    error.value = "请填写投票标题和每个选项";
    return;
  }
  if (new Set(values).size !== values.length) {
    error.value = "投票选项不能重复";
    return;
  }
  if (!Number.isSafeInteger(end) || end <= Date.now() / 1000) {
    error.value = "请选择未来的截止时间";
    return;
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > values.length) {
    error.value = "请输入每人可选的数量";
    return;
  }
  error.value = "";
  emits("saveVote", { title, end_time: end, vote_limit: limit, vote_options: values });
}

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
.post-component-panel {
  --post-component-danger-text: color-mix(in srgb, var(--tgc-od-red) 65%, var(--app-page-content));
  --post-component-error-text: color-mix(in srgb, var(--tgc-od-red) 40%, var(--app-page-content));

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

.post-component-header,
.post-component-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 12px 16px;
  gap: 8px;
}

.post-component-header {
  justify-content: space-between;
  border-bottom: 1px solid var(--common-shadow-1);
}

.post-component-header h2 {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 26px;
}

.post-component-body {
  overflow: auto;
  min-height: 0;
  flex: 1 1 auto;
  padding: 16px;
  overscroll-behavior: contain;
}

.post-component-vote,
.post-component-form,
.post-component-fold {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.post-component-vote {
  gap: 12px;
}

.post-component-vote :deep(.tp-vote-box) {
  border-radius: 8px;
  margin: 0;
  background: var(--app-page-bg);
}

.post-component-fieldset {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 0;
  border: 0;
  margin: 0;
  gap: 8px;
}

.post-component-label {
  padding: 0;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.post-component-options-box {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 8px;
}

.post-component-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-component-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-component-option :deep(.v-input) {
  min-width: 0;
  flex: 1 1 auto;
}

.post-component-title-row {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 160px;
}

.post-component-body :deep(.v-field) {
  background: var(--app-page-bg);
}

.post-component-add {
  align-self: flex-start;
}

.post-component-submit {
  border-radius: 4px;
  color: var(--btn-text);
}

.post-component-hint {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 20px;
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
  flex-wrap: wrap;
  justify-content: flex-end;
  border-top: 1px solid var(--common-shadow-1);
}

.post-component-remove {
  margin-right: auto;
}

@media (width <= 600px) {
  .post-component-header,
  .post-component-body,
  .post-component-actions {
    padding: 12px;
  }

  .post-component-vote,
  .post-component-form,
  .post-component-fold,
  .post-component-title-row {
    gap: 12px;
  }

  .post-component-title-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.vpcd-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
