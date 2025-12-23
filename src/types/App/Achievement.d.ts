/**
 * 应用成就相关类型定义文件
 * @since Beta v0.4.2
 */

declare namespace TGApp.App.Achievement {
  /**
   * 本应用的成就类型
   * @since Beta v0.4.2
   */
  type Item = {
    /** 成就ID */
    id: number;
    /** 成就系列ID */
    series: number;
    /** 成就排序 */
    order: number;
    /** 成就名称 */
    name: string;
    /** 成就描述 */
    description: string;
    /** 奖励原石数量 */
    reward: number;
    /** 成就版本 */
    version: string;
    /** 成就完成方式 */
    trigger: Trigger;
  };

  /**
   * 用于渲染的成就类型
   * @since Beta v0.9.1
   * @remarks 基于 {@link Item} 拓展
   */
  type RenderItem = Item & {
    /** 存档 UID */
    uid: number;
    /** 是否完成 */
    isCompleted: boolean;
    /** 完成时间 */
    completedTime: string;
    /** 完成进度 */
    progress: number;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 成就触发条件
   * @since Beta v0.4.2
   */
  type Trigger = {
    /** 触发类型 */
    type: string;
    /** 触发任务 */
    task?: Array<TriggerTask>;
  };

  /**
   * 成就触发任务
   * @since Beta v0.9.1
   */
  type TriggerTask = {
    /** 任务ID */
    questId: number;
    /** 任务名称 */
    name: string;
    /** 任务类型 */
    type: string;
  };

  /**
   * 本应用的成就系列类型
   * @since Alpha v0.1.5
   */
  type Series = {
    /** 成就系列ID */
    id: number;
    /** 成就系列排序 */
    order: number;
    /** 成就系列名称 */
    name: string;
    /** 系列最新版本 */
    version: string;
    /** 名片 */
    card: string;
    /** 图标 */
    icon: string;
  };

  /**
   * 成就概况
   * @since Beta v0.9.1
   */
  type Overview = {
    /** 成就总数 */
    total: number;
    /** 完成数量 */
    fin: number;
  };
}
