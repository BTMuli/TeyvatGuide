/**
 * 主路由模块
 * @since Beta v0.13.1
 */
import { platform } from "@tauri-apps/plugin-os";
import type { RouteRecordRaw } from "vue-router";

import { createCommunityProfileChildren } from "./communityProfile.js";

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
    name: "资讯",
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
    path: "/posts/new/:gid?/:viewType?",
    name: "新建帖子",
    component: async () => await import("@/pages/common/PostNew.vue"),
  },
  {
    path: "/community/profile",
    redirect: { name: "个人信息" },
    component: async () => await import("@/pages/common/ComiProf.vue"),
    meta: { communityProfile: true },
    children: createCommunityProfileChildren({ parentName: "个人信息" }),
  },
  {
    path: "/community/profile/:uid(\\d+)",
    redirect: { name: "用户信息" },
    component: async () => await import("@/pages/common/ComiProf.vue"),
    meta: { communityProfile: true },
    children: createCommunityProfileChildren({ parentName: "用户信息" }),
  },
  {
    path: "/community/profile/posts/:postId/edit",
    name: "编辑帖子",
    component: async () => await import("@/pages/common/PostEdit.vue"),
  },
  {
    path: "/community/shop",
    name: "米社商店",
    component: async () => await import("@/pages/common/ComiShop.vue"),
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
    path: "/bag/weapon",
    name: "背包武器",
    component: async () => await import("@/pages/common/PageBagWeapon.vue"),
  },
  {
    path: "/bag/relic",
    name: "背包圣遗物",
    component: async () => await import("@/pages/common/PageBagRelic.vue"),
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
  {
    path: "/game",
    name: "游戏安装",
    component: async () => await import("@/pages/common/PageGame.vue"),
    beforeEnter() {
      if (platform() !== "windows") return { path: "/" };
    },
  },
]) satisfies Array<RouteRecordRaw>;

export default mainRoutes;
