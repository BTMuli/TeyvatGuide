/**
 * 主路由模块
 * @since Beta v0.9.0
 */
import type { RouteRecordRaw } from "vue-router";

const mainRoutes = (<const>[
  {
    path: "/",
    name: "首页",
    component: async () => await import("@/pages/common/PageHome.vue"),
  },
  {
    path: "/announcements",
    name: "公告",
    component: async () => await import("@/pages/common/PageAnno.vue"),
  },
  {
    path: "/news/:gid/:type?",
    name: "咨讯",
    component: async () => await import("@/pages/common/PostNews.vue"),
  },
  {
    path: "/posts/forum/:gid?/:forum?",
    name: "酒馆",
    component: async () => await import("@/pages/common/PostForum.vue"),
  },
  {
    path: "/posts/topic/:gid?/:topic",
    name: "话题",
    component: async () => await import("@/pages/common/PostTopic.vue"),
  },
  {
    path: "/achievements/:app?",
    name: "成就",
    component: async () => await import("@/pages/common/PageAchi.vue"),
  },
  {
    path: "/bag/material",
    name: "背包材料",
    component: async () => await import("@/pages/common/PageBagMaterial.vue"),
  },
  {
    path: "/collection",
    name: "收藏",
    component: async () => await import("@/pages/common/PostCollect.vue"),
  },
  {
    path: "/test",
    name: "测试页",
    component: async () => await import("@/pages/common/PageTest.vue"),
  },
  {
    path: "/config",
    name: "设置",
    component: async () => await import("@/pages/common/PageConfig.vue"),
  },
]) satisfies Array<RouteRecordRaw>;

export default mainRoutes;
