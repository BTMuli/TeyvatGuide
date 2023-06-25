/**
 * @file types App Achievement.d.ts
 * @description 应用成就相关类型定义文件
 * @todo https://github.com/BTMuli/Tauri.Genshin/issues/19
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.App.Achievement {
  /**
   * @description 本应用的成就类型
   * @since Alpha v0.1.5
   * @interface Item
   * @property {number} id - 成就 ID
   * @property {number} series - 成就系列 ID
   * @property {number} order - 成就排列顺序，用于展示全部成就
   * @property {string} name - 成就名称
   * @property {string} description - 成就描述
   * @property {number} reward - 成就奖励
   * @property {string} version - 成就版本
   * @return Item
   */
  export interface Item {
    id: number;
    series: number;
    order: number;
    name: string;
    description: string;
    reward: number;
    version: string;
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
  export interface Series {
    id: number;
    order: number;
    name: string;
    version: string;
    card: string;
    icon: string;
  }
}
