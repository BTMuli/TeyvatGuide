/**
 * 数据库成就相关类型定义文件
 * @since Beta v0.6.0
 */

declare namespace TGApp.Sqlite.Achievement {
  /**
   * 成就表数据
   * @since Beta v0.6.0
   * @remarks Achievements 表
   */
  type TableRaw = {
    /** 成就 ID */
    id: number;
    /** 存档 UID */
    uid: number;
    /** 是否完成 */
    isCompleted: 0 | 1;
    /** 完成时间 */
    completedTime: string;
    /** 成就进度 */
    progress: number;
    /** 更新时间 */
    updated: string;
  };
}
