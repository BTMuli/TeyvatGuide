/**
 * @file src/data/index.ts
 * @description 数据文件入口
 * @since Beta v0.5.3
 */

import type { Schema } from "ajv";

import achievements from "./app/achievements.json" assert { type: "json" };
import achievementSeries from "./app/achievementSeries.json" assert { type: "json" };
import calendar from "./app/calendar.json" assert { type: "json" };
import character from "./app/character.json" assert { type: "json" };
import gacha from "./app/gacha.json" assert { type: "json" };
import nameCards from "./app/namecard.json" assert { type: "json" };
import weapon from "./app/weapon.json" assert { type: "json" };
import arcBirCalendar from "./archive/birth_calendar.json" assert { type: "json" };
import arcBirDraw from "./archive/birth_draw.json" assert { type: "json" };
import arcBirRole from "./archive/birth_role.json" assert { type: "json" };
import schemaUiaf from "./schema/uiaf-schema.json" assert { type: "json" };
import schemaUigf from "./schema/uigf-schema.json" assert { type: "json" };
import schemaUigf4 from "./schema/uigf4-schema.json" assert { type: "json" };
import wikiCharacter from "./WIKI/character.json" assert { type: "json" };
import wikiMaterial from "./WIKI/material.json" assert { type: "json" };
import wikiWeapon from "./WIKI/weapon.json" assert { type: "json" };

// App
export const AppAchievementsData: TGApp.App.Achievement.Item[] = achievements;
export const AppAchievementSeriesData: TGApp.App.Achievement.Series[] = achievementSeries;
export const AppCalendarData: TGApp.App.Calendar.Item[] = calendar;
export const AppCharacterData: TGApp.App.Character.WikiBriefInfo[] = character;
export const AppGachaData: TGApp.App.Gacha.PoolItem[] = gacha;
export const AppNameCardsData: TGApp.App.NameCard.Item[] = nameCards;
export const AppWeaponData: TGApp.App.Weapon.WikiBriefInfo[] = weapon;
// Schema
export const UiafSchema: Schema = schemaUiaf;
export const UigfSchema: Schema = schemaUigf;
export const Uigf4Schema: Schema = schemaUigf4;
// Archive
export const ArcBirCalendar: TGApp.Archive.Birth.CalendarData = arcBirCalendar;
export const ArcBirDraw: TGApp.Archive.Birth.DrawItem[] = arcBirDraw;
export const ArcBirRole: TGApp.Archive.Birth.RoleItem[] = arcBirRole;
// Wiki
export const WikiCharacterData: TGApp.App.Character.WikiItem[] = wikiCharacter;
export const WikiWeaponData: TGApp.App.Weapon.WikiItem[] = wikiWeapon;
export const WikiMaterialData: TGApp.App.Material.WikiItem[] = wikiMaterial;
