/**
 * 幽境危战类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Sqlite.Challenge {
  /**
   * 幽静危战表数据
   * @since Beta v0.8.0
   * @remarks HardChallenge 表
   */
  type TableRaw = {
    /** 用户UID */
    uid: string;
    /** 数据 ID */
    id: number;
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
    /** 挑战名称 */
    name: string;
    /**
     * 单人挑战数据
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Challenge.Challenge} 类型
     */
    single: string;
    /**
     * 联机挑战数据
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Challenge.Challenge} 类型
     */
    mp: string;
    /**
     * 赋光数据
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Challenge.ChallengeBlings} 类型
     */
    blings: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 幽境危战数据
   * @since Beta v0.9.1
   * @remarks 从 {@link TableRaw} 解析过来的数据
   */
  type TableTrans = {
    /** 用户UID */
    uid: string;
    /** 数据 ID */
    id: number;
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
    /** 挑战名称 */
    name: string;
    /** 单人挑战数据 */
    single: TGApp.Game.Challenge.Challenge;
    /** 联机挑战数据 */
    mp: TGApp.Game.Challenge.Challenge;
    /** 赋光数据 */
    blings: TGApp.Game.Challenge.ChallengeBlings;
    /** 更新时间 */
    updated: string;
  };
}
