/**
 * 存档路由模块
 * @since Beta v0.4.5
 */

import type { RouteRecordRaw } from "vue-router";

const archiveRoutes = (<const>[
  {
    path: "/archive/birthday/:date?",
    name: "留影叙佳期",
    component: async () => await import("@/pages/Archive/Birthday.vue"),
  },
]) satisfies Array<RouteRecordRaw>;

export default archiveRoutes;
