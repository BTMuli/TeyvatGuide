/**
 * @file router/modules/archive.ts
 * @description 存档路由模块
 * @since Beta v0.4.4
 */

const archiveRoutes = [
  {
    path: "/archive/birthday",
    name: "留影叙佳期",
    component: async () => await import("../../pages/Archive/Birthday.vue"),
  },
];

export default archiveRoutes;
