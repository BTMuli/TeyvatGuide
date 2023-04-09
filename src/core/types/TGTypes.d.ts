/**
 * @file core types App.d.ts
 * @description 本应用的类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import type TGAchievement from "./TGAchievement";
import type TGBase from "./TGBase";
import type TGCalendar from "./TGCalendar";
import type TGNameCard from "./TGNameCard";

namespace TGTypes {
  export type Achievement = TGAchievement.Achievement;
  export type AchievementSeries = TGAchievement.AchievementSeries;
  export type CalendarData = TGCalendar.CalendarData;
  export type CalendarItem = TGCalendar.CalendarItem;
  export type CalendarMaterial = TGCalendar.CalendarMaterial;
  export type DBConfig = TGBase.DBConfig;
  export type NameCard = TGNameCard.NameCard;
}

export default TGTypes;
