<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    :persistent="locked"
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    width="800"
  >
    <section v-if="visible" class="post-component-panel">
      <header class="post-component-header">
        <h2 :id="titleId">{{ kind === "vote" ? "投票" : "折叠内容" }}</h2>
        <v-btn
          :disabled="locked"
          aria-label="关闭组件编辑器"
          icon="mdi-close"
          size="32"
          variant="text"
          @click="visible = false"
        />
      </header>
      <div class="post-component-body">
        <p v-if="error || errorMessage" class="post-component-error" role="alert">
          {{ error || errorMessage }}
        </p>
        <template v-if="kind === 'vote' && vote">
          <TpVote :data="{ insert: { vote } }" />
          <p class="post-component-hint">
            已有投票的设置保持不变。需要更换时，可移除此组件后创建新投票。
          </p>
        </template>
        <form v-else-if="kind === 'vote'" :id="formId" @submit.prevent="saveVote">
          <v-text-field
            v-model="voteTitle"
            :disabled="voteFormLocked"
            label="投票标题"
            variant="outlined"
          />
          <div class="post-component-options" aria-label="投票选项">
            <div v-for="(option, index) in options" :key="option.id" class="post-component-option">
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
            prepend-icon="mdi-plus"
            variant="text"
            @click="addOption"
          >
            添加选项
          </v-btn>
          <v-select
            v-model="voteLimit"
            :disabled="voteFormLocked"
            :items="voteLimits"
            item-title="title"
            item-value="value"
            label="每人最多可选"
            variant="outlined"
          />
          <v-text-field
            v-model="endTime"
            :disabled="voteFormLocked"
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
          color="var(--tgc-btn-1)"
          type="submit"
          variant="flat"
        >
          {{ voteCreated ? "插入已创建的投票" : "创建并插入" }}
        </v-btn>
        <v-btn
          v-else-if="kind === 'fold'"
          :disabled="locked || !titleValid || !contentValid"
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
import { assertPostDocumentContent, buildPostDocument } from "@utils/bbsPostDocument.js";
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
const voteLimit = ref<number>(1);
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
const voteLimits = computed<Array<{ title: string; value: number }>>(() =>
  options.value.map((_, index) => ({ title: `${index + 1} 项`, value: index + 1 })),
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
    voteTitle.value = "";
    options.value = [
      { id: nextOptionId++, text: "" },
      { id: nextOptionId++, text: "" },
    ];
    voteLimit.value = 1;
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
  voteLimit.value = Math.min(voteLimit.value, options.value.length);
}

function saveVote(): void {
  if (locked.value) return;
  const title = voteTitle.value.trim();
  const values = options.value.map((option) => option.text.trim());
  const end = Math.floor(new Date(endTime.value).getTime() / 1000);
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
  if (
    !Number.isSafeInteger(voteLimit.value) ||
    voteLimit.value < 1 ||
    voteLimit.value > values.length
  ) {
    error.value = "请选择每人可选的数量";
    return;
  }
  error.value = "";
  emits("saveVote", { title, end_time: end, vote_limit: voteLimit.value, vote_options: values });
}

function saveFold(): void {
  if (locked.value || !titleValid.value || !contentValid.value) return;
  try {
    const title = buildPostDocument(foldTitle.value);
    const content = buildPostDocument(foldContent.value);
    assertPostDocumentContent(title);
    assertPostDocumentContent(content);
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
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--app-page-bg);
  color: var(--app-page-content);
}

.post-component-header,
.post-component-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 16px;
  gap: 8px;
}

.post-component-header {
  justify-content: space-between;
}

.post-component-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.post-component-body {
  overflow: auto;
  min-height: 0;
  padding: 0 16px;
}

.post-component-options,
.post-component-fold {
  display: grid;
  gap: 12px;
}

.post-component-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-component-hint {
  margin: 8px 0 16px;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 20px;
}

.post-component-error {
  color: var(--tgc-od-red);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.post-component-actions {
  justify-content: flex-end;
}

.post-component-remove {
  margin-right: auto;
}

@media (width <= 600px) {
  .post-component-header,
  .post-component-actions {
    padding: 12px;
  }

  .post-component-body {
    padding: 0 12px;
  }
}
</style>
