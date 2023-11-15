/**
 * @file types/Game/DailyNotes.d.ts
 * @description 获取实时便笺数据类型定义文件
 * @since Alpha v0.2.2
 */

/**
 * @description 获取实时便笺数据
 * @since Alpha v0.2.2
 * @namespace TGApp.Game.DailyNotes
 * @memberof TGApp.Game
 */
declare namespace TGApp.Game.DailyNotes {
  /**
   * @description 便笺数据返回
   * @since Alpha v0.2.2
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullInfo} data - 便笺数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: FullInfo;
  }

  /**
   * @description 便笺数据
   * @since Alpha v0.2.2
   * @interface FullInfo
   * @property {number} current_resin - 当前体力
   * @property {number} max_resin - 最大体力
   * @property {string} resin_recovery_time - 体力恢复时间（秒）
   * @property {number} finished_task_num - 已完成日常任务数
   * @property {number} total_task_num - 日常任务总数
   * @property {boolean} is_extra_reward_received - 是否已领取额外奖励
   * @property {number} remain_resin_discount_num - 剩余周本减半次数
   * @property {number} resin_discount_num_limit - 周本减半次数上限
   * @property {number} current_expedition_num - 当前委托数
   * @property {number} max_expedition_num - 最大委托数
   * @property {Expedition[]} expeditions - 委托数据
   * @property {number} current_home_coin - 洞天宝钱数
   * @property {number} max_home_coin - 洞天宝钱上限
   * @property {string} home_coin_recovery_time - 洞天宝钱恢复时间（秒）
   * @property {string} calendar_url - 日历地址 // 未使用
   * @property {Transform} transformer - 便笺数据转换器
   * @return FullInfo
   */
  interface FullInfo {
    current_resin: number;
    max_resin: number;
    resin_recovery_time: string;
    finished_task_num: number;
    total_task_num: number;
    is_extra_reward_received: boolean;
    remain_resin_discount_num: number;
    resin_discount_num_limit: number;
    current_expedition_num: number;
    max_expedition_num: number;
    expeditions: Expedition[];
    current_home_coin: number;
    max_home_coin: number;
    home_coin_recovery_time: string;
    calendar_url: string;
    transformer: Transform;
  }

  /**
   * @description 委托数据
   * @since Alpha v0.2.2
   * @interface Expedition
   * @property {string} avatar_side_icon - 头像侧边图标
   * @property {string} status - 委托状态 // Ongoing: 进行中，Finished: 已完成，Expired: 已过期
   * @property {string} remained_time - 剩余时间（秒）
   * @return Expedition
   */
  interface Expedition {
    avatar_side_icon: string;
    status: string;
    remained_time: string;
  }

  /**
   * @description 便笺数据转换器
   * @since Alpha v0.2.2
   * @interface Transform
   * @property {boolean} obtained - 是否已获取
   * @property {TransformTime} recovery_time - 恢复时间
   * @property {string} wiki - 百科地址
   * @property {boolean} noticed - 是否已通知
   * @property {string} last_job_id - 上次任务 ID
   * @return Transform
   */
  interface Transform {
    obtained: boolean;
    recovery_time: TransformTime;
    wiki: string;
    noticed: boolean;
    last_job_id: string;
  }

  /**
   * @description 便笺数据转换器恢复时间
   * @since Alpha v0.2.2
   * @interface TransformTime
   * @property {number} Day - 天
   * @property {number} Hour - 小时
   * @property {number} Minute - 分钟
   * @property {number} Second - 秒
   * @property {boolean} reached - 是否已达到恢复时间
   * @return TransformTime
   */
  interface TransformTime {
    Day: number;
    Hour: number;
    Minute: number;
    Second: number;
    reached: boolean;
  }
}
