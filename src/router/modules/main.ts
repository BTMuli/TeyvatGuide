/**
 * @file router/modules/main.ts
 * @description 主路由模块
 * @since Beta v0.3.7
 */

const mainRoutes = [
  {
    path: "/",
    name: "首页",
    component: async () => await import("../../pages/common/Home.vue"),
  },
  {
    path: "/announcements",
    name: "公告",
    component: async () => await import("../../pages/common/Announcements.vue"),
  },
  {
    path: "/news/:gid",
    name: "咨讯",
    component: async () => await import("../../pages/common/News.vue"),
  },
  {
    path: "/posts",
    name: "酒馆",
    component: async () => await import("../../pages/common/Posts.vue"),
  },
  {
    path: "/achievements/:app?",
    name: "成就",
    component: async () => await import("../../pages/common/Achievements.vue"),
  },
  {
    path: "/test",
    name: "测试页",
    component: async () => await import("../../pages/common/Test.vue"),
  },
  {
    path: "/config",
    name: "设置",
    component: async () => await import("../../pages/common/Config.vue"),
  },
];

export default mainRoutes;
