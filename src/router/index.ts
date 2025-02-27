/**
 * @file router index.ts
 * @description 路由入口
 * @since Beta v0.7.0
 */

import { createRouter, createWebHistory } from "vue-router";

import routes from "./routes.js";

const router = createRouter({ history: createWebHistory(), routes: routes });
// 只有在特定页面忽略参数变化
const ignoreRoutes: ReadonlyArray<string> = ["酒馆", "话题"];

// 解决路由重复问题
router.afterEach((to, from) => {
  if (from.name === to.name) {
    if (from.query !== to.query && ignoreRoutes.includes(from.name?.toString() ?? "")) return;
    window.location.reload();
  }
});

export default router;
