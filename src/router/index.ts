/**
 * @file router index.ts
 * @description 路由入口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";

const router = createRouter({
	history: createWebHistory(),
	routes: routes,
});

export default router;
