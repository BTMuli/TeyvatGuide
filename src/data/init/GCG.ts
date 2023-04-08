/**
 * @file data init GCG
 * @description data init GCG
 * @description 分类参考：米游社卡牌图鉴
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */
import { AppData } from "../app";
import type TGTypes from "../../core/types/TGTypes";
import { type BaseCard } from "../../interface/GCG";

/**
 * @description 卡牌表参数
 * @since Alpha v0.1.2
 * @returns {TGTypes.DBConfig}
 */
export const Config: TGTypes.DBConfig = {
  storeName: "GCG",
  keyPath: "id",
  // 根据 type 分类
  indexes: ["type", "info.element", "info.weapon", "info.camp", "info.actionType", "info.actionTag", "info.actionCost"],
};

/**
 * @description 卡牌数据
 * @since Alpha v0.1.2
 * @return {BaseCard[]}
 */
export function getData (): BaseCard[] {
  return AppData.GCG;
}
