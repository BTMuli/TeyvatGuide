/**
 * @file data init achievement
 * @description data init achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { AppData } from "../app";

/**
 * @description 成就表参数
 * @since Alpha v0.1.2
 * @returns {BTMuli.Genshin.Base.DBConfig}
 */
export const Config: BTMuli.Genshin.Base.DBConfig = {
  storeName: "Achievements",
  keyPath: "id",
  indexes: ["name", "description", "series", "order", "reward", "version"],
};

/**
 * @description 成就数据
 * @since Alpha v0.1.2
 * @return {BTMuli.Genshin.Achievement[]}
 */
export function getData (): BTMuli.Genshin.Achievement[] {
  const data: Record<number, BTMuli.Genshin.Achievement> = AppData.achievements;
  return Object.keys(data).map((key) => {
    return data[Number(key)];
  });
}
