/**
 * AppData 表类型定义文件
 * @since Beta v0.4.1
 */

declare namespace TGApp.Sqlite.AppData {
  /**
   * AppData 表键值
   * @since Beta v0.4.1
   * @TODO 枚举
   */
  enum DBKey {
    /** 应用版本 */
    APP_VERSION = "appVersion",
    /** 数据库更新时间 */
    DATA_UPDATED = "dataUpdated",
    /** 当前用户 Cookie */
    COOKIE = "cookie",
    /** 设备信息 */
    DEVICE_INFO = "deviceInfo",
    /** 数据目录 */
    USER_DIR = "userDir",
  }

  /**
   * AppData 行数据
   * @since Beta v0.3.3
   */
  type Item = {
    /** 键 */
    key: DBKey;
    /** 值 */
    value: string;
    /** 更新时间 */
    updated: string;
  };
}
