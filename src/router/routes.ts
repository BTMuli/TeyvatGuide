/**
 * @file router routes.ts
 * @description 路由配置
 * @since Beta v0.4.4
 */

import archiveRoutes from "./modules/archive.js";
import mainRoutes from "./modules/main.js";
import subRoutes from "./modules/sub.js";
import userRoutes from "./modules/user.js";
import wikiRoutes from "./modules/wiki.js";

// 合并路由
const routes = [...mainRoutes, ...subRoutes, ...archiveRoutes, ...wikiRoutes, ...userRoutes];

export default routes;
