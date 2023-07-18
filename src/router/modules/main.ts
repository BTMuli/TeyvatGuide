/**
 * @file router modules main.ts
 * @description 主路由模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

const mainRoutes = [
  {
    path: "/",
    name: "首页",
    component: async () => await import("../../pages/Home.vue"),
  },
  {
    path: "/test",
    name: "测试页",
    component: async () => await import("../../pages/Test.vue"),
  },
  {
    path: "/achievements",
    name: "成就",
    component: async () => await import("../../pages/Achievements.vue"),
  },
  {
    path: "/announcements",
    name: "公告",
    component: async () => await import("../../pages/Announcements.vue"),
  },
  {
    path: "/config",
    name: "设置",
    component: async () => await import("../../pages/Config.vue"),
  },
  {
    path: "/home",
    redirect: "/",
  },
];

export default mainRoutes;
