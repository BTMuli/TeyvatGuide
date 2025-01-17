/**
 * @file router index.ts
 * @description 路由入口
 * @since Beta v0.6.8
 */

import { createRouter, createWebHistory } from "vue-router";

import routes from "./routes.js";

const router = createRouter({ history: createWebHistory(), routes: routes });

// 解决路由重复问题
router.afterEach((to, from) => {
  if (from.name === to.name) {
    if (from.query !== to.query) return;
    window.location.reload();
  }
});

export default router;
