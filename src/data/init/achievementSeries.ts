/**
 * @file data init achievementSeries
 * @description data init achievementSeries
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { type AchievementSeries } from "../../interface/Achievements";
import { type Map, type DBConfig } from "../../interface/Base";
import { AppData } from "../app";

/**
 * @description 成就系列表参数
 * @since Alpha v0.1.2
 * @returns {DBConfig}
 */
export const Config: DBConfig = {
  storeName: "AchievementSeries",
  keyPath: "id",
  indexes: ["order", "name", "card"],
};

/**
 * @description 成就系列数据
 * @since Alpha v0.1.2
 * @return {AchievementSeries[]}
 */
export function getData (): AchievementSeries[] {
  const data: Map<AchievementSeries> = AppData.achievementSeries;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}
