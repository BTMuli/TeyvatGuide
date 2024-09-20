/**
 * @file types/Sqlite/Achievement.d.ts
 * @description 数据库成就相关类型定义文件
 * @since Beta v0.6.0
 */

declare namespace TGApp.Sqlite.Achievement {
  /**
   * @description 数据库-成就表
   * @since Beta v0.6.0
   * @interface TableAchi
   * @property {number} id - 成就 ID
   * @property {number} uid - 存档 UID
   * @property {number} isCompleted - 成就是否完成 // 0:未完成,1:完成
   * @property {string} completedTime - 成就完成时间
   * @property {number} progress - 成就进度
   * @property {string} updated - 数据库更新时间
   * @return TableAchi
   */
  interface TableAchi {
    id: number;
    uid: number;
    isCompleted: 0 | 1;
    completedTime: string;
    progress: number;
    updated: string;
  }

  /**
   * @description 渲染用的成就数据
   * @since Beta v0.6.0
   * @interface RenderAchi
   * @property {number} id - 成就 ID
   * @property {number} uid - 存档 UID
   * @property {number} series - 成就对应系列 ID
   * @property {string} name - 成就名称
   * @property {string} version - 成就版本
   * @property {string} description - 成就描述
   * @property {number} reward - 成就奖励
   * @property {TGApp.App.Achievement.Trigger} trigger - 成就触发器
   * @property {boolean} isCompleted - 是否完成
   * @property {string} completedTime - 完成时间
   * @property {number} progress - 完成进度
   * @property {string} updated - 更新时间
   * @return RenderAchi
   */
  interface RenderAchi {
    id: number;
    uid: number;
    order: number;
    series: number;
    name: string;
    description: string;
    reward: number;
    version: string;
    trigger: TGApp.App.Achievement.Trigger;
    isCompleted: boolean;
    completedTime: string;
    progress: number;
    updated: string;
  }

  /**
   * @description 概况
   * @since Beta v0.6.0
   * @interface Overview
   * @property {number} total - 全部
   * @property {number} fin - 已完成
   * @returns Overview
   */
  interface Overview {
    total: number;
    fin: number;
  }
}
