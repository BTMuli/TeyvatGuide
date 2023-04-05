/**
 * @file utils TGIndex.ts
 * @description IndexedDB utils
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { TGConfigList } from "../data";

// 数据库参数
export const DB_NAME = "TGData";
export const DB_VERSION = 1;

/**
 * @description 初始化数据库
 * @description 只会在第一次打开游戏时执行
 * @since Alpha v0.1.2
 * @returns {Promise<void>}
 */
export async function InitTGData (): Promise<void> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    // 创建表
    TGConfigList.forEach((config) => {
      const store = db.createObjectStore(config.storeName, {
        keyPath: config.keyPath,
      });
      config.indexes.forEach((index) => {
        store.createIndex(index, index, { unique: false });
      });
    });
  };
}

/**
 * @description 删除数据库
 * @since Alpha
 * @returns {void}
 */
export function DeleteTGData (): void {
  window.indexedDB.deleteDatabase(DB_NAME);
}

/**
 * @description 向数据库中写入数据
 * @since Alpha
 * @param {string} storeName 表名
 * @param {any[]} data 数据
 * @returns {Promise<void>}
 */
export async function WriteTGData (storeName: string, data: any[]): Promise<void> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    data.forEach((item) => {
      store.put(item);
    });
  };
}

/**
 * @description 更新数据库中的单条数据-根据主键
 * @since Alpha
 * @param {string} storeName 表名
 * @param {any} data 数据
 * @returns {Promise<void>}
 */
export async function UpdateTGDataByKey (storeName: string, data: any): Promise<void> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.put(data);
  };
}

/**
 * @description 更新数据库中的单条数据-根据索引
 * @since Alpha
 * @param {string} storeName 表名
 * @param {string} indexName 索引名
 * @param {any} key 索引值
 * @param {any} data 数据
 * @returns {Promise<void>}
 */
export async function UpdateTGDataByIndex (storeName: string, indexName: string, key: any, data: any): Promise<void> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const requestData = index.getAll(key);
    requestData.onsuccess = () => {
      const result = requestData.result;
      result.forEach((item) => {
        Object.keys(data).forEach((key) => {
          item[key] = data[key];
        });
        store.put(item);
      });
    };
  };
}

/**
 * @description 从数据库中读取某些数据-按照主键
 * @since Alpha
 * @param {string} storeName 表名
 * @param {any[]} keys 主键值
 * @returns {Promise<any[]>}
 */
export async function ReadTGDataByKey (storeName: string, keys: any[]): Promise<any[]> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  return await new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const requestData = store.getAll();
      requestData.onsuccess = () => {
        const result = requestData.result;
        const data = result.filter((item) => {
          return keys.includes(item.id);
        });
        resolve(data);
      };
      requestData.onerror = () => {
        reject(requestData.error);
      };
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * @description 从数据库中读取某些数据-按照索引
 * @since Alpha
 * @param {string} storeName 表名
 * @param {string} indexName 索引名
 * @param {any} key 索引值
 * @returns {Promise<any[]>}
 */
export async function ReadTGDataByIndex (storeName: string, indexName: string, key: any): Promise<any[]> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  return await new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const requestData = index.getAll(key);
      requestData.onsuccess = () => {
        resolve(requestData.result);
      };
      requestData.onerror = () => {
        reject(requestData.error);
      };
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * @description 从数据库中读取所有数据
 * @since Alpha
 * @param {string} storeName 表名
 * @returns {Promise<any[]>}
 */
export async function ReadAllTGData (storeName: string): Promise<any[]> {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  return await new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const requestData = store.getAll();
      requestData.onsuccess = () => {
        resolve(requestData.result);
      };
      requestData.onerror = () => {
        reject(requestData.error);
      };
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}
