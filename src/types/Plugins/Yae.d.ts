/**
 * Yae 插件类型定义
 * @since Beta v0.7.8
 */

declare namespace TGApp.Plugins.Yae {
  /**
   * 后端返的成就列表数据
   * @since Beta v0.7.8
   */
  type AchiListRes = Array<AchiItemRes>;

  /**
   * 成就完成状态
   * @since Beta v0.7.8
   */
  const AchiItemStat = <const>{
    /* 无效状态 */
    Invalid: 0,
    /* 未完成 */
    Unfinished: 1,
    /* 已完成未领取奖励 */
    Finished: 2,
    /* 已领取奖励 */
    RewardTaken: 3,
  };

  /**
   * 成就完成状态m枚举
   * @since Beta v0.7.8
   */
  type AchiItemStatEnum = (typeof AchiItemStat)[keyof typeof AchiItemStat];

  /**
   * 后端返的单个成就数据
   * @since Beta v0.7.8
   * @see src-tauri/yae/proto.rs AchiItemRes
   */
  type AchiItemRes = {
    /* 成就 ID */
    id: number;
    /* 成就总进度 */
    total: number;
    /* 成就当前进度 */
    cur: number;
    /* 完成时间戳，单位秒 */
    ts: number;
    /* 成就完成状态 */
    stat: AchiItemStatEnum;
  };
}
