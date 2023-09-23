/**
 * @file router index.ts
 * @description 路由入口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.2
 */

import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 解决路由重复问题
router.afterEach((to, from) => {
  if (from.name === to.name) {
    console.log("路由重复");
    window.location.reload();
  }
});

export default router;
