/**
 * 路由配置
 * @since Beta v0.8.6
 */

import { RouteRecordRaw } from "vue-router";

import archiveRoutes from "./modules/archive.js";
import mainRoutes from "./modules/main.js";
import subRoutes from "./modules/sub.js";
import userRoutes from "./modules/user.js";
import wikiRoutes from "./modules/wiki.js";

const routes = (<const>[
  ...mainRoutes,
  ...subRoutes,
  ...archiveRoutes,
  ...wikiRoutes,
  ...userRoutes,
  { path: "/:pathMatch(.*)*", redirect: "/" },
]) satisfies Array<RouteRecordRaw>;

export default routes;
