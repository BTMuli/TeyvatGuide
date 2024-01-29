/**
 * @file types/App/Achievement.d.ts
 * @description 应用成就相关类型定义文件
 * @since Beta v0.4.2
 */

/**
 * @description 应用成就命名空间
 * @since Beta v0.4.2
 * @namespace Achievement
 * @memberof TGApp.App
 */
declare namespace TGApp.App.Achievement {
  /**
   * @description 本应用的成就类型
   * @since Beta v0.4.2
   * @interface Item
   * @property {number} id - 成就 ID
   * @property {number} series - 成就系列 ID
   * @property {number} order - 成就排列顺序，用于展示全部成就
   * @property {string} name - 成就名称
   * @property {string} description - 成就描述
   * @property {number} reward - 成就奖励
   * @property {string} version - 成就版本
   * @property {Trigger} trigger - 完成方式
   * @return Item
   */
  interface Item {
    id: number;
    series: number;
    order: number;
    name: string;
    description: string;
    reward: number;
    version: string;
    trigger: Trigger;
  }

  /**
   * @description 成就触发条件
   * @since Beta v0.4.2
   * @interface Trigger
   * @property {string} type 成就触发类型
   * @property {object} task 成就触发任务
   * @property {string} task.questId 成就触发任务所属任务编号
   * @property {string} task.name 成就触发任务名称
   * @property {string} task.type 成就触发任务类型
   * @return Trigger
   */
  interface Trigger {
    type: string;
    task?: Array<{
      questId: number;
      name: string;
      type: string;
    }>;
  }

  /**
   * @description 本应用的成就系列类型
   * @since Alpha v0.1.5
   * @interface Series
   * @property {number} id - 成就系列 ID
   * @property {number} order - 成就系列排列顺序，用于展示全部成就系列
   * @property {string} name - 成就系列名称
   * @property {string} version - 成就系列版本
   * @property {string} card - 成就系列对应名片
   * @property {string} icon - 成就系列图标
   * @return Series
   */
  interface Series {
    id: number;
    order: number;
    name: string;
    version: string;
    card: string;
    icon: string;
  }
}
