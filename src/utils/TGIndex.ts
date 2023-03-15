/**
 * @file utils TGIndex.ts
 * @description IndexedDB utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// 一些常量
const DB_NAME = "TGData";
const DB_VERSION = 1;
// 创建数据库
export const TGDatabases = window.indexedDB.open(DB_NAME, DB_VERSION);

/**
 * @description 创建数据表
 * @param {string} name 表名
 * @param {string} keyPath 主键
 * @param {Array<string>} indexs 索引
 * @param {boolean} autoIncrement 是否自增
 * @returns {Promise<IDBObjectStore>} 返回数据表
 */
export const createTable = (
	name: string,
	keyPath: string,
	indexs: Array<string>,
	autoIncrement: boolean
): Promise<IDBObjectStore> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.createObjectStore(name, {
				keyPath: keyPath,
				autoIncrement: autoIncrement,
			});
			indexs.forEach(index => {
				store.createIndex(index, index, { unique: false });
			});
			resolve(store);
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 删除数据表
 * @param {string} name 表名
 * @returns {Promise<void>} 返回空
 */
export const deleteTable = (name: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			db.deleteObjectStore(name);
			resolve();
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 添加数据
 * @param {string} name 表名
 * @param {any} data 数据
 * @returns {Promise<void>} 返回空
 */
export const addData = (name: string, data: any): Promise<void> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.transaction(name, "readwrite").objectStore(name);
			store.add(data);
			resolve();
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 删除数据
 * @param {string} name 表名
 * @param {any} data 数据
 * @returns {Promise<void>} 返回空
 */
export const deleteData = (name: string, data: any): Promise<void> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.transaction(name, "readwrite").objectStore(name);
			store.delete(data);
			resolve();
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 修改数据
 * @param {string} name 表名
 * @param {any} data 数据
 * @returns {Promise<void>} 返回空
 */
export const updateData = (name: string, data: any): Promise<void> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.transaction(name, "readwrite").objectStore(name);
			store.put(data);
			resolve();
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 查询数据
 * @param {string} name 表名
 * @param {any} data 数据
 * @returns {Promise<any>} 返回数据
 */
export const getData = (name: string, data: any): Promise<any> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.transaction(name, "readwrite").objectStore(name);
			const request = store.get(data);
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onerror = () => {
				reject(request.error);
			};
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 查询所有数据
 * @param {string} name 表名
 * @returns {Promise<Array<any>>} 返回数据
 */
export const getAllData = (name: string): Promise<Array<any>> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.transaction(name, "readwrite").objectStore(name);
			const request = store.getAll();
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onerror = () => {
				reject(request.error);
			};
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};

/**
 * @description 清空数据表
 * @param {string} name 表名
 * @returns {Promise<void>} 返回空
 */
export const clearTable = (name: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		TGDatabases.onsuccess = () => {
			const db = TGDatabases.result;
			const store = db.transaction(name, "readwrite").objectStore(name);
			store.clear();
			resolve();
		};
		TGDatabases.onerror = () => {
			reject(TGDatabases.error);
		};
	});
};
