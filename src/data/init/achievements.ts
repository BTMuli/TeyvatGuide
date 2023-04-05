/**
 * @file data init achievement
 * @description data init achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { AppData } from "../app";
import { type Achievement } from "../../interface/Achievements";
import { type Map, type DBConfig } from "../../interface/Base";

/**
 * @description 成就表参数
 * @since Alpha v0.1.2
 * @returns {DBConfig}
 */
export const Config: DBConfig = {
  storeName: "Achievements",
  keyPath: "id",
  indexes: ["name", "description", "series", "order", "reward", "version"],
};

/**
 * @description 成就数据
 * @since Alpha v0.1.2
 * @return {Achievement[]}
 */
export function getData (): Achievement[] {
  const data: Map<Achievement> = AppData.achievements;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}
