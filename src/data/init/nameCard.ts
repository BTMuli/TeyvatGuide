/**
 * @file data init nameCard
 * @description data init nameCard
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { AppData } from "../app";
import { type NameCard } from "../../interface/NameCard";
import { type Map, type DBConfig } from "../../interface/Base";

/**
 * @description 名片表参数
 * @since Alpha v0.1.2
 * @returns {DBConfig}
 */
export const Config: DBConfig = {
  storeName: "NameCard",
  keyPath: "name",
  indexes: ["type"],
};

/**
 * @description 名片数据
 * @since Alpha v0.1.2
 * @return {NameCard[]}
 */
export function getData (): NameCard[] {
  const data: Map<NameCard[]> = AppData.nameCards;
  const result: NameCard[] = [];
  Object.keys(data).map((key) => {
    const cards: NameCard[] = data[Number(key)];
    return cards.map((card) => result.push(card));
  });
  return result;
}
