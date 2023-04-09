/**
 * @file core types App.d.ts
 * @description 本应用的类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import type TGAchievement from "./TGAchievement";
import type TGAnno from "./TGAnno";
import type TGBase from "./TGBase";
import type TGCalendar from "./TGCalendar";
import type TGNameCard from "./TGNameCard";

namespace TGTypes {
  export type Achievement = TGAchievement.Achievement;
  export type AchievementSeries = TGAchievement.AchievementSeries;
  export type AnnoListResponse = TGAnno.AnnoListResponse;
  export type AnnoContentResponse = TGAnno.AnnoContentResponse;
  export type AnnoContentData = TGAnno.AnnoContentData;
  export type AnnoContentItem = TGAnno.AnnoContentItem;
  export type AnnoListCard = TGAnno.AnnoListCard;
  export type AnnoListData = TGAnno.AnnoListData;
  export type AnnoListItem = TGAnno.AnnoListItem;
  export type AnnoTypeList = TGAnno.AnnoTypeList;
  export type Announcement = TGAnno.Announcement;
  export type CalendarData = TGCalendar.CalendarData;
  export type CalendarItem = TGCalendar.CalendarItem;
  export type CalendarMaterial = TGCalendar.CalendarMaterial;
  export type DBConfig = TGBase.DBConfig;
  export type NameCard = TGNameCard.NameCard;
}

export default TGTypes;
