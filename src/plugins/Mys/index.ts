/**
 * @file plugins/Mys/index.ts
 * @description Mys plugin index
 * @since Beta v0.6.2
 */

import * as ApiHub from "./request/apiHubReq.js";
import { getCaptcha, doCaptchaLogin } from "./request/doCaptchaLogin.js";
import { getLoginQr, getLoginStatus } from "./request/doGameLogin.js";
import getGachaData from "./request/getGachaData.js";
import { getPositionData } from "./request/getPositionData.js";
import * as Painter from "./request/painterReq.js";
import * as Post from "./request/postReq.js";
import { getGachaCard } from "./utils/getGachaCard.js";
import getLotteryCard from "./utils/getLotteryCard.js";
import getPositionCard from "./utils/getPositionCard.js";

const Mys = {
  Post,
  Painter,
  ApiHub,
  Gacha: {
    get: getGachaData,
    card: getGachaCard,
  },
  Position: {
    get: getPositionData,
    card: getPositionCard,
  },
  Lottery: {
    get: Painter.lotteryUserShow,
    card: getLotteryCard,
  },
  User: {
    getQr: getLoginQr,
    getData: getLoginStatus,
    getCaptcha,
    login: doCaptchaLogin,
  },
};

export default Mys;
