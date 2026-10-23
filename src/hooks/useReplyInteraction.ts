/**
 * 回复交互锁。
 * @since Beta v0.13.0
 */

import { inject, ref } from "vue";
import type { InjectionKey } from "vue";

/**
 * 回复交互状态的注入键。
 * @since Beta v0.13.0
 */
export const replyInteractionKey: InjectionKey<TGApp.BBS.Reply.Interaction> =
  Symbol("replyInteraction");

/**
 * 创建一组共享回复交互状态。
 * @since Beta v0.13.0
 * @returns 回复交互状态与执行入口
 */
export function createReplyInteraction(): TGApp.BBS.Reply.Interaction {
  const busy = ref<boolean>(false);

  /**
   * 在共享锁内执行回复操作。
   * @since Beta v0.13.0
   * @param action - 需要独占执行的异步操作
   * @returns 是否取得并完成执行权
   */
  async function run(action: () => Promise<void>): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true;
    try {
      await action();
      return true;
    } finally {
      busy.value = false;
    }
  }

  return { busy, run };
}

/**
 * 使用父级提供的共享回复交互状态。
 * @since Beta v0.13.0
 * @returns 回复交互状态与执行入口
 * 未找到父级回复交互提供者时抛出内部错误。
 */
export function useReplyInteraction(): TGApp.BBS.Reply.Interaction {
  const interaction = inject(replyInteractionKey);
  if (interaction === undefined) {
    throw new Error("[ReplyInteraction] 未找到回复交互提供者，请确认组件位于 VpBtnReply 下");
  }
  return interaction;
}
