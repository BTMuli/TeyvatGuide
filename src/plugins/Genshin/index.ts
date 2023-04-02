/**
 * @file plugins Genshin index.ts
 * @description Genshin plugin index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

// Announcement
import { getAnnouncementList, getAnnouncementContent } from "./request/announcements";
import { getAnnoCards } from "./utils/announcements";
import { parseAnnoContent } from "./utils/annoParser";

const GenshinOper = {
	Announcement: {
		getList: getAnnouncementList,
		getContent: getAnnouncementContent,
		card: getAnnoCards,
		parser: parseAnnoContent,
	},
};

export default GenshinOper;
