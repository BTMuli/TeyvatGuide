/**
 * @file router routes.ts
 * @description 路由配置
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// 主路由
import mainRoutes from "./modules/main";
// 子路由
import subRoutes from "./modules/sub";
// Wiki 路由
import wikiRoutes from "./modules/wiki";
// user 路由
import userRoutes from "./modules/user";

// 合并路由
const routes = [
  ...mainRoutes,
  ...subRoutes,
  ...wikiRoutes,
  ...userRoutes,
];

export default routes;
