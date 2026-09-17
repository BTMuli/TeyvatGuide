/**
 * UIAF 相关枚举类型
 * @since Beta v0.12.3
 */

/**
 * 成就完成状态枚举
 * @since Beta v0.7.8
 */
export const UiafAchiStatEnum: typeof TGApp.Plugins.UIAF.AchiItemStat = {
  Invalid: 0,
  Unfinished: 1,
  Finished: 2,
  RewardTaken: 3,
};

/**
 * 获取成就展示状态文案。
 * @since Beta v0.12.3
 * @param status - UIAF 成就状态
 * @returns 成就完成与奖励领取状态的展示文案
 */
export function getStatusLabel(status: TGApp.Plugins.UIAF.AchiItemStatEnum): string {
  switch (status) {
    case UiafAchiStatEnum.Invalid:
      return "无效";
    case UiafAchiStatEnum.Unfinished:
      return "未完成";
    case UiafAchiStatEnum.Finished:
      return "未领取";
    case UiafAchiStatEnum.RewardTaken:
      return "已完成";
  }
}

/**
 * 获取成就展示状态图标。
 * @since Beta v0.12.2
 * @param status - UIAF 成就状态
 * @returns MDI 图标名称
 */
export function getStatusIcon(status: TGApp.Plugins.UIAF.AchiItemStatEnum): string {
  switch (status) {
    case UiafAchiStatEnum.Invalid:
      return "mdi-alert-circle-outline";
    case UiafAchiStatEnum.Unfinished:
      return "mdi-progress-clock";
    case UiafAchiStatEnum.Finished:
      return "mdi-gift";
    case UiafAchiStatEnum.RewardTaken:
      return "mdi-check-circle";
  }
}
