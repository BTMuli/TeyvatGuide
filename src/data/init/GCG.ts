/**
 * @file data init GCG
 * @description data init GCG
 * @description 分类参考：米游社卡牌图鉴
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { AppData } from "../app";
import { BaseCard } from "../../interface/GCG";

/**
 * @description 卡牌表参数
 * @since Alpha
 */
export const Config = {
	storeName: "GCG",
	keyPath: "id",
	// 根据 type 分类
	indexes: [
		"type",
		"info.element",
		"info.weapon",
		"info.camp",
		"info.actionType",
		"info.actionTag",
		"info.actionCost",
	],
};

/**
 * @description 卡牌数据
 * @since Alpha
 * @return {BaseCard[]}
 */
export function getData() {
	return AppData.GCG;
}
