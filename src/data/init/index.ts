/**
 * @file data init index
 * @description data init index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { Config as AchievementsConfig, getData as getAchievementsData } from "./achievements";
import { Config as GCGConfig, getData as getGCGData } from "./GCG";
import { Config as NameCardConfig, getData as getNameCardData } from "./nameCard";
import { Config as SeriesConfig, getData as getSeriesData } from "./achievementSeries";

export const ConfigList = [AchievementsConfig, GCGConfig, NameCardConfig, SeriesConfig];

export const getDataList = [
  {
    name: "Achievements",
    data: getAchievementsData(),
  },
  {
    name: "AchievementSeries",
    data: getSeriesData(),
  },
  {
    name: "GCG",
    data: getGCGData(),
  },
  {
    name: "NameCard",
    data: getNameCardData(),
  },
];
