/**
 * @file plugins Mys index.ts
 * @description Mys plugin index
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

// Api
import MysApi from "./api";
// Post
import getPostData from "./request/getPostData";
import parsePost from "./utils/parsePost";
// Gacha
import getGachaData from "./request/getGachaData";
import getGachaCard from "./utils/getGachaCard";
// Position
import getPositionData from "./request/getPositionData";
import getPositionCard from "./utils/getPositionCard";
// News
import getNewsList from "./request/getNewsList";
import { getNoticeCard, getActivityCard, getNewsCard } from "./utils/getNewsCard";
// Lottery
import getLotteryData from "./request/getLotteryData";
import getLotteryCard from "./utils/getLotteryCard";
// User
import { getLoginQr, getLoginStatus } from "./request/doGameLogin";

const Mys = {
  Api: MysApi,
  Post: {
    get: getPostData,
    parser: parsePost,
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
