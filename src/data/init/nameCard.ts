/**
 * @file data init nameCard
 * @description data init nameCard
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { AppData } from "../app";
import { NameCard } from "../../interface/NameCard";
import { Map } from "../../interface/Base";

/**
 * @description 名片表参数
 * @since Alpha
 */
export const Config = {
	storeName: "NameCard",
	keyPath: "name",
	indexes: ["type"],
};

/**
 * @description 名片数据
 * @since Alpha
 * @return {NameCard[]}
 */
export function getData() {
	const data: Map<NameCard[]> = AppData.nameCards;
	let result: NameCard[] = [];
	Object.keys(data).map(key => {
		const cards: NameCard[] = data[Number(key)];
		cards.map(card => {
			result.push(card);
		});
	});
	return result;
}
