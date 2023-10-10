/**
 * @file router routes.ts
 * @description 路由配置
 * @since Alpha v0.2.0
 */

import mainRoutes from "./modules/main";
import subRoutes from "./modules/sub";
import userRoutes from "./modules/user";
import wikiRoutes from "./modules/wiki";

// 合并路由
const routes = [...mainRoutes, ...subRoutes, ...wikiRoutes, ...userRoutes];

export default routes;
