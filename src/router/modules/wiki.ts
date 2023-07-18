/**
 * @file router modules wiki.ts
 * @description wiki 路由模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.2
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
    path: "/wiki/weapon",
    name: "武器图鉴",
    component: async () => await import("../../pages/WIKI/Weapon.vue"),
  },
  {
    path: "/wiki/detail/character/:id",
    name: "角色详情",
    component: async () => await import("../../views/WIKI/t-character.vue"),
  },
  {
    path: "/wiki/detail/GCG/:id",
    name: "卡牌详情",
    component: async () => await import("../../views/WIKI/t-gcg.vue"),
  },
  {
    path: "/wiki/detail/weapon/:id",
    name: "武器详情",
    component: async () => await import("../../views/WIKI/t-weapon.vue"),
  },
];

export default wikiRoutes;
