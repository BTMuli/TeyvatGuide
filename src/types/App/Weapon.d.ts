/**
 * @file types/App/Weapon.d.ts
 * @description 本应用的武器类型定义文件
 * @since Beta v0.6.7
 */

declare namespace TGApp.App.Weapon {
  /**
   * @description Wiki页的武器简略信息
   * @since Beta v0.6.7
   * @interface WikiBriefInfo
   * @property {number} id - 武器 ID
   * @property {number} contentId - 观测枢 id
   * @property {string} name - 武器名称
   * @property {number} star - 武器星级
   * @property {string} weapon - 武器类型图标
   * @return WikiBriefInfo
   */
  interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    star: number;
    weapon: string;
  }

  /**
   * @description 转换后的武器数据
   * @since Beta v0.4.1
   * @interface WikiItem
   * @memberof TGApp.App.Weapon
   * @property {number} id 武器 id
   * @property {string} name 武器名称
   * @property {string} description 武器简介
   * @property {number} star 武器星级
   * @property {string} weapon 武器类型
   * @property {TGApp.App.Calendar.Material[]} materials 武器培养材料
   * @property {TGApp.Plugins.Hutao.Weapon.RhiAffix} affix 精炼描述
   * @property {string[]} story 武器故事
   * @return WikiItem
   */
  interface WikiItem {
    id: number;
    name: string;
    description: string;
    star: number;
    weapon: string;
    materials: TGApp.App.Calendar.Material[];
    affix?: TGApp.Plugins.Hutao.Weapon.RhiAffix;
    story: string[];
  }
}
