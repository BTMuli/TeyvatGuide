/**
 * @file data init achievementSeries
 * @description data init achievementSeries
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { AppData } from "../app";

/**
 * @description 成就系列表参数
 * @since Alpha v0.1.2
 * @returns {BTMuli.Genshin.Base.DBConfig}
 */
export const Config: BTMuli.Genshin.Base.DBConfig = {
  storeName: "AchievementSeries",
  keyPath: "id",
  indexes: ["order", "name", "card"],
};

/**
 * @description 成就系列数据
 * @since Alpha v0.1.2
 * @return {BTMuli.Genshin.AchievementSeries[]}
 */
export function getData (): BTMuli.Genshin.AchievementSeries[] {
  const data: Record<number, BTMuli.Genshin.AchievementSeries> = AppData.achievementSeries;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}
