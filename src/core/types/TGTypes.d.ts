/**
 * @file core types App.d.ts
 * @description 本应用的类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import type TGBase from "./TGBase";
import type TGAchievement from "./TGAchievement";
import type TGNameCard from "./TGNameCard";

namespace TGTypes {
  export type DBConfig = TGBase.DBConfig;
  export type NameCard = TGNameCard.NameCard;
  export type Achievement = TGAchievement.Achievement;
  export type AchievementSeries = TGAchievement.AchievementSeries;
}

export default TGTypes;
