/**
 * @file src/data/index.ts
 * @description 数据文件入口
 * @since Beta v0.4.2
 */

import achievements from "./app/achievements.json";
import achievementSeries from "./app/achievementSeries.json";
import calendar from "./app/calendar.json";
import character from "./app/character.json";
import GCG from "./app/GCG.json";
import nameCards from "./app/namecard.json";
import weapon from "./app/weapon.json";
import wikiCharacter from "./WIKI/character.json";
import wikiMaterial from "./WIKI/material.json";
import wikiWeapon from "./WIKI/weapon.json";

export const AppAchievementsData: TGApp.App.Achievement.Item[] = achievements;
export const AppAchievementSeriesData: TGApp.App.Achievement.Series[] = achievementSeries;
export const AppCalendarData: TGApp.App.Calendar.Item[] = calendar;
export const AppCharacterData: TGApp.App.Character.WikiBriefInfo[] = character;
export const AppGCGData: TGApp.App.GCG.WikiBriefInfo[] = GCG;
export const AppNameCardsData: TGApp.App.NameCard.Item[] = nameCards;
export const AppWeaponData: TGApp.App.Weapon.WikiBriefInfo[] = weapon;
export const WikiCharacterData: TGApp.App.Character.WikiItem[] = wikiCharacter;
export const WikiWeaponData: TGApp.App.Weapon.WikiItem[] = wikiWeapon;
export const WikiMaterialData: TGApp.App.Material.WikiItem[] = wikiMaterial;
