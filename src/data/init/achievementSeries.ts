/**
 * @file data init achievementSeries
 * @description data init achievementSeries
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import type TGTypes from "../../core/types/TGTypes";
import { AppData } from "../app";

/**
 * @description 成就系列表参数
 * @since Alpha v0.1.2
 * @returns {TGTypes.DBConfig}
 */
export const Config: TGTypes.DBConfig = {
  storeName: "AchievementSeries",
  keyPath: "id",
  indexes: ["order", "name", "card"],
};

/**
 * @description 成就系列数据
 * @since Alpha v0.1.2
 * @return {TGTypes.AchievementSeries[]}
 */
export function getData (): TGTypes.AchievementSeries[] {
  const data: Record<number, TGTypes.AchievementSeries> = AppData.achievementSeries;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}
