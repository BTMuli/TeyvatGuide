/**
 * 数据库成就相关类型定义文件
 * @since Beta v0.12.1
 */

declare namespace TGApp.Sqlite.Achievement {
  /**
   * 成就表数据
   * @since Beta v0.12.1
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
    /** UIAF 成就状态 */
    status: TGApp.Plugins.UIAF.AchiItemStatEnum;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户成就状态
   * @since Beta v0.12.1
   */
  type UserState = {
    /** 成就 ID */
    id: number;
    /** 存档 UID */
    uid: number;
    /** 是否完成 */
    isCompleted: boolean;
    /** 完成时间 */
    completedTime: string;
    /** 成就进度 */
    progress: number;
    /** UIAF 成就状态 */
    status: TGApp.Plugins.UIAF.AchiItemStatEnum;
    /** 更新时间 */
    updated: string;
  };
}
