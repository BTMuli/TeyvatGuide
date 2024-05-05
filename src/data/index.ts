/**
 * @file src/data/index.ts
 * @description 数据文件入口
 * @since Beta v0.4.7
 */

import type { SchemaType } from "ajv/lib/types/index.js";

// 应用数据
import achievements from "./app/achievements.json";
import achievementSeries from "./app/achievementSeries.json";
import calendar from "./app/calendar.json";
import character from "./app/character.json";
import gacha from "./app/gacha.json";
import GCG from "./app/GCG.json";
import nameCards from "./app/namecard.json";
import uigfSchema from "./app/uigf-schema.json";
import weapon from "./app/weapon.json";
// 存档数据
import arcBirCalendar from "./archive/birth_calendar.json";
import arcBirDraw from "./archive/birth_draw.json";
import arcBirRole from "./archive/birth_role.json";
// Wiki 数据
import wikiCharacter from "./WIKI/character.json";
import wikiMaterial from "./WIKI/material.json";
import wikiWeapon from "./WIKI/weapon.json";

export const AppAchievementsData: TGApp.App.Achievement.Item[] = achievements;
export const AppAchievementSeriesData: TGApp.App.Achievement.Series[] = achievementSeries;
export const AppCalendarData: TGApp.App.Calendar.Item[] = calendar;
export const AppCharacterData: TGApp.App.Character.WikiBriefInfo[] = character;
export const AppGachaData: TGApp.App.Gacha.PoolItem[] = gacha;
export const AppGCGData: TGApp.App.GCG.WikiBriefInfo[] = GCG;
export const AppNameCardsData: TGApp.App.NameCard.Item[] = nameCards;
export const AppWeaponData: TGApp.App.Weapon.WikiBriefInfo[] = weapon;
export const AppUigfSchema: SchemaType = uigfSchema;
export const ArcBirCalendar: TGApp.Archive.Birth.CalendarData = arcBirCalendar;
export const ArcBirDraw: TGApp.Archive.Birth.DrawItem[] = arcBirDraw;
export const ArcBirRole: TGApp.Archive.Birth.RoleItem[] = arcBirRole;
export const WikiCharacterData: TGApp.App.Character.WikiItem[] = wikiCharacter;
export const WikiWeaponData: TGApp.App.Weapon.WikiItem[] = wikiWeapon;
export const WikiMaterialData: TGApp.App.Material.WikiItem[] = wikiMaterial;
