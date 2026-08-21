/**
 * 原神战绩类型定义文件
 * @since Beta v0.11.5
 */

declare namespace TGApp.Sqlite.Record {
  /**
   * 原始战绩数据库行
   * @since Beta v0.11.5
   * @remarks UserRecordRaw 表
   */
  type RawTableRow = {
    /** 用户 UID */
    uid: number;
    /** 序列化后的接口原始数据 */
    rawData: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 战绩渲染数据（不包含数据库元数据）
   * @since Beta v0.11.5
   */
  type TableTransData = {
    /** 用户信息 */
    role: TGApp.Game.Record.Role;
    /** 角色列表 */
    avatars: Array<TGApp.Game.Record.Avatar>;
    /** 统计信息 */
    stats: TGApp.Game.Record.Stats;
    /** 世界探索展示信息 */
    wed: Array<TGApp.Game.Record.WorldExploreDisplay>;
    /** 尘歌壶信息 */
    homes: Array<TGApp.Game.Record.Home>;
  };

  /**
   * 战绩数据
   * @since Beta v0.11.5
   * @remarks 由 UserRecordRaw 原始数据解析得到
   */
  type TableTrans = TableTransData & {
    /** 用户 UID */
    uid: number;
    /** 更新时间 */
    updated: string;
  };
}
