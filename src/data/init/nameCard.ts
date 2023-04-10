/**
 * @file data init nameCard
 * @description data init nameCard
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { AppData } from "../app";

/**
 * @description 名片表参数
 * @since Alpha v0.1.2
 * @returns {BTMuli.Genshin.Base.DBConfig}
 */
export const Config: BTMuli.Genshin.Base.DBConfig = {
  storeName: "NameCard",
  keyPath: "name",
  indexes: ["type"],
};

/**
 * @description 名片数据
 * @since Alpha v0.1.2
 * @return {BTMuli.Genshin.NameCard[]}
 */
export function getData (): BTMuli.Genshin.NameCard[] {
  const data: Record<number, BTMuli.Genshin.NameCard[]> = AppData.nameCards;
  const result: BTMuli.Genshin.NameCard[] = [];
  Object.keys(data).map((key) => {
    const cards: BTMuli.Genshin.NameCard[] = data[Number(key)];
    return cards.map((card) => result.push(card));
  });
  return result;
}
