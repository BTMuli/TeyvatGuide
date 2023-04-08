/**
 * @file data init achievement
 * @description data init achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { AppData } from "../app";
import type TGTypes from "../../core/types/TGTypes";

/**
 * @description 成就表参数
 * @since Alpha v0.1.2
 * @returns {TGTypes.DBConfig}
 */
export const Config: TGTypes.DBConfig = {
  storeName: "Achievements",
  keyPath: "id",
  indexes: ["name", "description", "series", "order", "reward", "version"],
};

/**
 * @description 成就数据
 * @since Alpha v0.1.2
 * @return {TGTypes.Achievement[]}
 */
export function getData (): TGTypes.Achievement[] {
  const data: Record<number, TGTypes.Achievement> = AppData.achievements;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}
