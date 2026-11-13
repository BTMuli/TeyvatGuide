/**
 * 社区个人中心布局与路由面板的共享上下文。
 * @since Beta v0.13.1
 */

import { inject, provide } from "vue";
import type { InjectionKey } from "vue";

const communityProfileKey: InjectionKey<TGApp.BBS.Profile.Context> = Symbol("community-profile");

/**
 * 提供当前个人中心布局的共享资料与操作。
 * @since Beta v0.13.1
 * @param context - 布局上下文
 */
export function provideCommunityProfile(context: TGApp.BBS.Profile.Context): void {
  provide(communityProfileKey, context);
}

/**
 * 获取所属个人中心布局的共享上下文。
 * @since Beta v0.13.1
 * @returns 当前布局上下文
 */
export function useCommunityProfile(): TGApp.BBS.Profile.Context {
  const context = inject(communityProfileKey);
  if (context === undefined) throw new Error("个人中心面板必须在个人中心布局中使用");
  return context;
}
