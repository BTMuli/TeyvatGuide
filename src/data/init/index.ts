/**
 * @file data init index
 * @description data init index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */
import { Config as AchievementsConfig, getData as getAchievementsData } from "./achievements";
import { Config as SeriesConfig, getData as getSeriesData } from "./achievementSeries";

export const ConfigList = [AchievementsConfig, SeriesConfig];

export const getDataList = [
  {
    name: "Achievements",
    data: getAchievementsData(),
  },
  {
    name: "AchievementSeries",
    data: getSeriesData(),
  },
];
