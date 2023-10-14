/**
 * @file router modules sub.ts
 * @description 子路由模块，用于二级窗口
 * @since Beta v0.3.3
 */

import TAnnoJson from "../../views/t-anno-json.vue";
import TAnno from "../../views/t-anno.vue";
import TLottery from "../../views/t-lottery.vue";
import TPostJson from "../../views/t-post-json.vue";
import TPost from "../../views/t-post.vue";

const subRoutes = [
  {
    path: "/anno_detail/:anno_id",
    name: "游戏内公告",
    component: TAnno,
  },
  {
    path: "/anno_detail_json/:anno_id",
    name: "游戏内公告（JSON）",
    component: TAnnoJson,
  },
  {
    path: "/post_detail/:post_id",
    name: "帖子详情",
    component: TPost,
  },
  {
    path: "/post_detail_json/:post_id",
    name: "帖子详情（JSON）",
    component: TPostJson,
  },
  {
    path: "/lottery/:lottery_id",
    name: "抽奖详情",
    component: TLottery,
  },
];

export default subRoutes;
