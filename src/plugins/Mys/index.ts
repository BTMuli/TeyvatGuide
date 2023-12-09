/**
 * @file plugins/Mys/index.ts
 * @description Mys plugin index
 * @since Beta v0.3.7
 */

import MysApi from "./api";
import { getLoginQr, getLoginStatus } from "./request/doGameLogin";
import getForumList from "./request/getForumList";
import getGachaData from "./request/getGachaData";
import getHomeNavigator from "./request/getHomeNavigator";
import getLotteryData from "./request/getLotteryData";
import getNewsList from "./request/getNewsList";
import getPositionData from "./request/getPositionData";
import getPostData from "./request/getPostData";
import getGachaCard from "./utils/getGachaCard";
import getLotteryCard from "./utils/getLotteryCard";
import { getActivityCard, getNewsCard, getNoticeCard } from "./utils/getNewsCard";
import getPositionCard from "./utils/getPositionCard";
import { getPostsCard } from "./utils/getPostsCard";

const Mys = {
  Api: MysApi,
  Post: {
    get: getPostData,
  },
  Posts: {
    get: getForumList,
    card: getPostsCard,
    nav: getHomeNavigator,
  },
  Gacha: {
    get: getGachaData,
    card: getGachaCard,
  },
  Position: {
    get: getPositionData,
    card: getPositionCard,
  },
  News: {
    get: getNewsList,
    card: {
      notice: getNoticeCard,
      activity: getActivityCard,
      news: getNewsCard,
    },
  },
  Lottery: {
    get: getLotteryData,
    card: getLotteryCard,
  },
  User: {
    getQr: getLoginQr,
    getData: getLoginStatus,
  },
};

export default Mys;
