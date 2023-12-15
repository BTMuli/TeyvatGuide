/**
 * @file src/data/index.ts
 * @description 数据文件入口
 * @since Beta v0.3.8
 */

import achievements from "./app/achievements.json";
import achievementSeries from "./app/achievementSeries.json";
import calendar from "./app/calendar.json";
import character from "./app/character.json";
import GCG from "./app/GCG.json";
import nameCards from "./app/namecard.json";
import weapon from "./app/weapon.json";

export const AppAchievementsData: TGApp.App.Achievement.Item[] = achievements;
export const AppAchievementSeriesData: TGApp.App.Achievement.Series[] = achievementSeries;
export const AppCalendarData: TGApp.App.Calendar.Item[] = calendar;
export const AppCharacterData: TGApp.App.Character.WikiBriefInfo[] = character;
export const AppGCGData: TGApp.App.GCG.WikiBriefInfo[] = GCG;
export const AppNameCardsData: TGApp.App.NameCard.Item[] = nameCards;
export const AppWeaponData: TGApp.App.Weapon.WikiBriefInfo[] = weapon;

const wikiFiles = import.meta.glob("./wiki/**/*.json");

/**
 * @description 动态读取wiki文件
 * @since Beta v0.3.8
 * @param {string} dir 目录
 * @param {string} name 文件名
 * @returns {Promise<any>} 文件内容
 */
export async function getWikiData(
  dir: "Character",
  name: string,
): Promise<{ default: TGApp.App.Character.WikiItem } | undefined>;
export async function getWikiData(dir: string, name: string): Promise<any> {
  return await wikiFiles[`./wiki/${dir}/${name}.json`]();
}
