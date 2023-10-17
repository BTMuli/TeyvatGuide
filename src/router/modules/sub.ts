/**
 * @file router modules sub.ts
 * @description 子路由模块，用于二级窗口
 * @since Beta v0.3.3
 */

const subRoutes = [
  {
    path: "/anno_detail/:anno_id",
    name: "游戏内公告",
    component: async () => await import("../../views/t-anno.vue"),
  },
  {
    path: "/anno_detail_json/:anno_id",
    name: "游戏内公告（JSON）",
    component: async () => await import("../../views/t-anno-json.vue"),
  },
  {
    path: "/post_detail/:post_id",
    name: "帖子详情",
    component: async () => await import("../../views/t-post.vue"),
  },
  {
    path: "/post_detail_json/:post_id",
    name: "帖子详情（JSON）",
    component: async () => await import("../../views/t-post-json.vue"),
  },
  {
    path: "/lottery/:lottery_id",
    name: "抽奖详情",
    component: async () => await import("../../views/t-lottery.vue"),
  },
];

export default subRoutes;
