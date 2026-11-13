/**
 * 社区个人中心路由工具。
 * @since Beta v0.13.1
 */

import type { LocationQueryRaw, RouteLocationNormalized, RouteLocationRaw } from "vue-router";

/**
 * 构造个人中心子路由。
 * @since Beta v0.13.1
 * @param section - 目标栏目
 * @param profileUid - 目标用户 UID，缺省时使用当前用户主页
 * @param query - 需要保留的查询参数
 * @returns 个人中心路由
 */
function getCommunityProfileRoute(
  section: TGApp.BBS.Profile.Section,
  profileUid?: string,
  query?: LocationQueryRaw,
): RouteLocationRaw {
  const normalizedUid = profileUid?.trim();
  const queryParams = { ...(query ?? {}) };
  const profileName = normalizedUid === undefined || normalizedUid === "" ? "个人信息" : "用户信息";
  const routeName = section === "posts" ? profileName : `${profileName}-${section}`;
  if (normalizedUid === undefined || normalizedUid === "") {
    return Object.keys(queryParams).length === 0
      ? { name: routeName }
      : { name: routeName, query: queryParams };
  }
  return Object.keys(queryParams).length === 0
    ? { name: routeName, params: { uid: normalizedUid } }
    : { name: routeName, params: { uid: normalizedUid }, query: queryParams };
}

/**
 * 判断路由是否属于个人中心路由树。
 * @since Beta v0.13.1
 * @param route - 待判断的路由
 * @returns 是否属于个人中心
 */
function isCommunityProfileRoute(route: Pick<RouteLocationNormalized, "matched">): boolean {
  return route.matched.some((record) => record.meta.communityProfile === true);
}

export { getCommunityProfileRoute, isCommunityProfileRoute };
