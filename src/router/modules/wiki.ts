/**
 * @file router/modules/wiki.ts
 * @description wiki 路由模块
 * @since Beta v0.3.9
 */

const wikiRoutes = [
  {
    path: "/wiki/abyss",
    name: "深渊数据库",
    component: async () => await import("../../pages/WIKI/Abyss.vue"),
  },
  {
    path: "/wiki/character",
    name: "角色图鉴",
    component: async () => await import("../../pages/WIKI/Character.vue"),
  },
  {
    path: "/wiki/GCG",
    name: "卡牌图鉴",
    component: async () => await import("../../pages/WIKI/GCG.vue"),
  },
  {
    path: "/wiki/namecard",
    name: "名片图鉴",
    component: async () => await import("../../pages/WIKI/Namecard.vue"),
  },
  {
    path: "/wiki/material",
    name: "材料图鉴",
    component: async () => await import("../../pages/WIKI/Material.vue"),
  },
  {
    path: "/wiki/weapon",
    name: "武器图鉴",
    component: async () => await import("../../pages/WIKI/Weapon.vue"),
  },
  {
    path: "/wiki/detail/character/:id",
    name: "角色详情",
    component: async () => await import("../../views/tw-character.vue"),
  },
  {
    path: "/wiki/detail/GCG/:id",
    name: "卡牌详情",
    component: async () => await import("../../views/tw-gcg.vue"),
  },
  {
    path: "/wiki/detail/weapon/:id",
    name: "武器详情",
    component: async () => await import("../../views/tw-weapon.vue"),
  },
];

export default wikiRoutes;
