/**
 * @file types/Sqlite/AppData.d.ts
 * @description Sqlite AppData 类型定义文件
 * @since Beta v0.4.1
 */

declare namespace TGApp.Sqlite.AppData {
  /**
   * @description AppData 数据库 - key 枚举
   * @since Beta v0.4.1
   * @enum {string}
   * @property {string} APP_VERSION - App 版本
   * @property {string} DATA_UPDATED - 数据库更新时间
   * @property {string} COOKIE - Cookie
   * @property {string} USER_INFO - 用户信息
   * @property {string} DEVICE_INFO - 设备信息
   * @property {string} USER_DIR - 用户数据目录
   * @return {string}
   */
  enum DBKey {
    APP_VERSION = "appVersion",
    DATA_UPDATED = "dataUpdated",
    COOKIE = "cookie",
    USER_INFO = "userInfo",
    DEVICE_INFO = "deviceInfo",
    USER_DIR = "userDir",
  }

  /**
   * @description AppData 数据
   * @since Beta v0.3.3
   * @interface Item
   * @property {DBKey} key - 键
   * @property {string} value - 值
   * @property {string} updated - 数据库更新时间
   * @return Item
   */
  interface Item {
    key: DBKey;
    value: string;
    updated: string;
  }
}
