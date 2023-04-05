/**
 * @file plugins Mys index.ts
 * @description Mys plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

// Post
import { getPostData } from "./request/post";
import { PostParser } from "./utils/parser";
// Gacha
import { getGachaData } from "./request/gacha";
import { getGachaCard } from "./utils/gacha";
// Position
import { getPositionData } from "./request/position";
import { getPositionCard } from "./utils/position";
// News
import { getNoticeList, getActivityList, getNewsList } from "./request/news";
import { getNoticeCard, getActivityCard, getNewsCard } from "./utils/news";
// Lottery
import { getLotteryData } from "./request/lottery";
import { getLotteryCard, getLotteryRewardCard } from "./utils/lottery";
// Calendar
import { getCalendarData } from "./request/calendar";
import { getCalendarCard } from "./utils/calendar";

const MysOper = {
  Post: {
    get: getPostData,
    parser: PostParser,
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
    get: {
      notice: getNoticeList,
      activity: getActivityList,
      news: getNewsList,
    },
    card: {
      notice: getNoticeCard,
      activity: getActivityCard,
      news: getNewsCard,
    },
  },
  Lottery: {
    get: getLotteryData,
    card: {
      lottery: getLotteryCard,
      reward: getLotteryRewardCard,
    },
  },
  Calendar: {
    get: getCalendarData,
    card: getCalendarCard,
  },
};

export default MysOper;
