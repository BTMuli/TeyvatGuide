/**
 * @file types/App/NameCard.d.ts
 * @description 本应用的名片类型定义
 * @since Beta v0.7.2
 */

declare namespace TGApp.App.NameCard {
  /**
   * @description 名片数据
   * @since Beta v0.7.2
   * @interface Item
   * @property {number} id 编号
   * @property {string} name 名称
   * @property {string} type 类型
   * @property {string} desc 描述
   * @property {string} source 来源
   * @return Item
   */
  type Item = { id: number; name: string; type: string; desc: string; source: string };
}
