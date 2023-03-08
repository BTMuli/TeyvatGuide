/**
 * @file plugins Paimon.moe Interface Achievement
 * @description plugins Paimon.moe Interface Achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @see https://github.com/MadeBaruna/paimon-moe/blob/main/src/data/achievement/zh.json
 * @version v3.5
 */

/**
 * @description Paimon.moe Achievement json data interface
 * @interface AchievementJson
 * @example [key: string]: { AchievementSeries }
 * @return {AchievementJson}
 */
export interface AchievementJson {
	[key: string]: AchievementSeries;
}

/**
 * @description Paimon.moe Achievement series
 * @interface AchievementSeries
 * @property {string} name - Achievement series name
 * @property {(Achievement|Achievement[])[]} achievements - Achievement list
 * @property {number} order - Achievement series order
 * @return {AchievementSeries}
 */
export interface AchievementSeries {
	name: string;
	achievements: (Achievement | Achievement[])[];
	order: number;
}

/**
 * @description Paimon.moe Achievement
 * @interface Achievement
 * @property {number} id - Achievement id
 * @property {string} name - Achievement name
 * @property {string} desc - Achievement description
 * @property {number} reward - Achievement reward
 * @property {string} ver - Achievement version
 * @return {Achievement}
 */
interface Achievement {
	id: number;
	name: string;
	desc: string;
	reward: number;
	ver: string;
}
