/**
 * @file router index.ts
 * @description 路由入口
 * @since Beta v0.3.3
 */

import { createRouter, createWebHistory } from "vue-router";

import routes from "./routes.js";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 解决路由重复问题
router.afterEach((to, from) => {
  if (from.name === to.name && from.fullPath !== to.fullPath) {
    console.log("路由重复");
    window.location.reload();
  }
});

export default router;
