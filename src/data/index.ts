/**
 * 数据文件入口
 * @since Beta v0.9.2
 */

import type { Schema } from "ajv";

import achievements from "./app/achievements.json" with { type: "json" };
import achievementSeries from "./app/achievementSeries.json" with { type: "json" };
import calendar from "./app/calendar.json" with { type: "json" };
import character from "./app/character.json" with { type: "json" };
import gacha from "./app/gacha.json" with { type: "json" };
import gachaB from "./app/gachaB.json" with { type: "json" };
import hyperlink from "./app/hyperlink.json" with { type: "json" };
import nameCards from "./app/namecard.json" with { type: "json" };
import weapon from "./app/weapon.json" with { type: "json" };
import arcBirCalendar from "./archive/birth_calendar.json" with { type: "json" };
import arcBirDraw from "./archive/birth_draw.json" with { type: "json" };
import arcBirRole from "./archive/birth_role.json" with { type: "json" };
import schemaUiaf from "./schema/uiaf-schema.json" with { type: "json" };
import schemaUigf from "./schema/uigf-schema.json" with { type: "json" };
import schemaUigf4 from "./schema/uigf4-schema.json" with { type: "json" };
import wikiMaterial from "./WIKI/material.json" with { type: "json" };
import wikiWeapon from "./WIKI/weapon.json" with { type: "json" };

// App
export const AppAchievementsData: Array<TGApp.App.Achievement.Item> = achievements;
export const AppAchievementSeriesData: Array<TGApp.App.Achievement.Series> = achievementSeries;
export const AppCalendarData: Array<TGApp.App.Calendar.Item> = calendar;
export const AppCharacterData: Array<TGApp.App.Character.WikiBriefInfo> = character;
export const AppGachaData: Array<TGApp.App.Gacha.PoolItem> = gacha;
export const AppGachaBData: Array<TGApp.App.Gacha.GachaBMeta> = gachaB;
export const AppNameCardsData: Array<TGApp.App.NameCard.Item> = nameCards;
export const AppWeaponData: Array<TGApp.App.Weapon.WikiBriefInfo> = weapon;
// Schema
export const UiafSchema: Schema = schemaUiaf;
export const UigfSchema: Schema = schemaUigf;
export const Uigf4Schema: Schema = schemaUigf4;
// Archive
export const ArcBirCalendar: TGApp.Archive.Birth.CalendarData = arcBirCalendar;
export const ArcBirDraw: Array<TGApp.Archive.Birth.DrawItem> = arcBirDraw;
export const ArcBirRole: Array<TGApp.Archive.Birth.RoleItem> = arcBirRole;
// Wiki
export const WikiWeaponData: Array<TGApp.App.Weapon.WikiItem> = wikiWeapon;
export const WikiMaterialData: Array<TGApp.App.Material.WikiItem> = wikiMaterial;
export const WikiHyperLinkData: TGApp.App.HyperLink.AppHyperLink = hyperlink;

const avatarFiles = import.meta.glob("./WIKI/character/*.json");

/**
 * 传入角色id，获取对应character/id.json的内容，如果没有则返回false
 * @param id - 角色id
 * @returns 角色数据或false
 */
export async function getWikiCharacterById(
  id: number,
): Promise<TGApp.App.Character.WikiItem | false> {
  const key = `./WIKI/character/${id}.json`;
  if (!(key in avatarFiles)) return false;
  try {
    const data = await avatarFiles[key]();
    if (data && typeof data === "object" && "default" in data) {
      console.log(data.default);
      return <TGApp.App.Character.WikiItem>data.default;
    } else {
      console.warn(`角色 ${id} 数据未找到或格式不正确`);
      return false;
    }
  } catch (error) {
    console.error(`获取角色 ${id} 数据失败:`, error);
    return false;
  }
}
