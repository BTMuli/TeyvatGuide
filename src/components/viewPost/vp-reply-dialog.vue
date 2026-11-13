<!-- 回复上下文与编辑对话框 -->
<template>
  <Teleport to="body">
    <TopOverlay
      v-model="visible"
      :closeDisabled="busy"
      :panelWidth="dialogWidth"
      :showShare="false"
      :titleId="titleId"
      blurVal="10px"
      closeAriaLabel="关闭回复编辑器"
      contentMaxHeight="none"
      panelMaxHeight="calc(100dvh - 48px)"
      :zIndex="dialogZIndex"
      @after-enter="focusComposer"
      @after-leave="emits('closed')"
    >
      <template #header>
        <h2 :id="titleId" :title="title" class="vprd-title">{{ title }}</h2>
      </template>
      <div class="vprd-editor">
        <VpReplyComposer
          v-model:draft="draft"
          ref="composer"
          :gid="props.gid"
          :postId="props.postId"
          :showTarget="false"
          :target="props.target"
          @published="emits('published')"
        >
          <template v-if="contextItems.length" #context>
            <section aria-label="回复上下文" class="vprd-context" role="region">
              <ol ref="contextList" class="vprd-timeline">
                <li v-for="item in contextItems" :key="item.reply.reply_id">
                  <VpReplyItem :modelValue="item" mode="sub" preview />
                </li>
              </ol>
            </section>
          </template>
        </VpReplyComposer>
      </div>
    </TopOverlay>
  </Teleport>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import { useReplyDraft } from "@hooks/useReplyDraft.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, useId, useTemplateRef } from "vue";

import VpReplyComposer from "./vp-reply-composer.vue";
import VpReplyItem from "./vp-reply-item.vue";

/**
 * 回复对话框参数。
 * @since Beta v0.13.0
 */
type ReplyDialogProps = {
  /** 帖子 ID */
  postId: string;
  /** 版块 ID */
  gid: number;
  /** 当前回复目标 */
  target?: TGApp.BBS.Reply.ReplyFull;
  /** 回复目标的上层楼中楼 */
  ancestors?: Array<TGApp.BBS.Reply.ReplyFull>;
};

type ReplyDialogEmits = {
  /** 关闭动画结束 */
  closed: [];
  /** 回复发布成功 */
  published: [];
};

const props = defineProps<ReplyDialogProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<ReplyDialogEmits>();
const { busy } = useReplyInteraction();
const { uid, cookie } = storeToRefs(useUserStore());
const draft = useReplyDraft(
  () => visible.value,
  () => props.target?.reply.reply_id,
  () => [
    props.postId,
    props.gid,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
    cookie.value?.account_id,
    cookie.value?.cookie_token,
  ],
);
/**
 * 浮层 z-index。
 * @remarks 需低于 Vuetify 菜单的全局栈步进：回复列表菜单为 60，其内部菜单从 70 起，
 * 浮层要高于列表但低于工具栏面板，避免表情/提及面板被浮层遮住。
 */
const dialogZIndex = 65;
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
.vprd-title {
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
  max-width: 360px;
  max-height: 40dvh;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  padding: 0;
  margin: 0 auto;
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
}
</style>
