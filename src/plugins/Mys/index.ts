/**
 * @file plugins Mys index.ts
 * @description Mys plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// Post
import { getPostData } from "./request/post";
import { PostParser } from "./utils/parser";
// Gacha
import { getGachaData } from "./request/gacha";
import { getGachaCard } from "./utils/gacha";
// News
import { getNoticeList, getActivityList, getNewsList } from "./request/news";
import { getNoticeCard, getActivityCard, getNewsCard } from "./utils/news";

const MysOper = {
	Post: {
		get: getPostData,
		parser: PostParser,
	},
	Gacha: {
		get: getGachaData,
		card: getGachaCard,
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
};

export default MysOper;
