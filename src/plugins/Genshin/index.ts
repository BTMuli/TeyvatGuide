/**
 * @file plugins Genshin index.ts
 * @description Genshin plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

// Announcement
import { getAnnouncementList, getAnnouncementContent } from "./request/announcements";
import { getAnnoCards } from "./utils/announcements";

const GenshinOper = {
	Announcement: {
		get: {
			list: getAnnouncementList,
			content: getAnnouncementContent,
		},
		card: getAnnoCards,
	},
};

export default GenshinOper;
