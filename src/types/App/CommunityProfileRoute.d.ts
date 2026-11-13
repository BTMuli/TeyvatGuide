/**
 * 社区个人中心路由元数据。
 * @since Beta v0.13.1
 */

import "vue-router";

declare module "vue-router" {
  /**
   * 社区个人中心路由元数据。
   * @since Beta v0.13.1
   */
  // Module augmentation must use interface merging for Vue Router's RouteMeta.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Vue Router requires interface merging.
  interface RouteMeta {
    /** 是否属于社区个人中心路由树 */
    communityProfile?: boolean;
    /** 个人中心栏目 */
    profileSection?: TGApp.BBS.Profile.Section;
    /** 是否仅允许本人访问 */
    profileOwnOnly?: boolean;
  }
}
