/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

// Data
import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import calendar from "./calendar.json";
import character from "./character.json";
import GCG from "./GCG.json";
import material from "./material.json";
import nameCards from "./namecard.json";
import weapon from "./weapon.json";

export const AppAchievementsData = achievements as TGApp.App.Achievement.Item[];
export const AppAchievementSeriesData = achievementSeries as TGApp.App.Achievement.Series[];
export const AppCalendarData = calendar as TGApp.App.Calendar.Item[];
export const AppCharacterData = character as TGApp.App.Character.WikiBriefInfo[];
export const AppGCGData = GCG as TGApp.App.GCG.WikiBriefInfo[];
export const AppMaterialData = material as TGApp.App.Calendar.Material[];
export const AppNameCardsData = nameCards as TGApp.App.NameCard.Item[];
export const AppWeaponData = weapon as TGApp.App.Weapon.WikiBriefInfo[];
