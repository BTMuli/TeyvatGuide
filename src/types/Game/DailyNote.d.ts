/**
 * 实时便笺数据
 * @since Beta v0.10.0
 */

declare namespace TGApp.Game.DailyNote {
  /**
   * 实时便笺返回响应
   * @since Beta v0.10.0
   */
  type DnResp = TGApp.BBS.Response.BaseWithData<DnRes>;

  /**
   * 实时便笺返回
   * @since Beta v0.10.0
   */
  type DnRes = {
    /** 当前体力 */
    current_resin: number;
    /** 体力上限 */
    max_resin: number;
    /** 回复时间（秒） */
    resin_recovery_time: string;
    /** 日常完成数 */
    finished_task_num: number;
    /** 总日常数 */
    total_task_num: number;
    /** 是否领取额外奖励 */
    is_extra_task_reward_received: boolean;
    /** 剩余周本减半数 */
    remain_resin_discount_num: number;
    /** 总减半数 */
    resin_discount_num_limit: number;
    /** 探索派遣数 */
    current_expedition_num: number;
    /** 探索派遣上限 */
    max_expedition_num: number;
    /** 探索派遣 */
    expeditions: Array<Expedition>;
    /** 洞天宝钱数 */
    current_home_coin: number;
    /** 洞天宝钱上限 */
    max_home_coin: number;
    /** 宝钱回满时间（秒） */
    home_coin_recovery_time: string;
    /**
     * 日历
     * @todo 未知用途，目前为空字符串
     */
    calendar_url: string;
    /** 参量质变仪 */
    transformer: TransformerData;
    /** 日常 */
    daily_task: DailyTask;
    /** 任务进度 */
    archon_quest_progress: ArchonQuestProgress;
  };

  /**
   * 探索派遣项
   * @since Beta v0.10.0
   */
  type Expedition = {
    /** 侧边图 */
    avatar_side_icon: string;
    /**
     * 状态
     * @todo 枚举
     * @example
     * - Ongoing
     */
    status: string;
    /** 剩余时间（秒）*/
    remained_time: string;
  };

  /**
   * 参量质变仪
   * @since Beta v0.10.0
   */
  type TransformerData = {
    /** 是否可以使用 */
    obtained: boolean;
    /** 恢复时间 */
    recovery_time: TransformerTime;
    /** WIKI */
    wiki: string;
    /** 提醒 */
    noticed: boolean;
    /** 最新工作ID */
    latest_job_id: string;
  };

  /**
   * 时间
   * @since Beta v0.10.0
   */
  type TransformerTime = TGApp.Game.Base.DateTime & {
    /** 是否到达 */
    reached: boolean;
  };

  /**
   * 日常任务
   * @since Beta v0.10.0
   */
  type DailyTask = {
    /** 总数 */
    total_num: number;
    /** 完成数 */
    finished_num: number;
    /** 是否领取额外奖励 */
    is_extra_task_reward_received: boolean;
    /** 任务奖励 */
    task_rewards: Array<DailyTaskReward>;
    /** 历练点奖励 */
    attendance_rewards: Array<AttendanceReward>;
    /** 有历练点 */
    attendance_visible: boolean;
    /** 长效历练点 */
    stored_attendance: number;
    /** 历练点清空时间（秒） */
    stored_attendance_refresh_countdown: number;
  };

  /**
   * 日常奖励
   * @since Beta v0.10.0
   */
  type DailyTaskReward = {
    /**
     * 状态
     * @todo 枚举
     * @example
     * - TaskRewardStatusUnfinished
     */
    status: string;
  };

  /**
   * 历练点奖励
   * @since Beta v0.10.0
   */
  type AttendanceReward = {
    /**
     * 状态
     * @todo 枚举
     * @example
     * - AttendanceRewardStatusTakenAward
     */
    status: string;
    /**
     * 进度
     * @remarks 2000 点满
     */
    progress: number;
  };

  /**
   * 任务进度
   * @since Beta v0.10.0
   */
  type ArchonQuestProgress = {
    /** 任务列表 */
    list: Array<ArchonQuest>;
    /** 是否开启任务 */
    is_open_archon_quest: boolean;
    /** 是否完成所有主线任务 */
    is_finish_all_mainline: boolean;
    /** 是否完成所有角色任务 */
    is_finish_all_interchapter: boolean;
    /** WIKI */
    wiki_url: string;
  };

  /** 任务 */
  type ArchonQuest = unknown;
}
