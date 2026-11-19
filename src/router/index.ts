/**
 * 路由入口
 * @since Beta v0.13.2
 */

import { isCommunityProfileRoute } from "@utils/community/profileRoute.js";
import { createRouter, createWebHistory } from "vue-router";

import routes from "./routes.js";

const router = createRouter({ history: createWebHistory(), routes: routes });
const reactiveRouteNames: ReadonlyArray<string> = ["酒馆", "话题", "版块榜单", "资讯"];
// 只有在特定页面忽略参数变化
const ignoreRoutes: ReadonlyArray<string> = [
  "新建帖子",
  "编辑帖子",
  "实用脚本",
  "角色图鉴",
  "武器图鉴",
  "圣遗物图鉴",
];

router.afterEach((to, from) => {
  if (from.name !== to.name) return;
  const routeName = to.name?.toString() ?? "";
  if (
    reactiveRouteNames.includes(routeName) ||
    isCommunityProfileRoute(to) ||
    isCommunityProfileRoute(from)
  )
    return;
  if (from.query !== to.query && ignoreRoutes.includes(routeName)) return;
  window.location.reload();
});

export default router;
