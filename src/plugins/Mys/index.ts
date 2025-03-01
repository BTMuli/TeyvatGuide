/**
 * @file plugins/Mys/index.ts
 * @description Mys plugin index
 * @since Beta v0.7.1
 */

import { doCaptchaLogin, getCaptcha } from "./request/doCaptchaLogin.js";
import { getGachaData, getPositionData } from "./request/obcReq.js";
import { getGachaCard } from "./utils/getGachaCard.js";
import getPositionCard from "./utils/getPositionCard.js";

const Mys = {
  Gacha: { get: getGachaData, card: getGachaCard },
  Position: { get: getPositionData, card: getPositionCard },
  User: { getCaptcha, login: doCaptchaLogin },
};

export default Mys;
