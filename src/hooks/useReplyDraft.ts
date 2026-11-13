/**
 * 当前页面内最近一次回复目标的草稿状态。
 * @since Beta v0.13.1
 */

import { ref, watch } from "vue";
import type { Ref } from "vue";

/**
 * 创建空回复草稿。
 * @since Beta v0.13.1
 * @returns 不与其他编辑器共享的空草稿
 */
export function createReplyDraft(): TGApp.BBS.Reply.Draft {
  return { content: "", mentions: [], images: [] };
}

/**
 * 仅在连续打开同一回复目标时保留内存草稿。
 * @since Beta v0.13.1
 * @param isOpen - 回复浮层是否打开
 * @param targetId - 回复目标 ID，普通评论为 undefined
 * @param context - 帖子、分区和账号凭据等草稿隔离上下文
 * @returns 由浮层外持有、供编辑器双向绑定的草稿
 */
export function useReplyDraft(
  isOpen: () => boolean,
  targetId: () => string | undefined,
  context: () => ReadonlyArray<string | number | undefined>,
): Ref<TGApp.BBS.Reply.Draft> {
  const draft = ref<TGApp.BBS.Reply.Draft>(createReplyDraft());
  let previousTargetId: string | undefined;

  watch(
    [isOpen, targetId],
    ([open, target]) => {
      if (!open) return;
      if (target !== previousTargetId) draft.value = createReplyDraft();
      previousTargetId = target;
    },
    { immediate: true },
  );

  watch(
    context,
    () => {
      draft.value = createReplyDraft();
      previousTargetId = targetId();
    },
    { flush: "sync" },
  );

  return draft;
}
