/**
 * @file plugins/Mys/index.ts
 * @description Mys plugin index
 * @since Beta v0.5.5
 */

import MysApi from "./api/index.js";
import { getCaptcha, doCaptchaLogin } from "./request/doCaptchaLogin.js";
import { getLoginQr, getLoginStatus } from "./request/doGameLogin.js";
import { getCollectionData, getCollectionPosts } from "./request/getCollectionData.js";
import getForumList from "./request/getForumList.js";
import getGachaData from "./request/getGachaData.js";
import getHomeNavigator from "./request/getHomeNavigator.js";
import getLotteryData from "./request/getLotteryData.js";
import getNewsList from "./request/getNewsList.js";
import { getPositionData } from "./request/getPositionData.js";
import getPostData from "./request/getPostData.js";
import { getPostReply, getPostSubRoot, getPostSubReply } from "./request/getPostReply.js";
import { getVoteInfo, getVoteResult } from "./request/getVoteData.js";
import searchPosts from "./request/searchPost.js";
import { getGachaCard } from "./utils/getGachaCard.js";
import getLotteryCard from "./utils/getLotteryCard.js";
import getPositionCard from "./utils/getPositionCard.js";

const Mys = {
  Api: MysApi,
  Post: {
    get: getPostData,
    reply: getPostReply,
    replySubRoot: getPostSubRoot,
    replySub: getPostSubReply,
  },
  Collection: {
    info: getCollectionData,
    data: getCollectionPosts,
  },
  Posts: {
    get: getForumList,
    nav: getHomeNavigator,
    search: searchPosts,
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
    getCaptcha,
    login: doCaptchaLogin,
  },
  Vote: {
    get: getVoteInfo,
    result: getVoteResult,
  },
};

export default Mys;
