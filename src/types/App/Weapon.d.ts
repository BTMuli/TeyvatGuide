/**
 * @file types App Weapon.d.ts
 * @description 本应用的武器类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.App.Weapon {
  /**
   * @description Wiki页的武器简略信息
   * @since Alpha v0.1.5
   * @interface WikiBriefInfo
   * @property {number} id - 武器 ID
   * @property {number} contentId - 观测枢 id
   * @property {string} name - 武器名称
   * @property {number} star - 武器星级
   * @property {string} bg - 武器背景图
   * @property {string} weaponIcon - 武器类型图标
   * @property {string} icon - 武器图标
   * @return WikiBriefInfo
   */
  export interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    star: number;
    bg: string;
    weaponIcon: string;
    icon: string;
  }
}
