/**
 * @file data init achievement
 * @description data init achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { AppData } from "../app";
import { Achievement } from "../../interface/Achievements";
import { Map } from "../../interface/Base";

/**
 * @description 成就表参数
 * @since Alpha
 */
export const Config = {
	storeName: "Achievements",
	keyPath: "id",
	indexes: ["name", "description", "series", "order", "reward", "version"],
};

/**
 * @description 成就数据
 * @since Alpha
 * @return {Achievement[]}
 */
export function getData() {
	const data: Map<Achievement> = AppData.achievements;
	return Object.keys(data).map(key => {
		return data[Number(key)];
	});
}
