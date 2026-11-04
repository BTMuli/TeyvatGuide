/**
 * 帖子预览渲染上下文。
 * @since Beta v0.13.0
 */

import type { InjectionKey } from "vue";
import { inject, provide } from "vue";

const postPreviewKey: InjectionKey<boolean> = Symbol("post-preview");

/**
 * 将当前组件的后代标记为帖子预览。
 * @since Beta v0.13.0
 */
export function providePostPreview(): void {
  provide(postPreviewKey, true);
}

/**
 * 判断当前组件是否位于帖子预览中。
 * @since Beta v0.13.0
 * @returns 是否采用预览展示
 */
export function usePostPreview(): boolean {
  return inject(postPreviewKey, false);
}
