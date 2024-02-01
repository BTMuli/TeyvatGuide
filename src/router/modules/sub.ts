/**
 * @file router/modules/sub.ts
 * @description 子路由模块，用于二级窗口
 * @since Beta v0.4.3
 */

const subRoutes = [
  {
    // 传入参数：公告ID-anno_id，服务器-region，语言-lang
    path: "/anno_detail/:region/:anno_id/:lang",
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
