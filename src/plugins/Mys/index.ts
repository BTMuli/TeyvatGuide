/**
 * @file plugins/Mys/index.ts
 * @description Mys plugin index
 * @since Beta v0.4.5
 */

import MysApi from "./api";
import { getLoginQr, getLoginStatus } from "./request/doGameLogin";
import { getCollectionData, getCollectionPosts } from "./request/getCollectionData";
import getForumList from "./request/getForumList";
import getGachaData from "./request/getGachaData";
import getHomeNavigator from "./request/getHomeNavigator";
import getLotteryData from "./request/getLotteryData";
import getNewsList from "./request/getNewsList";
import { getPositionData } from "./request/getPositionData";
import getPostData from "./request/getPostData";
import { getVoteInfo, getVoteResult } from "./request/getVoteData";
import { getGachaCard } from "./utils/getGachaCard";
import getLotteryCard from "./utils/getLotteryCard";
import getPositionCard from "./utils/getPositionCard";

const Mys = {
  Api: MysApi,
  Post: {
    get: getPostData,
  },
  Collection: {
    info: getCollectionData,
    data: getCollectionPosts,
  },
  Posts: {
    get: getForumList,
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
  News: getNewsList,
  Lottery: {
    get: getLotteryData,
    card: getLotteryCard,
  },
  User: {
    getQr: getLoginQr,
    getData: getLoginStatus,
  },
  Vote: {
    get: getVoteInfo,
    result: getVoteResult,
  },
};

export default Mys;
