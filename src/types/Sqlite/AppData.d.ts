/**
 * AppData 表类型定义文件
 * @since Beta v0.9.9
 */

declare namespace TGApp.Sqlite.AppData {
  /**
   * AppData 行数据
   * @since Beta v0.9.9
   */
  type Item = {
    /** 键 */
    key: string;
    /** 值 */
    value: string;
    /** 更新时间 */
    updated: string;
  };
}
