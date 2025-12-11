/**
 * 米游币任务数据类型
 * @since Beta v0.7.0
 */

declare namespace TGApp.BBS.Mission {
  /**
   * @description 任务信息返回响应
   * @since Beta v0.7.0
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * 任务信息返回
   * @since Beta v0.7.0
   */
  type InfoRes = {
    /** 任务列表 */
    missions: Array<MissionItem>;
    /** 更多任务列表 */
    more_missions: Array<MissionItem>;
  };

  /**
   * 任务
   * @since Beta v0.7.0
   */
  type MissionItem = {
    /** 任务ID */
    id: number;
    /** 任务名称 */
    name: string;
    /** 任务描述 */
    desc: string;
    /** 阈值 */
    threshold: number;
    /** 完成次数 */
    limit: number;
    /** 提供经验 */
    exp: number;
    /** 米游币 */
    points: number;
    /** 激活时间戳（秒） */
    active_time: number;
    /** 结束时间戳（秒）
     * @remarks 通常为0
     */
    end_time: number;
    /** 是否自动发送奖励 */
    is_auto_send_award: boolean;
    /** 持续次数 */
    continuous_cycle_times: number;
    /** 下一次完成奖励 */
    next_points: number;
    /**
     * 任务Key
     * @remarks 与状态的任务Key对应
     */
    mission_key: string;
  };

  /**
   * 任务状态返回响应
   * @since Beta v0.7.0
   */
  type StateResp = TGApp.BBS.Response.BaseWithData<StateRes>;

  /**
   * 任务状态
   * @since Beta v0.7.0
   */
  type StateRes = {
    /** 任务状态列表 */
    states: Array<StateItem>;
    /** 已领取米游币 */
    already_received_points: number;
    /** 米游币总数 */
    total_points: number;
    /** 今日获取米游币 */
    today_total_points: number;
    /** 是否有未领取的奖励 */
    is_unclaimed: boolean;
    /** 还能获取的米游币 */
    can_get_points: number;
  };

  /**
   * 任务状态项
   * @since Beta v0.7.0
   */
  type StateItem = {
    /** 任务ID */
    mission_id: number;
    /**
     * 任务进度
     * @remarks 0-未完成，1-已完成
     */
    process: number;
    /** 发生次数 */
    happened_times: number;
    /** 是否获取奖励 */
    is_get_award: boolean;
    /**
     * 任务Key
     * @remarks 与任务项Key对应
     */
    mission_key: string;
  };
}
