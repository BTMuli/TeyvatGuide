/**
 * 幻想真境剧诗类型定义文件
 * @since Beta v0.6.3
 */

declare namespace TGApp.Sqlite.Combat {
  /**
   * 数据库-幻想真境剧诗表
   * @since Beta v0.6.3
   * @remarks RoleCombat 表
   */
  type TableRaw = {
    /** 用户 UID */
    uid: string;
    /** 剧诗 ID */
    id: number;
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
    /** 是否有数据 */
    hasData: 0 | 1;
    /** 是否有详细数据 */
    hasDetailData: 0 | 1;
    /**
     * 概况
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Combat.Stat} 类型
     */
    stat: string;
    /**
     * 详情
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Combat.Detail} 类型
     */
    detail: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 幻想真境剧诗数据
   * @since Beta v0.6.3
   * @remarks 解析自 {@link TableRaw} 数据
   */
  type TableTrans = {
    /** 用户 UID */
    uid: string;
    /** 剧诗 ID */
    id: number;
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
    /** 是否有数据 */
    hasData: boolean;
    /** 是否有详细数据 */
    hasDetailData: boolean;
    /** 概况 */
    stat: TGApp.Game.Combat.Stat;
    /** 详情 */
    detail: TGApp.Game.Combat.Detail;
    /** 更新时间 */
    updated: string;
  };
}
