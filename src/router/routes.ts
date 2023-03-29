/**
 * @file router routes.ts
 * @description 路由配置
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// 主路由
import mainRoutes from "./modules/main";
// 子路由
import subRoutes from "./modules/sub";

// 合并路由
const routes = [...mainRoutes, ...subRoutes];

export default routes;
