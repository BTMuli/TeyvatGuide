/**
 * @file data init nameCard
 * @description data init nameCard
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { AppData } from "../app";
import type TGTypes from "../../core/types/TGTypes";

/**
 * @description 名片表参数
 * @since Alpha v0.1.2
 * @returns {TGTypes.DBConfig}
 */
export const Config: TGTypes.DBConfig = {
  storeName: "NameCard",
  keyPath: "name",
  indexes: ["type"],
};

/**
 * @description 名片数据
 * @since Alpha v0.1.2
 * @return {TGTypes.NameCard[]}
 */
export function getData (): TGTypes.NameCard[] {
  const data: Record<number, TGTypes.NameCard[]> = AppData.nameCards;
  const result: TGTypes.NameCard[] = [];
  Object.keys(data).map((key) => {
    const cards: TGTypes.NameCard[] = data[Number(key)];
    return cards.map((card) => result.push(card));
  });
  return result;
}
