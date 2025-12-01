/**
 * UIAF 相关枚举类型
 * @since Beta v0.7.8
 */

/**
 * 成就完成状态枚举
 * @since Beta v0.7.8
 */
export const UiafAchiStatEnum: typeof TGApp.Plugins.UIAF.AchiItemStat = {
  /** 无效状态 */
  Invalid: 0,
  /** 未完成 */
  Unfinished: 1,
  /** 已完成未领取奖励 */
  Finished: 2,
  /** 已领取奖励 */
  RewardTaken: 3,
};
