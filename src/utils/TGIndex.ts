/**
 * @file utils TGIndex.ts
 * @description IndexedDB utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { ConfigList } from "../data/init";

// 数据库参数
export const DB_NAME = "TGData";
export const DB_VERSION = 1;

/**
 * @description 初始化数据库
 * @description 只会在第一次打开游戏时执行
 * @since Alpha
 */
export async function InitTGData() {
	const request = window.indexedDB.open(DB_NAME, DB_VERSION);
	request.onupgradeneeded = event => {
		const db = request.result;
		// 创建表
		ConfigList.forEach(config => {
			const store = db.createObjectStore(config.storeName, {
				keyPath: config.keyPath,
			});
			config.indexes.forEach(index => {
				store.createIndex(index, index, { unique: false });
			});
		});
	};
}

/**
 * @description 删除数据库
 * @since Alpha
 * @return {Promise<void>}
 */
export async function DeleteTGData() {
	await window.indexedDB.deleteDatabase(DB_NAME);
}

/**
 * @description 向数据库中写入数据
 * @since Alpha
 * @param {string} storeName 表名
 * @param {any[]} data 数据
 * @return {Promise<void>}
 */
export async function WriteTGData(storeName: string, data: any[]) {
	const request = window.indexedDB.open(DB_NAME, DB_VERSION);
	request.onsuccess = event => {
		const db = request.result;
		const transaction = db.transaction(storeName, "readwrite");
		const store = transaction.objectStore(storeName);
		data.forEach(item => {
			store.put(item);
		});
	};
}
