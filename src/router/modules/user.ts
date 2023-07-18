/**
 * @file router modules user.ts
 * @description user 路由模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

const userRoutes = [
  {
    path: "/user/abyss",
    name: "深渊记录",
    component: async () => await import("../../pages/User/Abyss.vue"),
  },
  {
    path: "/user/characters",
    name: "我的角色",
    component: async () => await import("../../pages/User/Characters.vue"),
  },
  {
    path: "/user/gacha",
    name: "祈愿记录",
    component: async () => await import("../../pages/User/Gacha.vue"),
  },
  {
    path: "/user/record",
    name: "原神战绩",
    component: async () => await import("../../pages/User/Record.vue"),
  },
];

export default userRoutes;
