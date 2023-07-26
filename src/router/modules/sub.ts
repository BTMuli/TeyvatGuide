/**
 * @file router modules sub.ts
 * @description 子路由模块，用于二级窗口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
// 游戏内公告
import TAnno from "../../views/t-anno.vue";
import TAnnoJson from "../../views/t-anno-json.vue";
// 咨讯
import TNews from "../../views/t-news.vue";
// 帖子相关
import TPost from "../../views/t-post.vue";
import TPostJson from "../../views/t-post-json.vue";
// 抽奖
import TLottery from "../../views/t-lottery.vue";

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
    path: "/news/:gid",
    name: "咨讯",
    component: TNews,
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
