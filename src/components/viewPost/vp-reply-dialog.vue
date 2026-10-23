<!-- 回复上下文与编辑对话框 -->
<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    :captureFocus="!busy"
    :persistent="busy"
    :retainFocus="!busy"
    :width="dialogWidth"
    class="vprd-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    z-index="80"
    @after-enter="focusComposer"
    @after-leave="emits('closed')"
  >
    <section class="vprd-panel">
      <div class="vprd-top">
        <header class="vprd-header">
          <h2 :id="titleId" :title="title">{{ title }}</h2>
          <v-btn
            :disabled="busy"
            aria-label="关闭回复编辑器"
            icon="mdi-close"
            size="32"
            title="关闭"
            variant="text"
            @click="visible = false"
          />
        </header>
        <section
          v-if="contextItems.length"
          aria-label="回复上下文"
          class="vprd-context"
          role="region"
        >
          <ol ref="contextList" class="vprd-timeline">
            <li v-for="item in contextItems" :key="item.reply.reply_id">
              <VpReplyItem :modelValue="item" mode="sub" preview />
            </li>
          </ol>
        </section>
      </div>
      <div class="vprd-editor">
        <VpReplyComposer
          ref="composer"
          :gid="props.gid"
          :postId="props.postId"
          :showTarget="false"
          :target="props.target"
          @published="emits('published')"
        />
      </div>
    </section>
  </v-dialog>
</template>
<script lang="ts" setup>
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import { computed, nextTick, useId, useTemplateRef } from "vue";

import VpReplyComposer from "./vp-reply-composer.vue";
import VpReplyItem from "./vp-reply-item.vue";

/**
 * 回复对话框参数。
 * @since Beta v0.13.0
 */
type ReplyDialogProps = {
  postId: string;
  gid: number;
  target?: TGApp.BBS.Reply.ReplyFull;
  ancestors?: Array<TGApp.BBS.Reply.ReplyFull>;
};

const props = defineProps<ReplyDialogProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{ closed: []; published: [] }>();
const { busy } = useReplyInteraction();
const composer = useTemplateRef<InstanceType<typeof VpReplyComposer>>("composer");
const contextList = useTemplateRef<HTMLOListElement>("contextList");
const titleId = useId();
const title = computed<string>(() =>
  props.target ? "回复 " + props.target.user.nickname : "发表评论",
);
const contextItems = computed<Array<TGApp.BBS.Reply.ReplyFull>>(() => {
  if (!props.target) return [];
  const seen = new Set<string>();
  return [...(props.ancestors ?? []), props.target].filter((item) => {
    const id = item.reply.reply_id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
});
const dialogWidth = computed<string>(() => (contextItems.value.length > 0 ? "800px" : "400px"));

async function focusComposer(): Promise<void> {
  await nextTick();
  if (!visible.value || busy.value) return;
  if (contextItems.value.length > 1) {
    contextList.value?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }
  await composer.value?.focusEditor();
}
</script>
<style lang="scss" scoped>
.vprd-panel {
  display: flex;
  overflow: hidden;
  width: 100%;
  min-height: 0;
  max-height: calc(100dvh - 48px);
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.vprd-top {
  display: flex;
  overflow: hidden;
  width: 400px;
  max-width: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex: 0 1 auto;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px 8px 0 0;
  border-bottom: 0;
  background: var(--box-bg-1);
  color: var(--app-page-content);
}

.vprd-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 12px;
}

.vprd-header h2 {
  overflow: hidden;
  min-width: 0;
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vprd-context {
  display: flex;
  overflow: hidden auto;
  width: 100%;
  min-height: 0;
  max-height: 40dvh;
  box-sizing: border-box;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  overscroll-behavior: contain;
}

.vprd-context :deep(.tpr-user) {
  cursor: default;

  &:hover {
    opacity: 1;
  }
}

.vprd-timeline {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 0;
  margin: 0;
  gap: 20px;
  list-style: none;
}

.vprd-timeline li {
  position: relative;
  min-width: 0;
}

.vprd-timeline li:not(:last-child)::after {
  position: absolute;
  bottom: -20px;
  left: 20px;
  height: 20px;
  border-left: 2px solid var(--common-shadow-2);
  content: "";
}

.vprd-editor {
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex: none;
  padding: 12px 16px 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 0 0 8px 8px;
  background: var(--box-bg-1);
}

.vprd-editor :deep(.vpr-composer) {
  border-top: 0;
}

@media (width <= 480px) {
  .vprd-header,
  .vprd-context,
  .vprd-editor {
    padding: 12px;
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.vprd-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
