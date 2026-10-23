<template>
  <section
    :aria-label="label"
    class="post-fold-editor"
    :class="[`is-${variant}`, { 'is-collapsed': collapsed }]"
  >
    <header class="post-fold-editor-header">
      <h3>
        <button
          :aria-expanded="!collapsed"
          :aria-label="collapsed ? `展开「${label}」` : `收起「${label}」`"
          class="post-fold-editor-toggle"
          type="button"
          @click="collapsed = !collapsed"
        >
          <span class="post-fold-editor-label">{{ label }}</span>
          <v-icon aria-hidden="true" size="20">
            {{ collapsed ? "mdi-chevron-down" : "mdi-chevron-up" }}
          </v-icon>
        </button>
      </h3>
    </header>
    <VpPostEditor
      v-show="!collapsed"
      ref="editor"
      v-model="model"
      :allowComponents="false"
      :ariaLabel="label"
      :disabled="disabled || uploading"
      :maxLength="variant === 'title' ? postFoldTitleMaxLength : undefined"
      :mode="variant === 'title' ? 'fold-title' : 'article'"
      @error="emits('error', $event)"
      @validity-change="emits('validityChange', $event)"
      @image-click="tools?.chooseImage()"
      @emoticon-click="tools?.openEmoji($event)"
      @mention-click="tools?.openMention($event)"
    >
      <template #insert-panel>
        <VpPostTools
          ref="tools"
          :contextId
          :cookie
          :disabled
          :gid
          hideToolbar
          @image="editor?.insertImage($event)"
          @emoticon="editor?.insertEmoticon($event)"
          @custom-emoticon="editor?.insertCustomEmoticon($event)"
          @mention="editor?.insertMention($event)"
          @upload-busy="handleUploadBusy"
        />
      </template>
    </VpPostEditor>
  </section>
</template>

<script lang="ts" setup>
import { postFoldTitleMaxLength } from "@utils/bbs/postDocument.js";
import { ref, useTemplateRef } from "vue";

import VpPostEditor from "./vp-post-editor.vue";
import VpPostTools from "./vp-post-tools.vue";

const { label, variant, disabled, gid, cookie, contextId } = defineProps<{
  label: string;
  variant: "title" | "content";
  disabled: boolean;
  gid: number;
  cookie?: TGApp.App.Account.EditorCookie;
  contextId: number;
}>();
const model = defineModel<Array<TGApp.BBS.SctPost.Base>>({ required: true });
const emits = defineEmits<{
  error: [message: string];
  validityChange: [valid: boolean];
  uploadBusy: [busy: boolean];
}>();
const editor = useTemplateRef<InstanceType<typeof VpPostEditor>>("editor");
const tools = useTemplateRef<InstanceType<typeof VpPostTools>>("tools");
const collapsed = ref<boolean>(false);
const uploading = ref<boolean>(false);

function handleUploadBusy(busy: boolean): void {
  uploading.value = busy;
  emits("uploadBusy", busy);
}
</script>

<style lang="scss" scoped>
.post-fold-editor {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.post-fold-editor-header {
  flex: none;
  border-bottom: 1px solid var(--common-shadow-1);
}

.post-fold-editor.is-collapsed .post-fold-editor-header {
  border-bottom: 0;
}

.post-fold-editor-header h3 {
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
}

.post-fold-editor-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 4px 12px;
  border: 0;
  background: transparent;
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  gap: 8px;
  text-align: left;
}

.post-fold-editor-toggle:hover {
  background: var(--box-bg-4);
}

.post-fold-editor-toggle:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: -2px;
}

.post-fold-editor-label {
  overflow: hidden;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-fold-editor :deep(.tgpe-editor-shell > .tgpe-toolbar) {
  min-height: 44px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--common-shadow-1);
}

.post-fold-editor :deep(.tgpe-editor-shell > .tgpe-editor.ql-container) {
  min-height: 0;
  background: var(--app-page-bg);
}

.post-fold-editor :deep(.tgpe-editor-shell .tgpe-editor .ql-editor) {
  padding: 12px 16px;
}

.post-fold-editor.is-title :deep(.tgpe-editor-shell .tgpe-editor .ql-editor) {
  min-height: 80px;
  max-height: 120px;
}

.post-fold-editor.is-content :deep(.tgpe-editor-shell .tgpe-editor .ql-editor) {
  min-height: 240px;
  max-height: 360px;
}

.post-fold-editor :deep(.tgpe-editor-shell .tgpe-editor .ql-editor.ql-blank::before) {
  right: 16px;
  left: 16px;
}
</style>
