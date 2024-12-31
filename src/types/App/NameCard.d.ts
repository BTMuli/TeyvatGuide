/**
 * @file types/App/NameCard.d.ts
 * @description 本应用的名片类型定义
 * @since Beta v0.6.7
 */

declare namespace TGApp.App.NameCard {
  /**
   * @description 名片数据
   * @since Beta v0.6.7
   * @interface Item
   * @property {string} name - 名片名称
   * @property {number} index - 名片索引
   * @property {string} desc - 名片描述
   * @description 0: 其他，1: 成就，2：角色，3：纪行，4：活动
   * @property {number} type - 名片类型
   * @property {string} source - 名片来源
   * @return Item
   */
  type Item = { name: string; index: number; desc: string; type: number; source: string };
}
