/**
 * @file plugins Mys api index.ts
 * @description Mys API
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

const MysApi = {
  Obc: "https://bbs.mihoyo.com/ys/obc/content/{contentId}/detail?bbs_presentation_style=no_header",
  Gacha: "https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc",
  Lottery: "https://bbs-api.miyoushe.com/painter/wapi/lottery/user/show?id={lotteryId}",
  News: "https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids={gid}&page_size={pageSize}&type={newsType}&last_id={lastId}",
  Position: "https://api-static.mihoyo.com/common/blackboard/ys_obc/v1/home/position?app_sn=ys_obc",
  Post: {
    Api: "https://bbs-api.mihoyo.com/post/wapi/getPostFull?post_id={postId}",
    Referer: "https://bbs.mihoyo.com/",
  },
};

export default MysApi;
