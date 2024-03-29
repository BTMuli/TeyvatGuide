/**
 * @file router routes.ts
 * @description 路由配置
 * @since Beta v0.4.4
 */

import archiveRoutes from "./modules/archive";
import mainRoutes from "./modules/main";
import subRoutes from "./modules/sub";
import userRoutes from "./modules/user";
import wikiRoutes from "./modules/wiki";

// 合并路由
const routes = [...mainRoutes, ...subRoutes, ...archiveRoutes, ...wikiRoutes, ...userRoutes];

export default routes;
