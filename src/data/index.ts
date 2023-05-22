/**
 * @file data index
 * @description data index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

// Data
import achievements from "./app/achievements.json";
import achievementSeries from "./app/achievementSeries.json";
import calendar from "./app/calendar.json";
import character from "./app/character.json";
import GCG from "./app/GCG.json";
import material from "./app/material.json";
import nameCards from "./app/namecard.json";
import weapon from "./app/weapon.json";

export const AppAchievementsData = achievements as TGApp.App.Achievement.Item[];
export const AppAchievementSeriesData = achievementSeries as TGApp.App.Achievement.Series[];
export const AppCalendarData = calendar as TGApp.App.Calendar.Item[];
export const AppCharacterData = character as TGApp.App.Character.WikiBriefInfo[];
export const AppGCGData = GCG as TGApp.App.GCG.WikiBriefInfo[];
export const AppMaterialData = material as TGApp.App.Calendar.Material[];
export const AppNameCardsData = nameCards as TGApp.App.NameCard.Item[];
export const AppWeaponData = weapon as TGApp.App.Weapon.WikiBriefInfo[];
