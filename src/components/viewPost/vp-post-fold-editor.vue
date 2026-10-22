<template>
  <section class="post-fold-editor" :aria-label="label">
    <h3>{{ label }}</h3>
    <VpPostEditor
      ref="editor"
      v-model="model"
      :allowComponents="false"
      :disabled="disabled || uploading"
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
import { ref, useTemplateRef } from "vue";

import VpPostEditor from "./vp-post-editor.vue";
import VpPostTools from "./vp-post-tools.vue";

const { label, disabled, gid, cookie, contextId } = defineProps<{
  label: string;
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
const uploading = ref<boolean>(false);

function handleUploadBusy(busy: boolean): void {
  uploading.value = busy;
  emits("uploadBusy", busy);
}
</script>

<style lang="scss" scoped>
.post-fold-editor {
  min-width: 0;
}

.post-fold-editor h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.post-fold-editor :deep(.ql-editor) {
  min-height: 80px;
  max-height: 240px;
}
</style>
