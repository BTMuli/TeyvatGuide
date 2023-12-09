/**
 * @file plugins/Mys/api/index.ts
 * @description Mys API
 * @since Beta v0.3.7
 */

const MysApi = {
  Obc: "https://bbs.mihoyo.com/ys/obc/content/{contentId}/detail?bbs_presentation_style=no_header",
  Gacha: "https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc",
  Lottery: "https://bbs-api.miyoushe.com/painter/wapi/lottery/user/show?id={lotteryId}",
  News: "https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids={gid}&page_size={pageSize}&type={newsType}&last_id={lastId}",
  Forum:
    "https://bbs-api.miyoushe.com/post/wapi/getForumPostList?forum_id={forum}&gids={gid}&sort_type={type}&page_size=20",
  Feed: "https://bbs-api.miyoushe.com/post/api/feeds/posts?gids={gid}",
  Navigator: "https://bbs-api.miyoushe.com/apihub/api/home/new?gids={gid}",
  Position: "https://api-static.mihoyo.com/common/blackboard/ys_obc/v1/home/position?app_sn=ys_obc",
  Post: {
    Api: "https://bbs-api.mihoyo.com/post/wapi/getPostFull?post_id={postId}",
    Referer: "https://bbs.mihoyo.com/",
  },
};

export default MysApi;
